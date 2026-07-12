import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordEvent } from "@/features/feedback/server/public";
import { parseStoredReviewOptions } from "@/features/ai/server/prompt";

const copySchema = z.object({
  feedbackId: z.string().uuid(),
  finalEditedText: z.string().min(10).max(4000)
});

export async function POST(request: Request) {
  const parsed = copySchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid copy event." }, { status: 400 });

  const admin = createAdminClient();
  const { data: feedback, error } = await admin
    .from("customer_feedback")
    .update({ final_edited_text: parsed.data.finalEditedText })
    .eq("id", parsed.data.feedbackId)
    .select("business_id, qr_campaign_id, visitor_session_id, generated_draft")
    .single();
  if (error) throw error;

  const generatedOptions = parseStoredReviewOptions(feedback.generated_draft);
  const copiedGeneratedOption = generatedOptions.some((option) => sameReviewText(option, parsed.data.finalEditedText));

  if (!copiedGeneratedOption) {
    await recordEvent({
      businessId: feedback.business_id,
      campaignId: feedback.qr_campaign_id,
      visitorSessionId: feedback.visitor_session_id,
      eventType: "review_edited"
    });
  }

  await recordEvent({
    businessId: feedback.business_id,
    campaignId: feedback.qr_campaign_id,
    visitorSessionId: feedback.visitor_session_id,
    eventType: "review_copied"
  });

  return NextResponse.json({ ok: true });
}

function sameReviewText(left: string, right: string) {
  return left.trim().replace(/\s+/g, " ") === right.trim().replace(/\s+/g, " ");
}
