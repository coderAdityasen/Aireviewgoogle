import "server-only";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlan, PLANS, type PlanKey } from "@/config/plans";
import { requireUser } from "@/lib/auth/roles";

export const PAID_SUBSCRIPTION_STATUSES = ["active", "authenticated", "charged", "resumed"] as const;
export type PaidSubscriptionStatus = (typeof PAID_SUBSCRIPTION_STATUSES)[number];

export type OwnerSubscription = {
  id: string;
  owner_id: string;
  provider: string;
  provider_subscription_id: string;
  plan_key: PlanKey;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  access_until: string | null;
  cancel_at_period_end: boolean;
  cancelled_at: string | null;
  last_provider_event_at: string | null;
};

export async function getOwnerSubscription(ownerId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.from("subscriptions").select("*").eq("owner_id", ownerId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return (data as OwnerSubscription | null) ?? null;
}

export async function hasPaidAccess(ownerId: string) {
  const subscription = await getOwnerSubscription(ownerId);
  if (subscription && PAID_SUBSCRIPTION_STATUSES.includes(subscription.status as PaidSubscriptionStatus)) {
    return !subscription.access_until || new Date(subscription.access_until).getTime() > Date.now();
  }

  const admin = createAdminClient();
  const { data: override } = await admin
    .from("entitlement_overrides")
    .select("expires_at")
    .eq("owner_id", ownerId)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .limit(1)
    .maybeSingle();
  return Boolean(override);
}

export async function getOwnerEntitlements(ownerId: string) {
  const subscription = await getOwnerSubscription(ownerId);
  const admin = createAdminClient();
  const override = (await admin.from("entitlement_overrides").select("plan_key, expires_at").eq("owner_id", ownerId).or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`).limit(1).maybeSingle()).data as { plan_key?: string; expires_at: string | null } | null;
  const plan = getPlan(subscription?.plan_key) ?? getPlan(override?.plan_key) ?? PLANS.starter;
  const periodStart = subscription?.current_period_start ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const periodEnd = subscription?.current_period_end ?? new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString();
  const [{ count: businessCount }, { count: qrCount }, { data: aiUsage }] = await Promise.all([
    admin.from("businesses").select("id", { count: "exact", head: true }).eq("owner_id", ownerId),
    admin.from("qr_campaigns").select("id, businesses!inner(owner_id)", { count: "exact", head: true }).eq("businesses.owner_id", ownerId),
    admin.from("subscription_usage").select("usage_count").eq("owner_id", ownerId).eq("metric", "ai_generation").eq("period_start", periodStart).maybeSingle()
  ]);
  return {
    paid: await hasPaidAccess(ownerId),
    plan,
    subscription,
    usage: { businesses: businessCount ?? 0, qrCampaigns: qrCount ?? 0, aiGenerations: (aiUsage as { usage_count?: number } | null)?.usage_count ?? 0 },
    periodStart,
    periodEnd
  };
}

export async function requirePaidOwner() {
  const user = await requireUser();
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (!profile || profile.account_status !== "active") redirectBilling("suspended=1");
  if (profile.role !== "admin" && !(await hasPaidAccess(user.id))) redirectBilling("required=1");
  return { user, profile, entitlements: await getOwnerEntitlements(user.id) };
}

export async function assertBusinessLimit(ownerId: string) {
  const entitlements = await getOwnerEntitlements(ownerId);
  if (!entitlements.paid) throw new Error("An active paid plan is required.");
  if (entitlements.usage.businesses >= entitlements.plan.businesses) throw new Error(`Your ${entitlements.plan.name} plan supports ${entitlements.plan.businesses} business location${entitlements.plan.businesses === 1 ? "" : "s"}.`);
}

export async function assertQrCampaignLimit(ownerId: string) {
  const entitlements = await getOwnerEntitlements(ownerId);
  if (!entitlements.paid) throw new Error("An active paid plan is required.");
  if (entitlements.usage.qrCampaigns >= entitlements.plan.qrCampaigns) throw new Error(`Your ${entitlements.plan.name} plan supports ${entitlements.plan.qrCampaigns} QR campaigns.`);
}

export async function assertAiUsageLimit(ownerId: string) {
  const entitlements = await getOwnerEntitlements(ownerId);
  if (!entitlements.paid) throw new Error("An active paid plan is required.");
  if (entitlements.usage.aiGenerations >= entitlements.plan.aiGenerations) throw new Error(`Your ${entitlements.plan.name} plan has reached its AI generation limit for this billing period.`);
  return entitlements;
}

export async function assertCsvExportAccess(ownerId: string) {
  const entitlements = await getOwnerEntitlements(ownerId);
  if (!entitlements.paid || entitlements.plan.key === "starter") throw new Error("CSV export is available on Growth and Pro plans.");
  return entitlements;
}

export async function recordUsage(ownerId: string, metric: "ai_generation" | "csv_export") {
  const entitlements = await getOwnerEntitlements(ownerId);
  const admin = createAdminClient();
  const { data: existing } = await admin.from("subscription_usage").select("id, usage_count").eq("owner_id", ownerId).eq("period_start", entitlements.periodStart).eq("metric", metric).maybeSingle();
  if (existing) {
    await admin.from("subscription_usage").update({ usage_count: existing.usage_count + 1 }).eq("id", existing.id);
  } else {
    await admin.from("subscription_usage").insert({ owner_id: ownerId, subscription_id: entitlements.subscription?.id ?? null, period_start: entitlements.periodStart, period_end: entitlements.periodEnd, metric, usage_count: 1 });
  }
}

function redirectBilling(query: string): never {
  redirect(`/billing?${query}`);
  throw new Error("Redirect did not complete.");
}
