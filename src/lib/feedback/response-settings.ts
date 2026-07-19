import { reviewResponseSettingsSchema, type ReviewResponseSettings } from "@/lib/validation/review-settings";
import { normalizeRatingTags } from "@/lib/feedback/rating-tags";

export const DEFAULT_REVIEW_RESPONSE_SETTINGS: ReviewResponseSettings = {
  tone: "friendly",
  reviewLength: "standard",
  writingPerspective: "first_person",
  defaultLanguage: "en",
  autoDetectLanguage: false,
  allowedLanguages: ["en"],
  ratingRule5: "Keep the wording specific to the customer's selected experience.",
  ratingRule4: "Keep the wording positive but natural and grounded in the selected details.",
  ratingRule3: "Keep the wording balanced and preserve any mixed or neutral sentiment.",
  ratingRule12: "Keep the wording constructive and never turn a low rating into praise.",
  positiveInstructions: "Use a clear, natural voice when the customer selects a positive rating.",
  negativeInstructions: "Preserve concerns and mixed sentiment when the customer selects a lower rating.",
  lowRatingSupportMessage: "Tell us what we can improve and our team can follow up privately.",
  contactFields: "name,email",
  ratingTags1: "What could be improved\nValue for money",
  ratingTags2: "What could be improved\nCommunication",
  ratingTags3: "What stood out\nWhat could be better",
  ratingTags4: "Friendly service\nClear communication",
  ratingTags5: "Friendly service\nGreat experience",
  includeBusinessName: false,
  mentionLocation: false,
  mentionSelectedTags: true,
  generateUniqueReviews: true,
  humanLikeLanguage: true,
  profanityFilter: true,
  avoidGenericPhrases: true,
  seoFriendlyReviews: false,
  blockedWords: "",
  minimumReviewLength: 20,
  creativity: 35,
  formality: 50
};

export function parseReviewResponseSettings(value: unknown): ReviewResponseSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) return DEFAULT_REVIEW_RESPONSE_SETTINGS;
  const parsed = reviewResponseSettingsSchema.safeParse({ ...DEFAULT_REVIEW_RESPONSE_SETTINGS, ...(value as Record<string, unknown>) });
  return parsed.success ? parsed.data : DEFAULT_REVIEW_RESPONSE_SETTINGS;
}

export function responseSettingsForForm(value: unknown, legacy?: { experienceTags?: unknown; lowRatingSupportMessage?: string | null; contactFields?: unknown }) {
  const parsed = parseReviewResponseSettings(value);
  const source = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const hasStoredTags = Object.keys(source).some((key) => key.startsWith("ratingTags"));
  const legacyTags = normalizeRatingTags(legacy?.experienceTags);

  if (!hasStoredTags && Object.values(legacyTags).some((tags) => tags?.length)) {
    for (const rating of [1, 2, 3, 4, 5] as const) {
      parsed[`ratingTags${rating}`] = (legacyTags[rating] ?? []).join("\n");
    }
  }
  if (!source.lowRatingSupportMessage && legacy?.lowRatingSupportMessage) parsed.lowRatingSupportMessage = legacy.lowRatingSupportMessage;
  if (!source.contactFields && Array.isArray(legacy?.contactFields)) parsed.contactFields = legacy.contactFields.join(",");
  return parsed;
}

export function ratingRuleFor(value: ReviewResponseSettings, rating: number) {
  if (rating >= 5) return value.ratingRule5;
  if (rating === 4) return value.ratingRule4;
  if (rating === 3) return value.ratingRule3;
  return value.ratingRule12;
}

export function instructionsForRating(value: ReviewResponseSettings, rating: number) {
  return rating >= 4 ? value.positiveInstructions : value.negativeInstructions;
}
