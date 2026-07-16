import { NextResponse, type NextRequest } from "next/server";
import { customerFeedbackSchema, hasMeaningfulCustomerInput } from "@/lib/validation/feedback";
import { getPublicBusiness, recordEvent } from "@/features/feedback/server/public";
import { generateReviewDraft } from "@/features/ai/server/provider";
import { REVIEW_PROMPT_SETTING_KEY, parseReviewPromptConfig, serializeReviewOptions } from "@/features/ai/server/prompt";
import { createAdminClient } from "@/lib/supabase/admin";
import { getClientIp, hashIp } from "@/lib/security/ip";
import { assertRateLimit, RateLimitError } from "@/lib/security/rate-limit";
import { assertAiUsageLimit, recordUsage } from "@/lib/billing/entitlements";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = customerFeedbackSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Check the feedback form and try again." }, { status: 400 });
  if (!hasMeaningfulCustomerInput(parsed.data)) {
    return NextResponse.json({ error: "Please add details about your own experience before generating a draft." }, { status: 400 });
  }

  const { business, campaign, unavailableCampaign } = await getPublicBusiness(parsed.data.businessSlug, parsed.data.campaignToken);
  if (!business || unavailableCampaign) return NextResponse.json({ error: "Feedback page unavailable." }, { status: 404 });

  try {
    await assertAiUsageLimit(business.owner_id);
  } catch (error) {
    await createAdminClient().from("ai_usage_logs").insert({ business_id: business.id, provider: process.env.OPENROUTER_API_KEY ? "openrouter" : "reviewflow", model: process.env.OPENROUTER_MODEL ?? process.env.AI_MODEL ?? "unconfigured", status: "blocked", error_message: error instanceof Error ? error.message : "AI usage limit reached" });
    return NextResponse.json({ error: error instanceof Error ? error.message : "AI generation is not available on this plan." }, { status: 402 });
  }

  const ipHash = hashIp(getClientIp(request));
  try {
    await assertRateLimit({
      scope: "review_generation",
      ipHash,
      sessionId: parsed.data.visitorSessionId,
      businessId: business.id,
      campaignId: campaign?.id ?? null,
      maxAttempts: 6,
      windowSeconds: 600
    });
  } catch (error) {
    if (error instanceof RateLimitError) return NextResponse.json({ error: error.message }, { status: 429 });
    throw error;
  }

  const admin = createAdminClient();
  const { data: promptSetting } = await admin
    .from("platform_settings")
    .select("setting_value")
    .eq("setting_key", REVIEW_PROMPT_SETTING_KEY)
    .maybeSingle();
  const promptConfig = parseReviewPromptConfig(promptSetting?.setting_value);

  await recordEvent({
    businessId: business.id,
    campaignId: campaign?.id ?? null,
    visitorSessionId: parsed.data.visitorSessionId,
    eventType: "feedback_started"
  });

  let usage: Awaited<ReturnType<typeof generateReviewDraft>>;
  try {
    usage = await generateReviewDraft({
      businessName: business.name,
      businessCategory: business.category,
      rating: parsed.data.rating,
      answers: parsed.data.answers,
      notes: parsed.data.originalNotes,
      length: parsed.data.reviewLength,
      language: parsed.data.preferredLanguage,
      adminPrompt: promptConfig.prompt,
      optionsCount: promptConfig.optionsCount
    });
  } catch (error) {
    await admin.from("ai_usage_logs").insert({
      business_id: business.id,
      provider: process.env.OPENROUTER_API_KEY ? "openrouter" : "reviewflow",
      model: process.env.OPENROUTER_MODEL ?? process.env.AI_MODEL ?? "unknown",
      status: "blocked",
      error_message: error instanceof Error ? error.message : "Grounding validation failed"
    });
    return NextResponse.json({ error: "The draft could not be safely generated from the provided details." }, { status: 422 });
  }

  const { data: feedback, error: feedbackError } = await admin
    .from("customer_feedback")
    .insert({
      business_id: business.id,
      qr_campaign_id: campaign?.id ?? null,
      visitor_session_id: parsed.data.visitorSessionId ?? null,
      rating: parsed.data.rating,
      answers: parsed.data.answers as never,
      original_notes: parsed.data.originalNotes,
      generated_draft: serializeReviewOptions(usage.drafts),
      final_edited_text: null,
      preferred_language: parsed.data.preferredLanguage,
      review_length: parsed.data.reviewLength,
      submitted_privately: false,
      consent_confirmed: true
    })
    .select("id")
    .single();

  if (feedbackError) throw feedbackError;

  await Promise.all([
    recordEvent({
      businessId: business.id,
      campaignId: campaign?.id ?? null,
      visitorSessionId: parsed.data.visitorSessionId,
      eventType: "feedback_completed"
    }),
    recordEvent({
      businessId: business.id,
      campaignId: campaign?.id ?? null,
      visitorSessionId: parsed.data.visitorSessionId,
      eventType: "review_generated",
      metadata: { length: parsed.data.reviewLength, language: parsed.data.preferredLanguage, optionsCount: usage.drafts.length }
    }),
    admin.from("ai_usage_logs").insert({
      business_id: business.id,
      feedback_id: feedback.id,
      provider: usage.provider,
      model: usage.model,
      input_tokens: usage.inputTokens,
      output_tokens: usage.outputTokens,
      estimated_cost: usage.estimatedCost,
      status: "success"
    })
  ]);

  await recordUsage(business.owner_id, "ai_generation");

  return NextResponse.json({ feedbackId: feedback.id, drafts: usage.drafts });
}
