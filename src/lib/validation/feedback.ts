import { z } from "zod";

export const reviewLengthSchema = z.enum(["short", "standard", "detailed"]);
export const reviewToneSchema = z.enum(["friendly", "professional", "warm", "concise"]);

export const customerFeedbackSchema = z.object({
  businessSlug: z.string().min(1),
  campaignToken: z.string().optional().nullable(),
  visitorSessionId: z.string().uuid().optional().nullable(),
  rating: z.number().int().min(1).max(5),
  consentConfirmed: z.literal(true),
  genuineInteractionConfirmed: z.literal(true),
  answers: z.record(z.string(), z.string().max(800)).default({}),
  originalNotes: z.string().max(2200).default(""),
  tone: reviewToneSchema.default("friendly"),
  preferredLanguage: z.string().min(2).max(30).default("en"),
  reviewLength: reviewLengthSchema.default("standard")
});

export const generatedReviewUpdateSchema = z.object({
  feedbackId: z.string().uuid(),
  finalEditedText: z.string().min(10).max(4000)
});

export function hasMeaningfulCustomerInput(input: Pick<z.infer<typeof customerFeedbackSchema>, "answers" | "originalNotes"> & { rating?: number }) {
  const answerText = Object.values(input.answers ?? {}).join(" ").trim();
  const notes = input.originalNotes.trim();
  return notes.length >= 15 || answerText.length >= 3 || typeof input.rating === "number";
}

export type CustomerFeedbackInput = z.infer<typeof customerFeedbackSchema>;
