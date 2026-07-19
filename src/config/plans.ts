export type PlanKey = "starter" | "growth" | "pro";

export type PlanConfig = {
  key: PlanKey;
  name: string;
  tagline: string;
  priceInr: number;
  interval: "month";
  businesses: number;
  qrCampaigns: number;
  aiGenerations: number;
  features: string[];
};

export const PLANS: Record<PlanKey, PlanConfig> = {
  starter: {
    key: "starter",
    name: "Starter",
    tagline: "A focused setup for one location.",
    priceInr: 499,
    interval: "month",
    businesses: 1,
    qrCampaigns: 3,
    aiGenerations: 100,
    features: ["Basic analytics", "PNG and SVG QR downloads"]
  },
  growth: {
    key: "growth",
    name: "Growth",
    tagline: "More room for a growing local team.",
    priceInr: 999,
    interval: "month",
    businesses: 3,
    qrCampaigns: 15,
    aiGenerations: 1000,
    features: ["Advanced analytics", "Multiple languages", "CSV export"]
  },
  pro: {
    key: "pro",
    name: "Pro",
    tagline: "A full review operation across locations.",
    priceInr: 1999,
    interval: "month",
    businesses: 10,
    qrCampaigns: 50,
    aiGenerations: 5000,
    features: ["White-label QR posters", "CRM webhook configuration", "Priority features"]
  }
};

export function getPlan(key: string | null | undefined) {
  return key && key in PLANS ? PLANS[key as PlanKey] : null;
}

export function getRazorpayPlanId(key: PlanKey) {
  const envKey = `RAZORPAY_PLAN_${key.toUpperCase()}_MONTHLY` as const;
  const value = process.env[envKey];
  if (!value) throw new Error(`${envKey} is missing.`);
  return value;
}
