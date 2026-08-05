import "server-only";

import { revalidateTag } from "next/cache";

/** Short TTL used for cross-request caches (seconds). */
export const BILLING_CACHE_REVALIDATE_SECONDS = 45;

export function ownerBillingTag(ownerId: string) {
  return `owner-billing-${ownerId}`;
}

export function ownerNavTag(ownerId: string) {
  return `owner-nav-${ownerId}`;
}

export function ownerEntitlementsTag(ownerId: string) {
  return `owner-entitlements-${ownerId}`;
}

/** Call after payment, cancel, or plan-affecting admin changes. */
export function revalidateOwnerAccess(ownerId: string) {
  // Next 16+: second arg profile — "max" busts the tag immediately
  revalidateTag(ownerBillingTag(ownerId), "max");
  revalidateTag(ownerNavTag(ownerId), "max");
  revalidateTag(ownerEntitlementsTag(ownerId), "max");
}
