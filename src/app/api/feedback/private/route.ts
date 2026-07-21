import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordEvent } from "@/features/feedback/server/public";

const privateSchema = z.object({
  feedbackId: z.string().uuid(),
  finalEditedText: z.string().min(10).max(4000),
  customerName: z.string().max(120).optional(),
  customerEmail: z.string().email().optional(),
  customerPhone: z.string().max(40).optional()
});

export async function POST(request: Request) {
  const parsed = privateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid private feedback request." }, { status: 400 });

  const admin = createAdminClient();

  // Ensure the feedback row exists before marking it private.
  const { data: existing, error: existingError } = await admin
    .from("customer_feedback")
    .select("id, business_id, original_notes")
    .eq("id", parsed.data.feedbackId)
    .maybeSingle();
  if (existingError) throw existingError;
  if (!existing) {
    return NextResponse.json(
      { error: "Feedback session was not found. Generate a review again, then submit." },
      { status: 404 },
    );
  }

  const { data: feedback, error } = await admin
    .from("customer_feedback")
    .update({
      final_edited_text: parsed.data.finalEditedText,
      // Keep a plain-text copy so owner inboxes that read original_notes still work.
      original_notes: existing.original_notes?.trim()
        ? existing.original_notes
        : parsed.data.finalEditedText,
      submitted_privately: true,
      customer_name: parsed.data.customerName ?? null,
      customer_email: parsed.data.customerEmail ?? null,
      customer_phone: parsed.data.customerPhone ?? null,
      resolution_status: "new",
    })
    .eq("id", parsed.data.feedbackId)
    .select("business_id, qr_campaign_id, visitor_session_id")
    .single();
  if (error) throw error;

  await recordEvent({
    businessId: feedback.business_id,
    campaignId: feedback.qr_campaign_id,
    visitorSessionId: feedback.visitor_session_id,
    eventType: "private_feedback_submitted"
  });

  return NextResponse.json({ ok: true });
}
