import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordEvent } from "@/features/feedback/server/public";
import { normalizeGoogleReviewUrl } from "@/lib/security/google-url";

const redirectSchema = z.object({
  feedbackId: z.string().uuid(),
});

export async function POST(request: Request) {
  const parsed = redirectSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid redirect event." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: feedback, error } = await admin
    .from("customer_feedback")
    .select(
      "business_id, qr_campaign_id, visitor_session_id, final_edited_text, businesses(google_review_url)",
    )
    .eq("id", parsed.data.feedbackId)
    .single();
  if (error) throw error;

  const googleUrl = Array.isArray(feedback.businesses)
    ? feedback.businesses[0]?.google_review_url
    : feedback.businesses?.google_review_url;
  const normalized = normalizeGoogleReviewUrl(googleUrl ?? "");

  // Mark this draft for the Reviews feed (only copy & continue to Google).
  const { error: markError } = await admin
    .from("customer_feedback")
    .update({
      continued_to_google: true,
      submitted_privately: false,
    })
    .eq("id", parsed.data.feedbackId);
  if (markError) throw markError;

  await recordEvent({
    businessId: feedback.business_id,
    campaignId: feedback.qr_campaign_id,
    visitorSessionId: feedback.visitor_session_id,
    eventType: "google_redirect_clicked",
  });

  return NextResponse.json({ url: normalized });
}
