export type PlanKey = "starter" | "growth" | "custom";

/** Feature row for plan cards (tick = included, cross = not included). */
export type PlanFeature = {
  label: string;
  included: boolean;
};

export type PlanConfig = {
  key: PlanKey;
  name: string;
  tagline: string;
  /** Monthly price in INR. Starter trial and Custom sales plans use 0. */
  priceInr: number;
  interval: "month" | "trial" | "custom";
  /**
   * When true, card shows Contact us (no Razorpay checkout).
   * Limits below apply only after admin grants a custom entitlement.
   */
  contactSales: boolean;
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
  /** AI Google Business Profile (GMB) improvement suggestions. Growth/Custom only. */
  gmbSuggestions: boolean;
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
    contactSales: false,
    businesses: 1,
    qrCampaigns: 1,
    reviewRequests: 100,
    aiGenerations: 3,
    aiLimitScope: "lifetime",
    reviewRequestScope: "lifetime",
    trialDays: 7,
    privateFeedback: false,
    reviewsLimit: 10,
    gmbSuggestions: false,
    features: [
      { label: "1 location", included: true },
      { label: "1 store", included: true },
      { label: "Unlimited QR scans", included: true },
      { label: "100 review requests", included: true },
      { label: "3 regenerations", included: true },
      { label: "7 days free", included: true },
      { label: "10 recent reviews", included: true },
      { label: "GMB profile suggestions", included: false },
      { label: "Future updates", included: false },
      { label: "Private reviews", included: false },
    ],
  },
  growth: {
    key: "growth",
    name: "Growth",
    tagline: "More room for a growing local team.",
    priceInr: 499,
    interval: "month",
    contactSales: false,
    businesses: 3,
    qrCampaigns: 15,
    reviewRequests: UNLIMITED,
    aiGenerations: UNLIMITED,
    aiLimitScope: "unlimited",
    reviewRequestScope: "unlimited",
    trialDays: null,
    privateFeedback: true,
    reviewsLimit: null,
    gmbSuggestions: true,
    features: [
      { label: "3 locations / stores", included: true },
      { label: "Unlimited QR scans", included: true },
      { label: "Unlimited review requests", included: true },
      { label: "Unlimited regenerations", included: true },
      { label: "Unlimited reviews feed", included: true },
      { label: "Private reviews", included: true },
      { label: "GMB profile suggestions", included: true },
      { label: "Future updates", included: true },
      { label: "CSV export", included: true },
    ],
  },
  custom: {
    key: "custom",
    name: "Custom",
    tagline: "For multi-location brands that need tailored limits and support.",
    priceInr: 0,
    interval: "custom",
    contactSales: true,
    businesses: 50,
    qrCampaigns: 200,
    reviewRequests: UNLIMITED,
    aiGenerations: UNLIMITED,
    aiLimitScope: "unlimited",
    reviewRequestScope: "unlimited",
    trialDays: null,
    privateFeedback: true,
    reviewsLimit: null,
    gmbSuggestions: true,
    features: [
      { label: "Everything in Growth", included: true },
      { label: "Flexible location volume", included: true },
      { label: "Dedicated onboarding", included: true },
      { label: "Priority support", included: true },
      { label: "Custom SLA & invoicing", included: true },
      { label: "Tailored feature rollout", included: true },
    ],
  },
};

export function getPlan(key: string | null | undefined) {
  if (!key) return null;
  // Legacy "pro" rows map to Custom
  if (key === "pro") return PLANS.custom;
  return key in PLANS ? PLANS[key as PlanKey] : null;
}

export function isUnlimited(limit: number) {
  return limit < 0;
}

export function formatLimit(limit: number) {
  return isUnlimited(limit) ? "Unlimited" : String(limit);
}

export function isBillablePlan(key: PlanKey) {
  return key === "growth";
}

export function getRazorpayPlanId(key: PlanKey) {
  if (key === "starter") {
    throw new Error("Starter is a free trial plan and is not billed via Razorpay.");
  }
  if (key === "custom") {
    throw new Error("Custom plan is contact-sales only and is not billed via Razorpay.");
  }
  const envKey = `RAZORPAY_PLAN_${key.toUpperCase()}_MONTHLY` as const;
  const value = process.env[envKey];
  if (!value) throw new Error(`${envKey} is missing.`);
  return value;
}
