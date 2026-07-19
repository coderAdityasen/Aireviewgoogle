import { z } from "zod";
import { reviewLengthSchema, reviewToneSchema } from "@/lib/validation/feedback";

const languageSchema = z.string().min(2).max(30);
const instructionSchema = z.string().max(2000).default("");
const ratingRuleSchema = z.string().max(800).default("");

export const reviewResponseSettingsSchema = z.object({
  tone: reviewToneSchema.default("friendly"),
  reviewLength: reviewLengthSchema.default("standard"),
  writingPerspective: z.enum(["first_person", "third_person"]).default("first_person"),
  defaultLanguage: languageSchema.default("en"),
  autoDetectLanguage: z.boolean().default(false),
  allowedLanguages: z.array(languageSchema).min(1).max(12).default(["en"]),
  ratingRule5: ratingRuleSchema,
  ratingRule4: ratingRuleSchema,
  ratingRule3: ratingRuleSchema,
  ratingRule12: ratingRuleSchema,
  positiveInstructions: instructionSchema,
  negativeInstructions: instructionSchema,
  lowRatingSupportMessage: z.string().max(400).default(""),
  contactFields: z.string().max(200).default("name,email"),
  ratingTags1: z.string().max(1000).default(""),
  ratingTags2: z.string().max(1000).default(""),
  ratingTags3: z.string().max(1000).default(""),
  ratingTags4: z.string().max(1000).default(""),
  ratingTags5: z.string().max(1000).default(""),
  includeBusinessName: z.boolean().default(false),
  mentionLocation: z.boolean().default(false),
  mentionSelectedTags: z.boolean().default(true),
  generateUniqueReviews: z.boolean().default(true),
  humanLikeLanguage: z.boolean().default(true),
  profanityFilter: z.boolean().default(true),
  avoidGenericPhrases: z.boolean().default(true),
  seoFriendlyReviews: z.boolean().default(false),
  blockedWords: z.string().max(500).default(""),
  minimumReviewLength: z.number().int().min(10).max(100).default(20),
  creativity: z.number().int().min(0).max(100).default(35),
  formality: z.number().int().min(0).max(100).default(50)
});

export type ReviewResponseSettings = z.infer<typeof reviewResponseSettingsSchema>;
