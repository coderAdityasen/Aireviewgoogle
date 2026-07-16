import type { SubscriptionStatus } from "@/types/database";

export function mapProviderStatus(status: string): SubscriptionStatus {
  const normalized = status.toLowerCase();
  if (normalized === "active") return "active";
  if (normalized === "authenticated") return "authenticated";
  if (normalized === "charged") return "charged";
  if (normalized === "pending") return "pending";
  if (normalized === "halted") return "halted";
  if (normalized === "paused") return "paused";
  if (normalized === "resumed") return "resumed";
  if (normalized === "cancelled") return "cancelled";
  if (normalized === "completed") return "completed";
  if (normalized === "updated") return "updated";
  return "created";
}
