import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/roles";
import { verifyCheckoutAndPersist } from "@/features/billing/server/service";

const schema = z.object({ planKey: z.enum(["growth"]), razorpay_payment_id: z.string().min(1), razorpay_subscription_id: z.string().min(1), razorpay_signature: z.string().min(1) });

export async function POST(request: Request) {
  const user = await requireUser();
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "The checkout response was incomplete." }, { status: 400 });
  try {
    const subscription = await verifyCheckoutAndPersist({ ownerId: user.id, planKey: parsed.data.planKey, paymentId: parsed.data.razorpay_payment_id, subscriptionId: parsed.data.razorpay_subscription_id, signature: parsed.data.razorpay_signature });
    return NextResponse.json({ ok: true, status: subscription.status });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Payment verification failed." }, { status: 400 });
  }
}
