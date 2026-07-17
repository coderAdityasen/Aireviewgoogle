import "server-only";

import { cache } from "react";
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

const SUBSCRIPTION_COLUMNS = "id, owner_id, provider, provider_subscription_id, plan_key, status, current_period_start, current_period_end, access_until, cancel_at_period_end, cancelled_at, last_provider_event_at";

export const getOwnerSubscription = cache(async (ownerId: string) => {
  const admin = createAdminClient();
  const { data, error } = await admin.from("subscriptions").select(SUBSCRIPTION_COLUMNS).eq("owner_id", ownerId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return (data as OwnerSubscription | null) ?? null;
});

export const hasPaidAccess = cache(async (ownerId: string) => {
  const subscription = await getOwnerSubscription(ownerId);
  if (subscription && PAID_SUBSCRIPTION_STATUSES.includes(subscription.status as PaidSubscriptionStatus)) {
    return !subscription.access_until || new Date(subscription.access_until).getTime() > Date.now();
  }

  const admin = createAdminClient();
  const { data: override, error } = await admin
    .from("entitlement_overrides")
    .select("expires_at")
    .eq("owner_id", ownerId)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return Boolean(override);
});

export const getOwnerEntitlements = cache(async (ownerId: string) => {
  const subscription = await getOwnerSubscription(ownerId);
  const admin = createAdminClient();
  const [overrideResult, businessResult, qrResult, aiUsageResult] = await Promise.all([
    admin.from("entitlement_overrides").select("plan_key, expires_at").eq("owner_id", ownerId).or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`).limit(1).maybeSingle(),
    admin.from("businesses").select("id", { count: "exact", head: true }).eq("owner_id", ownerId),
    admin.from("qr_campaigns").select("id, businesses!inner(owner_id)", { count: "exact", head: true }).eq("businesses.owner_id", ownerId),
    admin.from("subscription_usage").select("usage_count").eq("owner_id", ownerId).eq("metric", "ai_generation").eq("period_start", subscription?.current_period_start ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()).maybeSingle()
  ]);
  if (overrideResult.error) throw overrideResult.error;
  if (businessResult.error) throw businessResult.error;
  if (qrResult.error) throw qrResult.error;
  if (aiUsageResult.error) throw aiUsageResult.error;

  const { data: overrideData } = overrideResult;
  const { count: businessCount } = businessResult;
  const { count: qrCount } = qrResult;
  const { data: aiUsage } = aiUsageResult;
  const override = overrideData as { plan_key?: string; expires_at: string | null } | null;
  const plan = getPlan(subscription?.plan_key) ?? getPlan(override?.plan_key) ?? PLANS.starter;
  const periodStart = subscription?.current_period_start ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const periodEnd = subscription?.current_period_end ?? new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString();
  const subscriptionPaid = Boolean(subscription && PAID_SUBSCRIPTION_STATUSES.includes(subscription.status as PaidSubscriptionStatus) && (!subscription.access_until || new Date(subscription.access_until).getTime() > Date.now()));
  const overridePaid = Boolean(override);
  return {
    paid: subscriptionPaid || overridePaid,
    plan,
    subscription,
    usage: { businesses: businessCount ?? 0, qrCampaigns: qrCount ?? 0, aiGenerations: (aiUsage as { usage_count?: number } | null)?.usage_count ?? 0 },
    periodStart,
    periodEnd
  };
});

export const requirePaidOwner = cache(async () => {
  const user = await requireUser();
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("id, full_name, role, account_status").eq("id", user.id).maybeSingle();
  if (!profile || profile.account_status !== "active") redirectBilling("suspended=1");
  const entitlements = await getOwnerEntitlements(user.id);
  if (profile.role !== "admin" && !entitlements.paid) redirectBilling("required=1");
  return { user, profile, entitlements };
});

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
  const { data: existing, error: existingError } = await admin.from("subscription_usage").select("id, usage_count").eq("owner_id", ownerId).eq("period_start", entitlements.periodStart).eq("metric", metric).maybeSingle();
  if (existingError) throw existingError;
  if (existing) {
    const { error } = await admin.from("subscription_usage").update({ usage_count: existing.usage_count + 1 }).eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await admin.from("subscription_usage").insert({ owner_id: ownerId, subscription_id: entitlements.subscription?.id ?? null, period_start: entitlements.periodStart, period_end: entitlements.periodEnd, metric, usage_count: 1 });
    if (error) throw error;
  }
}

function redirectBilling(query: string): never {
  redirect(`/billing?${query}`);
  throw new Error("Redirect did not complete.");
}
