import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getPlan,
  isUnlimited,
  PLANS,
  type PlanConfig,
  type PlanKey,
} from "@/config/plans";
import { getCurrentProfile, requireUser } from "@/lib/auth/roles";
import {
  BILLING_CACHE_REVALIDATE_SECONDS,
  ownerBillingTag,
  ownerEntitlementsTag,
  revalidateOwnerAccess,
} from "@/lib/billing/cache";

export const PAID_SUBSCRIPTION_STATUSES = [
  "active",
  "authenticated",
  "charged",
  "resumed",
] as const;
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

export type OwnerEntitlements = {
  paid: boolean;
  plan: PlanConfig;
  subscription: OwnerSubscription | null;
  usage: {
    businesses: number;
    qrCampaigns: number;
    /** Regeneration button uses (ai_generation metric). */
    aiGenerations: number;
    /** First-time AI draft creates / review requests (customer_feedback count). */
    reviewRequests: number;
  };
  periodStart: string;
  periodEnd: string;
  trialEndsAt: string | null;
  trialActive: boolean;
  trialExpired: boolean;
  privateFeedback: boolean;
  reviewsLimit: number | null;
  /** AI GMB / Google Business Profile suggestions (Growth & Custom). */
  gmbSuggestions: boolean;
  /** null = unlimited */
  aiRemaining: number | null;
  /** null = unlimited */
  reviewRequestsRemaining: number | null;
};

const SUBSCRIPTION_COLUMNS =
  "id, owner_id, provider, provider_subscription_id, plan_key, status, current_period_start, current_period_end, access_until, cancel_at_period_end, cancelled_at, last_provider_event_at";

const LIFETIME_PERIOD_START = "1970-01-01T00:00:00.000Z";
const LIFETIME_PERIOD_END = "2099-12-31T00:00:00.000Z";

async function fetchOwnerSubscription(ownerId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("subscriptions")
    .select(SUBSCRIPTION_COLUMNS)
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as OwnerSubscription | null) ?? null;
}

/** Per-request dedupe + short cross-request cache (billing status). */
export const getOwnerSubscription = cache(async (ownerId: string) => {
  return unstable_cache(
    () => fetchOwnerSubscription(ownerId),
    [`owner-subscription-${ownerId}`],
    {
      revalidate: BILLING_CACHE_REVALIDATE_SECONDS,
      tags: [ownerBillingTag(ownerId)],
    },
  )();
});

async function fetchProfileTrial(ownerId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("trial_ends_at")
    .eq("id", ownerId)
    .maybeSingle();
  if (error) throw error;
  const trialEndsAt =
    (data as { trial_ends_at?: string | null } | null)?.trial_ends_at ?? null;
  const trialActive = Boolean(
    trialEndsAt && new Date(trialEndsAt).getTime() > Date.now(),
  );
  const trialExpired = Boolean(
    trialEndsAt && new Date(trialEndsAt).getTime() <= Date.now(),
  );
  return { trialEndsAt, trialActive, trialExpired };
}

async function getProfileTrial(ownerId: string) {
  return unstable_cache(
    () => fetchProfileTrial(ownerId),
    [`owner-trial-${ownerId}`],
    {
      revalidate: BILLING_CACHE_REVALIDATE_SECONDS,
      tags: [ownerBillingTag(ownerId)],
    },
  )();
}

function subscriptionIsActive(subscription: OwnerSubscription | null) {
  if (!subscription) return false;
  if (
    !PAID_SUBSCRIPTION_STATUSES.includes(
      subscription.status as PaidSubscriptionStatus,
    )
  ) {
    return false;
  }
  return (
    !subscription.access_until ||
    new Date(subscription.access_until).getTime() > Date.now()
  );
}

/** True when owner may use product (paid sub, override, or active starter trial). */
export const hasPaidAccess = cache(async (ownerId: string) => {
  const subscription = await getOwnerSubscription(ownerId);
  if (subscriptionIsActive(subscription)) return true;

  const admin = createAdminClient();
  const { data: override, error } = await admin
    .from("entitlement_overrides")
    .select("expires_at")
    .eq("owner_id", ownerId)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (override) return true;

  const { trialActive } = await getProfileTrial(ownerId);
  return trialActive;
});

/** Regeneration usage (subscription_usage metric ai_generation). */
async function getRegenerationUsageCount(
  ownerId: string,
  plan: PlanConfig,
  periodStart: string,
) {
  const admin = createAdminClient();
  if (plan.aiLimitScope === "unlimited") return 0;

  if (plan.aiLimitScope === "lifetime") {
    const { data, error } = await admin
      .from("subscription_usage")
      .select("usage_count")
      .eq("owner_id", ownerId)
      .eq("metric", "ai_generation");
    if (error) throw error;
    return (data ?? []).reduce(
      (sum, row) => sum + ((row as { usage_count?: number }).usage_count ?? 0),
      0,
    );
  }

  const { data, error } = await admin
    .from("subscription_usage")
    .select("usage_count")
    .eq("owner_id", ownerId)
    .eq("metric", "ai_generation")
    .eq("period_start", periodStart)
    .maybeSingle();
  if (error) throw error;
  return (data as { usage_count?: number } | null)?.usage_count ?? 0;
}

/**
 * Review requests = number of customer_feedback rows for the owner.
 * Each Generate / Regenerate creates a draft row, so this tracks total AI drafts.
 * Starter allows 100.
 */
async function getReviewRequestCount(ownerId: string) {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("customer_feedback")
    .select("id, businesses!inner(owner_id)", { count: "exact", head: true })
    .eq("businesses.owner_id", ownerId);
  if (error) throw error;
  return count ?? 0;
}

async function loadOwnerEntitlements(
  ownerId: string,
): Promise<OwnerEntitlements> {
  const subscription = await getOwnerSubscription(ownerId);
  const admin = createAdminClient();
  const [
    { trialEndsAt, trialActive, trialExpired },
    overrideResult,
    businessResult,
    qrResult,
  ] = await Promise.all([
    getProfileTrial(ownerId),
    admin
      .from("entitlement_overrides")
      .select("plan_key, expires_at")
      .eq("owner_id", ownerId)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .limit(1)
      .maybeSingle(),
    admin
      .from("businesses")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", ownerId),
    admin
      .from("qr_campaigns")
      .select("id, businesses!inner(owner_id)", {
        count: "exact",
        head: true,
      })
      .eq("businesses.owner_id", ownerId),
  ]);

  if (overrideResult.error) throw overrideResult.error;
  if (businessResult.error) throw businessResult.error;
  if (qrResult.error) throw qrResult.error;

  const override = overrideResult.data as {
    plan_key?: string;
    expires_at: string | null;
  } | null;

  const subscriptionPaid = subscriptionIsActive(subscription);
  const overridePaid = Boolean(override);

  // Once a paid plan (or admin override) is active, trial must not override
  // access dates / plan UI — even if trial_ends_at is still in the future.
  const trialStillOpen = trialActive;
  const onTrialOnly = trialStillOpen && !subscriptionPaid && !overridePaid;

  let plan: PlanConfig;
  if (subscriptionPaid && subscription?.plan_key) {
    plan = getPlan(subscription.plan_key) ?? PLANS.starter;
  } else if (overridePaid && override?.plan_key) {
    plan = getPlan(override.plan_key) ?? PLANS.starter;
  } else if (onTrialOnly) {
    plan = PLANS.starter;
  } else {
    plan = PLANS.starter;
  }

  const paid = subscriptionPaid || overridePaid || onTrialOnly;

  const periodStart =
    subscriptionPaid && subscription?.current_period_start
      ? subscription.current_period_start
      : (subscription?.current_period_start ??
        (trialEndsAt
          ? new Date(
              new Date(trialEndsAt).getTime() - 7 * 24 * 60 * 60 * 1000,
            ).toISOString()
          : new Date(
              new Date().getFullYear(),
              new Date().getMonth(),
              1,
            ).toISOString()));
  const periodEnd =
    subscriptionPaid &&
    (subscription?.current_period_end || subscription?.access_until)
      ? (subscription.current_period_end ?? subscription.access_until!)
      : (subscription?.current_period_end ??
        trialEndsAt ??
        new Date(
          new Date().getFullYear(),
          new Date().getMonth() + 1,
          1,
        ).toISOString());

  const [aiGenerations, reviewRequests] = await Promise.all([
    getRegenerationUsageCount(ownerId, plan, periodStart),
    getReviewRequestCount(ownerId),
  ]);

  const aiRemaining = isUnlimited(plan.aiGenerations)
    ? null
    : Math.max(0, plan.aiGenerations - aiGenerations);
  const reviewRequestsRemaining = isUnlimited(plan.reviewRequests)
    ? null
    : Math.max(0, plan.reviewRequests - reviewRequests);

  return {
    paid,
    plan,
    subscription,
    usage: {
      businesses: businessResult.count ?? 0,
      qrCampaigns: qrResult.count ?? 0,
      aiGenerations,
      reviewRequests,
    },
    periodStart,
    periodEnd,
    trialEndsAt,
    trialActive: onTrialOnly,
    trialExpired: trialExpired && !subscriptionPaid && !overridePaid,
    privateFeedback: plan.privateFeedback,
    reviewsLimit: plan.reviewsLimit,
    gmbSuggestions: Boolean(plan.gmbSuggestions),
    aiRemaining,
    reviewRequestsRemaining,
  };
}

/** Per-request dedupe + ~45s cross-request cache for snappier navigations. */
export const getOwnerEntitlements = cache(
  async (ownerId: string): Promise<OwnerEntitlements> => {
    return unstable_cache(
      () => loadOwnerEntitlements(ownerId),
      [`owner-entitlements-${ownerId}`],
      {
        revalidate: BILLING_CACHE_REVALIDATE_SECONDS,
        tags: [ownerEntitlementsTag(ownerId), ownerBillingTag(ownerId)],
      },
    )();
  },
);

/**
 * Gate dashboard access. Reuses React cache + short-lived entitlements cache.
 * Profile comes from getCurrentProfile when possible to avoid an extra admin round-trip.
 */
export const requirePaidOwner = cache(async () => {
  const user = await requireUser();
  let profile = await getCurrentProfile();

  if (!profile || profile.account_status !== "active") {
    // Fallback admin read if profile row missing from user-scoped client
    const admin = createAdminClient();
    const { data } = await admin
      .from("profiles")
      .select("id, full_name, role, account_status, trial_ends_at, created_at, updated_at")
      .eq("id", user.id)
      .maybeSingle();
    profile = data as typeof profile;
  }

  if (!profile || profile.account_status !== "active") {
    redirectBilling("suspended=1");
  }

  const entitlements = await getOwnerEntitlements(user.id);
  if (profile.role !== "admin" && !entitlements.paid) {
    if (entitlements.trialExpired) redirectBilling("trial=expired");
    redirectBilling("required=1");
  }
  return { user, profile, entitlements };
});

/** Bust short-lived caches after usage that affects meters (AI, etc.). */
export function bustOwnerEntitlementsCache(ownerId: string) {
  revalidateOwnerAccess(ownerId);
}

export async function assertBusinessLimit(ownerId: string) {
  const entitlements = await getOwnerEntitlements(ownerId);
  if (!entitlements.paid) throw new Error("An active plan is required.");
  // Multi-location create is Growth/Custom only (first location uses onboarding).
  if (
    entitlements.usage.businesses >= 1 &&
    entitlements.plan.key === "starter"
  ) {
    throw new Error(
      "Starter includes 1 location. Upgrade to Growth or contact us for Custom to add more stores.",
    );
  }
  if (entitlements.usage.businesses >= entitlements.plan.businesses) {
    throw new Error(
      `Your ${entitlements.plan.name} plan supports ${entitlements.plan.businesses} location/store${entitlements.plan.businesses === 1 ? "" : "s"}. Upgrade to Growth or contact us for Custom to add more.`,
    );
  }
}

export async function assertQrCampaignLimit(ownerId: string) {
  const entitlements = await getOwnerEntitlements(ownerId);
  if (!entitlements.paid) throw new Error("An active plan is required.");
  if (entitlements.usage.qrCampaigns >= entitlements.plan.qrCampaigns) {
    throw new Error(
      `Your ${entitlements.plan.name} plan supports ${entitlements.plan.qrCampaigns} QR campaign${entitlements.plan.qrCampaigns === 1 ? "" : "s"}. Upgrade to Growth or contact us for Custom for more.`,
    );
  }
}

/** First Generate review — counts as a review request (Starter: 100). */
export async function assertReviewRequestLimit(ownerId: string) {
  const entitlements = await getOwnerEntitlements(ownerId);
  if (!entitlements.paid) {
    throw new Error(
      "This business is not on an active plan. Review generation is unavailable.",
    );
  }
  if (isUnlimited(entitlements.plan.reviewRequests)) return entitlements;
  if (entitlements.usage.reviewRequests >= entitlements.plan.reviewRequests) {
    throw new Error(
      entitlements.plan.key === "starter"
        ? "Starter includes 100 review requests. Upgrade to Growth or contact us for Custom for unlimited review requests."
        : `Your ${entitlements.plan.name} plan has reached its review request limit.`,
    );
  }
  return entitlements;
}

/** Regenerate button — counts as a regeneration (Starter: 3 lifetime). */
export async function assertAiUsageLimit(ownerId: string) {
  const entitlements = await getOwnerEntitlements(ownerId);
  if (!entitlements.paid) {
    throw new Error(
      "This business is not on an active plan. AI review generation is unavailable.",
    );
  }
  if (isUnlimited(entitlements.plan.aiGenerations)) return entitlements;
  if (entitlements.usage.aiGenerations >= entitlements.plan.aiGenerations) {
    throw new Error(
      entitlements.plan.key === "starter"
        ? "Starter includes 3 regenerations total. Upgrade to Growth or contact us for Custom for unlimited regenerations."
        : `Your ${entitlements.plan.name} plan has reached its regeneration limit.`,
    );
  }
  return entitlements;
}

export async function assertCsvExportAccess(ownerId: string) {
  const entitlements = await getOwnerEntitlements(ownerId);
  if (!entitlements.paid || entitlements.plan.key === "starter") {
    throw new Error("CSV export is available on Growth and Custom plans.");
  }
  return entitlements;
}

export async function assertPrivateFeedbackAccess(ownerId: string) {
  const entitlements = await getOwnerEntitlements(ownerId);
  if (!entitlements.paid || !entitlements.privateFeedback) {
    throw new Error(
      "Private feedback is available on Growth and Custom plans. Upgrade to unlock the inbox.",
    );
  }
  return entitlements;
}

export async function assertGmbSuggestionsAccess(ownerId: string) {
  const entitlements = await getOwnerEntitlements(ownerId);
  if (!entitlements.paid || !entitlements.gmbSuggestions) {
    throw new Error(
      "GMB profile suggestions are available on Growth and Custom plans. Upgrade to unlock AI profile tips.",
    );
  }
  return entitlements;
}

export async function recordUsage(
  ownerId: string,
  metric: "ai_generation" | "csv_export",
) {
  const entitlements = await getOwnerEntitlements(ownerId);
  const admin = createAdminClient();

  const useLifetime =
    metric === "ai_generation" && entitlements.plan.aiLimitScope === "lifetime";
  const periodStart = useLifetime
    ? LIFETIME_PERIOD_START
    : entitlements.periodStart;
  const periodEnd = useLifetime ? LIFETIME_PERIOD_END : entitlements.periodEnd;

  const { data: existing, error: existingError } = await admin
    .from("subscription_usage")
    .select("id, usage_count")
    .eq("owner_id", ownerId)
    .eq("period_start", periodStart)
    .eq("metric", metric)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) {
    const { error } = await admin
      .from("subscription_usage")
      .update({ usage_count: existing.usage_count + 1 })
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await admin.from("subscription_usage").insert({
      owner_id: ownerId,
      subscription_id: entitlements.subscription?.id ?? null,
      period_start: periodStart,
      period_end: periodEnd,
      metric,
      usage_count: 1,
    });
    if (error) throw error;
  }
  bustOwnerEntitlementsCache(ownerId);
}

function redirectBilling(query: string): never {
  redirect(`/billing?${query}`);
  throw new Error("Redirect did not complete.");
}
