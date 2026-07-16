import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/roles";
import { cancelOwnerSubscription } from "@/features/billing/server/service";

const schema = z.object({ cancelAtPeriodEnd: z.boolean() });

export async function POST(request: Request) {
  const user = await requireUser();
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Confirm how the subscription should be cancelled." }, { status: 400 });
  try {
    const subscription = await cancelOwnerSubscription(user.id, parsed.data.cancelAtPeriodEnd);
    return NextResponse.json({ ok: true, status: subscription.status, accessUntil: subscription.access_until });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Cancellation failed." }, { status: 400 });
  }
}
