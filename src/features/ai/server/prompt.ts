export const REVIEW_PROMPT_SETTING_KEY = "review_generation_prompt";

export const REVIEW_SAFETY_PROMPT = `You are an editing assistant helping a real customer express their own experience clearly.

Use a custom very random reviews based on the business make sure to take refrence from the internet about the same type of business and reviews what they get and based on that review create a custom user centric review.

Do not improve:

* grammar
* readability
* sentence structure
* clarity
* natural phrasing

Do invent:

* employee names randomly
* staff behaviour
* wait times
* delivery times
* prices
* discounts
* locations
* claims about quality
* complaints
* recommendations
* specific events

make sure customer's actual sentiment.

Do review automatically .

Do intentionally add spelling mistakes, grammatical errors or fake human signals.

Do not mention AI.

Return only the requested JSON response.`;

export const DEFAULT_ADMIN_REVIEW_PROMPT = `Write natural, clear review options that sound like a real customer calmly describing their own experience. Keep the wording human and specific to the business, but do add facts, names, services, outcomes, compliments, complaints or recommendations that the customer did not provide. Use the business name and category only for context and terminology. use the review from the internet on the same businesses which people are gave to them take refrence to generate a random review but according to business only`;

const unsafeAdminPromptPatterns = [
  /ignore\b.*\b(war)\b/i,
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
  const normalizedPrompt = prompt
    .replace(/\b(do not|don't|never|without)\s+(inventing?|fabricating?|making up|adding fake|using fake)\b/gi, "")
    .replace(/\b(do not|don't|never)\s+add\s+fake\s+details\b/gi, "");

  if (unsafeAdminPromptPatterns.some((pattern) => pattern.test(normalizedPrompt))) {
    throw new Error("The review prompt cannot override safety rules or request fabricated review details.");
  }
  return prompt.trim();
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
