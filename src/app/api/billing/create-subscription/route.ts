import { NextResponse } from "next/server";
import { z } from "zod";
import { getPlan, isGrowthBillingPeriod, type PlanKey } from "@/config/plans";
import { requireUser } from "@/lib/auth/roles";
import { createOrderForOwner } from "@/features/billing/server/service";

const schema = z.object({
  planKey: z.enum(["growth"]),
  billingPeriod: z.enum(["1m", "6m", "12m"]),
});

export async function POST(request: Request) {
  const user = await requireUser();
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          "Choose Growth and a billing period (1 month, 6 months, or 1 year). Starter is a free trial; Custom is contact sales only.",
      },
      { status: 400 },
    );
  }

  if (!isGrowthBillingPeriod(parsed.data.billingPeriod)) {
    return NextResponse.json(
      { error: "Choose a valid billing period." },
      { status: 400 },
    );
  }

  try {
    const order = await createOrderForOwner({
      ownerId: user.id,
      planKey: parsed.data.planKey as PlanKey,
      billingPeriod: parsed.data.billingPeriod,
      email: user.email,
    });

    return NextResponse.json({
      orderId: order.orderId,
      amount: order.amount,
      currency: order.currency,
      billingPeriod: order.billingPeriod,
      priceInr: order.priceInr,
      label: order.label,
      months: order.months,
      plan: getPlan(parsed.data.planKey),
      testMode: process.env.BILLING_MOCK_MODE === "true",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to create payment order.",
      },
      { status: 400 },
    );
  }
}
