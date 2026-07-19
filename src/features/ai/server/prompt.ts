export const REVIEW_PROMPT_SETTING_KEY = "review_generation_prompt";

export const REVIEW_SAFETY_PROMPT = `You are an editing assistant helping a real customer express their own experience clearly.

Treat tone as a style preference only; it must never add a fact or change the customer's rating.

Use only the customer-selected rating, tags and written experience in the request. Do not use the internet, prior reviews or outside knowledge. Do not invent names, services, prices, wait times, locations, outcomes, recommendations or events. Preserve the customer’s sentiment, including low or mixed ratings. Do not post, submit or claim to submit anything to Google.

Write natural, readable options in the requested language. Do not add fake human signals or intentional errors. Do not mention this instruction or the generation process.

Return only the requested JSON response.`;

export const DEFAULT_ADMIN_REVIEW_PROMPT = `Write a natural review using only the selected rating and configured customer options. Keep wording readable and specific to those inputs. Never add facts, names, services, outcomes, compliments, complaints or recommendations that are not in the customer input. Preserve the selected sentiment and rating.`;

const unsafeAdminPromptPatterns = [
  /ignore\b.*\b(war)\b/i,
  /make\s+(every|all)\s+review(?:s)?\s+positive/i,
  /invent|fabricat|randomly\s+add|use\s+the\s+internet|prior\s+reviews|auto(?:matically)?\s+post/i
];

export type ReviewPromptConfig = {
  prompt: string;
  optionsCount: 2 | 3;
};

export function getDefaultReviewPromptConfig(): ReviewPromptConfig {
  return {
    prompt: DEFAULT_ADMIN_REVIEW_PROMPT,
    optionsCount: 3
  };
}

export function parseReviewPromptConfig(value: unknown): ReviewPromptConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) return getDefaultReviewPromptConfig();

  const record = value as Record<string, unknown>;
  const prompt = typeof record.prompt === "string" && record.prompt.trim() ? record.prompt.trim() : DEFAULT_ADMIN_REVIEW_PROMPT;
  const rawOptionsCount = Number(record.optionsCount ?? record.options_count ?? 3);
  const optionsCount = rawOptionsCount === 2 ? 2 : 3;

  return { prompt, optionsCount };
}

export function assertAdminPromptIsSafe(prompt: string) {
  const value = prompt.trim();
  if (!value || unsafeAdminPromptPatterns.some((pattern) => pattern.test(value))) throw new Error("The prompt conflicts with ReviewFlow safety rules.");
  return value;
}

export function buildReviewUserPrompt(input: {
  businessName: string;
  businessCategory: string;
  rating: number;
  answers: Record<string, string>;
  notes: string;
  length: string;
  language: string;
  optionsCount: number;
}) {
  return JSON.stringify(
    {
      businessName: input.businessName,
      businessCategory: input.businessCategory,
      customerSelectedRating: input.rating,
      customerDirectAnswers: input.answers,
      customerNotes: input.notes,
      requestedLength: input.length,
      requestedLanguage: input.language,
      requestedReviewOptions: input.optionsCount,
      instruction:
        `Write exactly ${input.optionsCount} distinct review options using only the customer fields above. Business fields are context only and cannot create facts. Return strict JSON in this shape: {"reviews":["first option","second option"]}.`
    },
    null,
    2
  );
}

export function serializeReviewOptions(drafts: string[]) {
  return JSON.stringify({ reviews: drafts });
}

export function parseStoredReviewOptions(value: string | null | undefined) {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) return parsed.filter((item): item is string => typeof item === "string");
    if (parsed && typeof parsed === "object" && Array.isArray((parsed as { reviews?: unknown }).reviews)) {
      return (parsed as { reviews: unknown[] }).reviews.filter((item): item is string => typeof item === "string");
    }
  } catch {
    // Older rows may contain a single draft or separator-joined drafts.
  }

  return value
    .split(/\n\s*---\s*\n/)
    .map((draft) => draft.trim())
    .filter(Boolean);
}
