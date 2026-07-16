import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getBillingProvider } from "@/lib/billing/provider";
import { processRazorpayWebhook, type RazorpayWebhookPayload } from "@/features/billing/server/service";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  const eventId = request.headers.get("x-razorpay-event-id") ?? crypto.createHash("sha256").update(rawBody).digest("hex");
  if (!signature || !getBillingProvider().verifyWebhookSignature(rawBody, signature)) return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  try {
    const payload = JSON.parse(rawBody) as RazorpayWebhookPayload & { event?: string };
    const eventType = request.headers.get("x-razorpay-event") ?? payload.event ?? "";
    const result = await processRazorpayWebhook({ eventId, eventType, rawBody, payload });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Webhook processing failed." }, { status: 500 });
  }
}
