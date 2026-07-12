import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordEvent } from "@/features/feedback/server/public";

const privateSchema = z.object({
  feedbackId: z.string().uuid(),
  finalEditedText: z.string().min(10).max(4000)
});

export async function POST(request: Request) {
  const parsed = privateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid private feedback request." }, { status: 400 });

  const admin = createAdminClient();
  const { data: feedback, error } = await admin
    .from("customer_feedback")
    .update({ final_edited_text: parsed.data.finalEditedText, submitted_privately: true })
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
