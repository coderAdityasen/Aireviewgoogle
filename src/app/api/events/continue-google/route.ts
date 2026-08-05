import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordEvents } from "@/features/feedback/server/public";
import { parseStoredReviewOptions } from "@/features/ai/server/prompt";
import { normalizeGoogleReviewUrl } from "@/lib/security/google-url";
import type { AnalyticsEventType } from "@/types/database";

/**
 * Single round-trip for "Copy & continue on Google Maps".
 * Client fast-path opens Google immediately and calls this with keepalive.
 * Fallback path awaits this once when the URL was not preloaded.
 */
const continueSchema = z.object({
  feedbackId: z.string().uuid(),
  finalEditedText: z.string().min(10).max(4000),
});

function sameReviewText(left: string, right: string) {
  return left.trim().replace(/\s+/g, " ") === right.trim().replace(/\s+/g, " ");
}

export async function POST(request: Request) {
  const parsed = continueSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid continue event." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: feedback, error } = await admin
    .from("customer_feedback")
    .update({
      final_edited_text: parsed.data.finalEditedText,
      continued_to_google: true,
      submitted_privately: false,
    })
    .eq("id", parsed.data.feedbackId)
    .select(
      "business_id, qr_campaign_id, visitor_session_id, generated_draft, businesses(google_review_url)",
    )
    .single();
  if (error) throw error;

  const googleUrlRaw = Array.isArray(feedback.businesses)
    ? feedback.businesses[0]?.google_review_url
    : feedback.businesses?.google_review_url;

  let url: string;
  try {
    url = normalizeGoogleReviewUrl(googleUrlRaw ?? "");
  } catch {
    return NextResponse.json(
      { error: "This location has no valid Google review link configured." },
      { status: 422 },
    );
  }

  const generatedOptions = parseStoredReviewOptions(feedback.generated_draft);
  const copiedGeneratedOption = generatedOptions.some((option) =>
    sameReviewText(option, parsed.data.finalEditedText),
  );

  const events: Array<{
    businessId: string;
    campaignId: string | null;
    visitorSessionId: string | null;
    eventType: AnalyticsEventType;
  }> = [];

  if (!copiedGeneratedOption) {
    events.push({
      businessId: feedback.business_id,
      campaignId: feedback.qr_campaign_id,
      visitorSessionId: feedback.visitor_session_id,
      eventType: "review_edited",
    });
  }

  events.push(
    {
      businessId: feedback.business_id,
      campaignId: feedback.qr_campaign_id,
      visitorSessionId: feedback.visitor_session_id,
      eventType: "review_copied",
    },
    {
      businessId: feedback.business_id,
      campaignId: feedback.qr_campaign_id,
      visitorSessionId: feedback.visitor_session_id,
      eventType: "google_redirect_clicked",
    },
  );

  await recordEvents(events);

  return NextResponse.json({ ok: true, url });
}
