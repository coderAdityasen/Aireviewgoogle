export const REVIEW_PROMPT_SETTING_KEY = "review_generation_prompt";

/**
 * System rules for QR review drafts.
 * Goal: phone-typed Google reviews — not polished marketing / AI openers.
 */
export const REVIEW_SAFETY_PROMPT = `You write short Google reviews that sound like a real customer typed them on their phone after a visit.

VOICE:
- First person (I / we). Everyday words. Contractions are fine (it's, didn't, wasn't).
- 1–4 sentences for short/standard. Up to 5 only if detailed is requested.
- Slightly uneven rhythm is good. Do NOT sound like an ad or product description.
- Each option must feel written by a different person (different first line, different tag focus).

OPENINGS — CRITICAL (your previous failures were here):
- Do NOT start with these AI patterns (or close variants):
  "Really impressed…", "Came to [business]…", "I loved the food…", "The quality of everything…",
  "Absolutely loved…", "Had an amazing experience…", "I was so happy with my order…",
  "You can totally taste…", "Definitely one of…", "Must visit…", "Highly recommend…"
- Do NOT open by naming the business. If you use the business name, put it mid-review or skip it.
- Start from a concrete tag or feeling in plain speech, e.g.:
  "Food was solid — quality was better than I expected."
  "Honestly the quality stood out more than anything."
  "Pretty good meal overall, nothing fancy but it hit the spot."
- Prefer understatement for 4–5★. Save strong words for when the rating is 5 and tags are strong.

HARD BANS:
- Marketing / AI words: delve, tapestry, realm, elevate, seamless, embark, vibrant, culinary, top-notch, absolute pleasure, exceeded expectations, hidden gem, "as a customer", "I had the pleasure", "product quality" (say "food" / "quality" naturally if tags say so), "spot on" overused.
- Never invent dishes, staff names, prices, wait times, services, or events not in the customer input.
- Never flip low ratings into praise.
- Never mention AI, Google posting, or that this is a draft.

INPUT:
- Only customerSelectedRating, customerDirectAnswers (tags/tone), customerNotes, length, language.
- businessName is optional context only — most real reviews skip the name or use it once mid-text.
- Thin input → shorter review. Never pad.

OUTPUT (machine-readable only — the app extracts plain text for the customer):
- Respond with ONLY a JSON object. Key must be exactly "reviews" (plural).
- Shape: {"reviews":["first review text","second review text","third review text"]}
- Each array item is plain review prose only — no JSON, no quotes nesting, no markdown.
- Do not use the key "review" (singular). Do not wrap the whole answer in extra text.
- Match requestedLanguage.`;

export const DEFAULT_ADMIN_REVIEW_PROMPT = `Rewrite the customer's rating + tags into a natural Google review.

Method:
1. Match emotion to stars (5 = warm, 4 = positive but calm, 3 = mixed, 1–2 = clear problems).
2. Turn tags into spoken language, not a keyword list ("Food Quality" → "food was good quality" / "quality was decent").
3. If notes exist, anchor on that first.
4. One main point + optional second beat. Stop.
5. Options must differ: first words, which tag leads, and length.

BAD (never write like this):
"Really impressed with the food here. The quality of everything was just spot on, I was so happy with my order."
"Came to Sarvottam and the food was amazing. You can totally taste the quality..."
"I loved the food! The product quality was excellent..."

GOOD (style targets — invent nothing beyond tags):
"Food quality was better than I expected — really solid."
"Stopped by for a quick meal. Quality was good and I'd come back."
"Not much to complain about quality-wise. Food hit the spot."

Never invent experiences. Sparse tags → shorter text, not fluff.`;

const unsafeAdminPromptPatterns = [
  /ignore\b.*\b(war)\b/i,
  /make\s+(every|all)\s+review(?:s)?\s+positive/i,
  /invent|fabricat|randomly\s+add|use\s+the\s+internet|prior\s+reviews|auto(?:matically)?\s+post/i,
];

export type ReviewPromptConfig = {
  prompt: string;
  optionsCount: 2 | 3;
};

export function getDefaultReviewPromptConfig(): ReviewPromptConfig {
  return {
    prompt: DEFAULT_ADMIN_REVIEW_PROMPT,
    optionsCount: 3,
  };
}

export function parseReviewPromptConfig(value: unknown): ReviewPromptConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return getDefaultReviewPromptConfig();
  }

  const record = value as Record<string, unknown>;
  const prompt =
    typeof record.prompt === "string" && record.prompt.trim()
      ? record.prompt.trim()
      : DEFAULT_ADMIN_REVIEW_PROMPT;
  const rawOptionsCount = Number(record.optionsCount ?? record.options_count ?? 3);
  const optionsCount = rawOptionsCount === 2 ? 2 : 3;

  return { prompt, optionsCount };
}

export function assertAdminPromptIsSafe(prompt: string) {
  const value = prompt.trim();
  if (!value || unsafeAdminPromptPatterns.some((pattern) => pattern.test(value))) {
    throw new Error("The prompt conflicts with ReviewFlow safety rules.");
  }
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
      instruction: `Write exactly ${input.optionsCount} distinct Google review options a real customer might post on their phone.
Use ONLY the fields above. Prefer not starting with the business name.
Match length: short ≈ 1–2 sentences, standard ≈ 2–3, detailed ≈ 3–5 (still casual).
Tone in customerDirectAnswers is style only—not new facts.
Ban openings like "Really impressed", "Came to …", "I loved the food", "The quality of everything".
Return ONLY this JSON shape (key must be "reviews" plural, not "review"):
{"reviews":["plain review text only","another option","third option"]}
Each string is the review body only — never include braces or the word reviews inside the strings.`,
    },
    null,
    2,
  );
}

/**
 * Soft cleanup for common AI openers the model still produces.
 * Does not invent facts — only trims cliché first clauses when a usable remainder exists.
 */
export function demoteAiStyleOpenings(draft: string): string {
  let text = draft.replace(/\s+/g, " ").trim();
  if (!text) return draft;

  const openers: RegExp[] = [
    /^really impressed with (the )?[^.!?]{0,40}[.!?]?\s*/i,
    /^came to [^.!?,]{1,40}[,.]?\s*/i,
    /^i (absolutely )?loved the [^.!?]{0,30}[.!]?\s*/i,
    /^the quality of everything was (just )?spot on[^.!?]{0,40}[.!]?\s*/i,
    /^had an amazing experience( at [^.!?]{0,30})?[.!]?\s*/i,
    /^absolutely (loved|amazing)[^.!?]{0,40}[.!]?\s*/i,
    /^you can totally taste[^.!?]{0,50}[.!]?\s*/i,
    /^i was so happy with my order[.!]?\s*/i,
  ];

  for (const pattern of openers) {
    if (pattern.test(text)) {
      const next = text.replace(pattern, "").trim();
      if (next.length >= 12) {
        text = next.charAt(0).toUpperCase() + next.slice(1);
      }
      break;
    }
  }

  // Soften corporate phrasing without changing meaning much
  text = text
    .replace(/\bproduct quality\b/gi, "quality")
    .replace(/\bthe quality of everything\b/gi, "the quality")
    .replace(/\bjust spot on\b/gi, "really good")
    .replace(/\byou can totally taste the quality\b/gi, "quality was clear")
    .replace(/\s{2,}/g, " ")
    .trim();

  return text;
}

export function serializeReviewOptions(drafts: string[]) {
  return JSON.stringify({ reviews: drafts });
}

export function parseStoredReviewOptions(value: string | null | undefined) {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string");
    }
    if (parsed && typeof parsed === "object") {
      const record = parsed as {
        reviews?: unknown;
        drafts?: unknown;
        options?: unknown;
      };
      const list = record.reviews ?? record.drafts ?? record.options;
      if (Array.isArray(list)) {
        return list.filter(
          (item): item is string => typeof item === "string" && item.trim().length > 0,
        );
      }
    }
  } catch {
    // Older rows may contain a single draft or separator-joined drafts.
  }

  return value
    .split(/\n\s*---\s*\n/)
    .map((draft) => draft.trim())
    .filter(Boolean);
}

/**
 * Human-readable review body for dashboards.
 * Handles JSON payloads like {"reviews":["…","…"]} stored in generated_draft.
 */
export function formatReviewDisplayText(input: {
  finalEditedText?: string | null;
  generatedDraft?: string | null;
  originalNotes?: string | null;
  /** When true and multiple options exist, only the first option is shown. */
  firstOnly?: boolean;
}) {
  const candidates = [
    input.finalEditedText,
    input.generatedDraft,
    input.originalNotes,
  ];

  for (const candidate of candidates) {
    const raw = candidate?.trim();
    if (!raw) continue;

    const options = parseStoredReviewOptions(raw);
    if (options.length) {
      return (input.firstOnly ? options.slice(0, 1) : options)
        .map((option) => option.trim())
        .filter(Boolean)
        .join("\n\n");
    }

    if (!looksLikeReviewJson(raw)) {
      return raw
        .replace(/^\s*\d+\.\s*/gm, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    }
  }

  return "No review text captured.";
}

function looksLikeReviewJson(value: string) {
  const trimmed = value.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return false;
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (Array.isArray(parsed)) return true;
    if (parsed && typeof parsed === "object") {
      const record = parsed as {
        reviews?: unknown;
        drafts?: unknown;
        options?: unknown;
      };
      return (
        Array.isArray(record.reviews) ||
        Array.isArray(record.drafts) ||
        Array.isArray(record.options)
      );
    }
  } catch {
    return false;
  }
  return false;
}
