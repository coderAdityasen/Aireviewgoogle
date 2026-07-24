export type PlanKey = "starter" | "growth" | "pro";

/** Feature row for plan cards (tick = included, cross = not included). */
export type PlanFeature = {
  label: string;
  included: boolean;
};

export type PlanConfig = {
  key: PlanKey;
  name: string;
  tagline: string;
  /** Monthly price in INR. Starter is free trial (0). */
  priceInr: number;
  interval: "month" | "trial";
  /** Max business locations / stores. */
  businesses: number;
  /** Max QR campaigns (store QR setups). */
  qrCampaigns: number;
  /**
   * Max first-time AI review drafts (review requests) for the owner.
   * -1 = unlimited.
   */
  reviewRequests: number;
  /**
   * Max AI regenerations (re-roll button) for the owner.
   * -1 = unlimited. Starter: lifetime total of 3.
   */
  aiGenerations: number;
  /** How regeneration counts are stored. */
  aiLimitScope: "lifetime" | "period" | "unlimited";
  /** How review-request counts are stored. */
  reviewRequestScope: "lifetime" | "period" | "unlimited";
  /** Trial length in days (starter only). */
  trialDays: number | null;
  /** Private feedback inbox available. */
  privateFeedback: boolean;
  /** Max reviews shown in Reviews feed. null = unlimited. */
  reviewsLimit: number | null;
  /** Marketing / UI feature list with included or excluded. */
  features: PlanFeature[];
};

/** Sentinel for unlimited numeric limits in UI. */
export const UNLIMITED = -1;

export const PLANS: Record<PlanKey, PlanConfig> = {
  starter: {
    key: "starter",
    name: "Starter",
    tagline: "Free for 7 days — try ReviewFlow on one store.",
    priceInr: 0,
    interval: "trial",
    businesses: 1,
    qrCampaigns: 1,
    reviewRequests: 100,
    aiGenerations: 3,
    aiLimitScope: "lifetime",
    reviewRequestScope: "lifetime",
    trialDays: 7,
    privateFeedback: false,
    reviewsLimit: 10,
    features: [
      { label: "1 location", included: true },
      { label: "1 store", included: true },
      { label: "Unlimited QR scans", included: true },
      { label: "100 review requests", included: true },
      { label: "3 regenerations", included: true },
      { label: "7 days free", included: true },
      { label: "10 recent reviews", included: true },
      { label: "Future updates", included: false },
      { label: "Private reviews", included: false },
    ],
  },
  growth: {
    key: "growth",
    name: "Growth",
    tagline: "More room for a growing local team.",
    priceInr: 999,
    interval: "month",
    businesses: 3,
    qrCampaigns: 15,
    reviewRequests: UNLIMITED,
    aiGenerations: UNLIMITED,
    aiLimitScope: "unlimited",
    reviewRequestScope: "unlimited",
    trialDays: null,
    privateFeedback: true,
    reviewsLimit: null,
    features: [
      { label: "3 locations / stores", included: true },
      { label: "Unlimited QR scans", included: true },
      { label: "Unlimited review requests", included: true },
      { label: "Unlimited regenerations", included: true },
      { label: "Unlimited reviews feed", included: true },
      { label: "Private reviews", included: true },
      { label: "Future updates", included: true },
      { label: "CSV export", included: true },
    ],
  },
  pro: {
    key: "pro",
    name: "Pro",
    tagline: "A full review operation across locations.",
    priceInr: 1999,
    interval: "month",
    businesses: 10,
    qrCampaigns: 50,
    reviewRequests: UNLIMITED,
    aiGenerations: UNLIMITED,
    aiLimitScope: "unlimited",
    reviewRequestScope: "unlimited",
    trialDays: null,
    privateFeedback: true,
    reviewsLimit: null,
    features: [
      { label: "10 locations / stores", included: true },
      { label: "Unlimited QR scans", included: true },
      { label: "Unlimited review requests", included: true },
      { label: "Unlimited regenerations", included: true },
      { label: "Unlimited reviews feed", included: true },
      { label: "Private reviews", included: true },
      { label: "Future updates", included: true },
      { label: "Priority features", included: true },
    ],
  },
};

export function getPlan(key: string | null | undefined) {
  return key && key in PLANS ? PLANS[key as PlanKey] : null;
}

export function isUnlimited(limit: number) {
  return limit < 0;
}

export function formatLimit(limit: number) {
  return isUnlimited(limit) ? "Unlimited" : String(limit);
}

export function getRazorpayPlanId(key: PlanKey) {
  if (key === "starter") {
    throw new Error("Starter is a free trial plan and is not billed via Razorpay.");
  }
  const envKey = `RAZORPAY_PLAN_${key.toUpperCase()}_MONTHLY` as const;
  const value = process.env[envKey];
  if (!value) throw new Error(`${envKey} is missing.`);
  return value;
}
