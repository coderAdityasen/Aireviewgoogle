import { NextResponse } from "next/server";
import { z } from "zod";
import { getPlan, type PlanKey } from "@/config/plans";
import { requireUser } from "@/lib/auth/roles";
import { createSubscriptionForOwner } from "@/features/billing/server/service";

const schema = z.object({ planKey: z.enum(["growth", "pro"]) });

export async function POST(request: Request) {
  const user = await requireUser();
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Choose Growth or Pro. Starter is a free 7-day trial only." },
      { status: 400 },
    );
  }
  const subscription = await createSubscriptionForOwner({
    ownerId: user.id,
    planKey: parsed.data.planKey as PlanKey,
    email: user.email,
  });
  return NextResponse.json({
    subscriptionId: subscription.provider_subscription_id,
    plan: getPlan(parsed.data.planKey),
    testMode: process.env.BILLING_MOCK_MODE === "true",
  });
}
