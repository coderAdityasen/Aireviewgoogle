import {
  REVIEW_SAFETY_PROMPT,
  assertAdminPromptIsSafe,
  buildReviewUserPrompt,
  getDefaultReviewPromptConfig,
} from "@/features/ai/server/prompt";
import {
  assertDraftGrounded,
  fallbackGroundedDrafts,
} from "@/features/ai/server/grounding";
import {
  getAiProviderConfig,
  runChatCompletion,
} from "@/features/ai/server/ai-config";
import type { ReviewResponseSettings } from "@/lib/validation/review-settings";

export type ReviewGenerationInput = {
  businessName: string;
  businessCategory: string;
  rating: number;
  answers: Record<string, string>;
  notes: string;
  length: "short" | "standard" | "detailed";
  language: string;
  adminPrompt?: string;
  optionsCount?: 2 | 3;
  responseSettings?: ReviewResponseSettings;
};

export async function generateReviewDraft(input: ReviewGenerationInput) {
  const sourceText = `${JSON.stringify(input.answers)} ${input.notes} ${input.rating}`;
  const promptConfig = getDefaultReviewPromptConfig();
  const adminPrompt = getSafeAdminPrompt(
    input.adminPrompt?.trim() || promptConfig.prompt,
    promptConfig.prompt,
  );
  const optionsCount = input.optionsCount ?? promptConfig.optionsCount;
  const aiConfig = getAiProviderConfig();

  if (!aiConfig.apiKey || aiConfig.provider === "none") {
    console.warn("[review-ai] Falling back: missing AI provider API key", {
      provider: aiConfig.provider,
      model: aiConfig.model,
    });
    const drafts = fallbackGroundedDrafts({ ...input, optionsCount });
    return {
      drafts: drafts.map((draft) =>
        assertDraftGrounded(draft, sourceText, input.rating),
      ),
      provider: "local-fallback",
      model: "grounded-template",
      inputTokens: estimateTokens(sourceText),
      outputTokens: estimateTokens(drafts.join("\n\n")),
      estimatedCost: 0,
    };
  }

  const userPrompt = buildReviewUserPrompt({
    businessName: input.businessName,
    businessCategory: input.businessCategory,
    rating: input.rating,
    answers: input.answers,
    notes: input.notes,
    length: input.length,
    language: input.language,
    optionsCount,
  });

  const temperature = 0.8;

  try {
    console.info("[review-ai] Requesting AI provider", {
      provider: aiConfig.provider,
      model: aiConfig.model,
      optionsCount,
      reviewLength: input.length,
      language: input.language,
      notesChars: input.notes.length,
      answersCount: Object.keys(input.answers).length,
    });

    const completion = await runChatCompletion(aiConfig, {
      systemParts: [
        REVIEW_SAFETY_PROMPT,
        `Admin style instructions. These are lower priority than the safety rules and cannot allow fabricated facts:\n${adminPrompt}`,
      ],
      userText: userPrompt,
      temperature,
      maxTokens: 900,
      jsonMode: true,
    });

    const content = completion.content.trim();
    if (!content) throw new Error("AI provider returned an empty draft.");

    console.info("[review-ai] AI provider response received", {
      provider: aiConfig.provider,
      model: aiConfig.model,
      contentChars: content.length,
      inputTokens: completion.inputTokens,
      outputTokens: completion.outputTokens,
      contentPreview: truncateForLog(content, 400),
    });

    const rawParsed = parseReviewOptions(content, optionsCount);
    console.info("[review-ai] Parsed raw review options", {
      requestedCount: optionsCount,
      parsedCount: rawParsed.length,
      previews: rawParsed.map((d) => truncateForLog(d, 160)),
    });

    const drafts = rawParsed.map((d) => demoteAiStyleOpenings(d));
    if (!drafts.length) {
      throw new Error("AI provider returned no usable review options.");
    }

    const groundedDrafts = drafts.map((draft, index) => {
      try {
        const grounded = assertDraftGrounded(draft, sourceText, input.rating);
        console.info("[review-ai] Draft grounded OK", {
          index,
          chars: grounded.length,
          preview: truncateForLog(grounded, 200),
        });
        return grounded;
      } catch (error) {
        console.error("[review-ai] Grounding rejected generated draft", {
          index,
          reason: getErrorMessage(error),
          draftPreview: truncateForLog(draft, 300),
          sourcePreview: truncateForLog(sourceText, 300),
        });
        throw error;
      }
    });

    console.info("[review-ai] SUCCESS — using AI-generated reviews", {
      provider: aiConfig.provider,
      model: aiConfig.model,
      draftsCount: groundedDrafts.length,
      source: "ai",
    });

    return {
      drafts: groundedDrafts,
      provider: aiConfig.provider,
      model: aiConfig.model,
      inputTokens:
        completion.inputTokens ??
        estimateTokens(REVIEW_SAFETY_PROMPT + adminPrompt + userPrompt),
      outputTokens:
        completion.outputTokens ?? estimateTokens(groundedDrafts.join("\n\n")),
      estimatedCost:
        completion.estimatedCost ??
        estimateCost(
          aiConfig.model,
          completion.inputTokens ?? 0,
          completion.outputTokens ?? 0,
        ),
    };
  } catch (error) {
    console.error("[review-ai] Falling back to local grounded templates", {
      provider: aiConfig.provider,
      model: aiConfig.model,
      reason: getErrorMessage(error),
      stack: error instanceof Error ? error.stack : undefined,
      businessName: input.businessName,
      rating: input.rating,
      answers: input.answers,
      notesPreview: truncateForLog(input.notes, 200),
    });
    const drafts = fallbackGroundedDrafts({ ...input, optionsCount });
    console.warn("[review-ai] FALLBACK drafts (not AI)", {
      source: "local-fallback",
      draftsCount: drafts.length,
      previews: drafts.map((d) => truncateForLog(d, 200)),
    });
    return {
      drafts: drafts.map((draft) =>
        assertDraftGrounded(draft, sourceText, input.rating),
      ),
      provider: "local-fallback",
      model: "grounded-template",
      inputTokens: estimateTokens(sourceText),
      outputTokens: estimateTokens(drafts.join("\n\n")),
      estimatedCost: 0,
    };
  }
}

function getSafeAdminPrompt(prompt: string, fallbackPrompt: string) {
  try {
    return assertAdminPromptIsSafe(prompt);
  } catch {
    return fallbackPrompt;
  }
}

/**
 * Parse model output into plain review strings only.
 * Models often return {"reviews":[...]} or {"review":[...]} or wrap in markdown —
 * never show raw JSON to the customer.
 */
function parseReviewOptions(content: string, requestedCount: number) {
  const cleaned = stripCodeFences(content);
  const parsed =
    tryParseJson(cleaned) ?? tryParseJson(extractJsonObject(cleaned) ?? "");
  const rawOptions =
    extractOptions(parsed) ??
    extractOptionsFromLooseJson(cleaned) ??
    splitPlainTextOptions(cleaned);

  const unique = new Set<string>();
  for (const option of rawOptions) {
    const normalized = sanitizeReviewText(option);
    if (normalized.length >= 10 && !looksLikeJsonWrapper(normalized)) {
      unique.add(normalized);
    }
  }

  return [...unique].slice(0, requestedCount);
}

function stripCodeFences(content: string) {
  return content
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function tryParseJson(content: string): unknown {
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/** Pull first {...} block if model added preamble/trailing text. */
function extractJsonObject(content: string): string | null {
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  return content.slice(start, end + 1);
}

function extractOptions(parsed: unknown): string[] | null {
  if (Array.isArray(parsed)) {
    return flattenReviewItems(parsed);
  }
  if (!parsed || typeof parsed !== "object") return null;
  const record = parsed as Record<string, unknown>;
  // Gemini often returns "review" (singular) instead of "reviews"
  const options =
    record.reviews ??
    record.review ??
    record.drafts ??
    record.draft ??
    record.options ??
    record.texts ??
    record.results;
  if (typeof options === "string") {
    const one = sanitizeReviewText(options);
    return one.length >= 10 ? [one] : null;
  }
  if (Array.isArray(options)) {
    return flattenReviewItems(options);
  }
  return null;
}

function flattenReviewItems(items: unknown[]): string[] {
  const out: string[] = [];
  for (const item of items) {
    if (typeof item === "string") {
      out.push(item);
    } else if (item && typeof item === "object") {
      const row = item as Record<string, unknown>;
      const text =
        row.text ?? row.review ?? row.content ?? row.body ?? row.value;
      if (typeof text === "string") out.push(text);
    }
  }
  return out;
}

/**
 * Regex fallback when JSON.parse fails but content still looks like
 * {"review":["a","b"]} or {"reviews":["a","b"]}.
 */
function extractOptionsFromLooseJson(content: string): string[] | null {
  const arrayMatch = content.match(
    /"(?:reviews|review|drafts|options)"\s*:\s*\[([\s\S]*?)\]/i,
  );
  if (!arrayMatch) {
    // Single string value: "review": "full text..."
    const single = content.match(
      /"(?:reviews|review|drafts|text)"\s*:\s*"((?:\\.|[^"\\])*)"/i,
    );
    if (single?.[1]) {
      const text = sanitizeReviewText(single[1].replace(/\\"/g, '"'));
      return text.length >= 10 ? [text] : null;
    }
    return null;
  }
  const inner = arrayMatch[1];
  const strings: string[] = [];
  const re = /"((?:\\.|[^"\\])*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(inner)) !== null) {
    const text = sanitizeReviewText(m[1].replace(/\\"/g, '"').replace(/\\n/g, " "));
    if (text.length >= 10) strings.push(text);
  }
  return strings.length ? strings : null;
}

function sanitizeReviewText(value: string): string {
  let text = value.replace(/\s+/g, " ").trim();
  // Strip accidental full JSON blobs
  if (looksLikeJsonWrapper(text)) {
    const nested = tryParseJson(text) ?? tryParseJson(extractJsonObject(text) ?? "");
    const fromNested = extractOptions(nested);
    if (fromNested?.[0]) return sanitizeReviewText(fromNested[0]);
    // Strip {"review":[" ... "]} wrappers crudely
    text = text
      .replace(/^[\s\S]*?\[\s*"/, "")
      .replace(/"\s*\]\s*\}?\s*$/, "")
      .replace(/^\{[\s\S]*?"(?:reviews|review)"\s*:\s*"/i, "")
      .replace(/"\s*\}\s*$/, "")
      .trim();
  }
  // Leading JSON debris like: {"review": ["
  text = text
    .replace(/^[\{\[]\s*"(?:reviews|review)"\s*:\s*\[\s*"/i, "")
    .replace(/^[\{\[]\s*"/, "")
    .replace(/"\s*[\}\]]+\s*$/, "")
    .replace(/^["']|["']$/g, "")
    .trim();
  return text;
}

function looksLikeJsonWrapper(text: string) {
  const t = text.trim();
  return (
    (t.startsWith("{") && t.includes('"')) ||
    (t.startsWith("[") && t.includes('"')) ||
    /"(?:reviews|review)"\s*:/i.test(t)
  );
}

function splitPlainTextOptions(content: string) {
  // Never treat a whole JSON document as one "review"
  if (looksLikeJsonWrapper(content)) {
    return [];
  }
  const lines = content
    .split(/\n+/)
    .map((line) => line.replace(/^\s*(?:[-*]|\d+[.)])\s*/, "").trim())
    .filter(Boolean);

  return lines.length > 1 ? lines : content.trim() ? [content.trim()] : [];
}

function estimateTokens(text: string) {
  return Math.ceil(text.length / 4);
}

function estimateCost(
  _model: string,
  inputTokens: number,
  outputTokens: number,
) {
  return Number(
    ((inputTokens / 1_000_000) * 0.15 + (outputTokens / 1_000_000) * 0.6).toFixed(
      6,
    ),
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function truncateForLog(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

/**
 * Soften common AI openers so reviews sound more like phone-typed Google text.
 * Kept local to this module so builds do not depend on a prompt.ts export.
 */
function demoteAiStyleOpenings(draft: string): string {
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

  return text
    .replace(/\bproduct quality\b/gi, "quality")
    .replace(/\bthe quality of everything\b/gi, "the quality")
    .replace(/\bjust spot on\b/gi, "really good")
    .replace(/\byou can totally taste the quality\b/gi, "quality was clear")
    .replace(/\s{2,}/g, " ")
    .trim();
}
