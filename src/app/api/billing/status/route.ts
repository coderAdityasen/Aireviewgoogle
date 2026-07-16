import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/roles";
import { getOwnerEntitlements } from "@/lib/billing/entitlements";

export async function GET() {
  const user = await requireUser();
  const entitlements = await getOwnerEntitlements(user.id);
  return NextResponse.json({ paid: entitlements.paid, plan: entitlements.plan.key, status: entitlements.subscription?.status ?? "unpaid", accessUntil: entitlements.subscription?.access_until ?? null });
}
