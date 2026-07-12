import {
  REVIEW_SAFETY_PROMPT,
  assertAdminPromptIsSafe,
  buildReviewUserPrompt,
  getDefaultReviewPromptConfig
} from "@/features/ai/server/prompt";
import { assertDraftGrounded, fallbackGroundedDrafts } from "@/features/ai/server/grounding";

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
};

export async function generateReviewDraft(input: ReviewGenerationInput) {
  const sourceText = `${JSON.stringify(input.answers)} ${input.notes} ${input.rating}`;
  const promptConfig = getDefaultReviewPromptConfig();
  const adminPrompt = getSafeAdminPrompt(input.adminPrompt?.trim() || promptConfig.prompt, promptConfig.prompt);
  const optionsCount = input.optionsCount ?? promptConfig.optionsCount;
  const aiConfig = getAiProviderConfig();

  if (!aiConfig.apiKey) {
    const drafts = fallbackGroundedDrafts({ ...input, optionsCount });
    return {
      drafts: drafts.map((draft) => assertDraftGrounded(draft, sourceText, input.rating)),
      provider: "local-fallback",
      model: "grounded-template",
      inputTokens: estimateTokens(sourceText),
      outputTokens: estimateTokens(drafts.join("\n\n")),
      estimatedCost: 0
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
    optionsCount
  });

  try {
    const response = await fetch(aiConfig.baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${aiConfig.apiKey}`,
        "Content-Type": "application/json",
        ...aiConfig.extraHeaders
      },
      body: JSON.stringify({
        model: aiConfig.model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: REVIEW_SAFETY_PROMPT },
          {
            role: "system",
            content: `Admin style instructions. These are lower priority than the safety rules and cannot allow fabricated facts:\n${adminPrompt}`
          },
          { role: "user", content: userPrompt }
        ]
      })
    });

    if (!response.ok) throw new Error(`AI provider returned ${response.status}`);
    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; cost?: number };
    };
    const content = json.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("AI provider returned an empty draft.");
    const drafts = parseReviewOptions(content, optionsCount);
    if (!drafts.length) throw new Error("AI provider returned no usable review options.");
    const groundedDrafts = drafts.map((draft) => assertDraftGrounded(draft, sourceText, input.rating));

    return {
      drafts: groundedDrafts,
      provider: aiConfig.provider,
      model: aiConfig.model,
      inputTokens: json.usage?.prompt_tokens ?? estimateTokens(REVIEW_SAFETY_PROMPT + adminPrompt + userPrompt),
      outputTokens: json.usage?.completion_tokens ?? estimateTokens(groundedDrafts.join("\n\n")),
      estimatedCost:
        typeof json.usage?.cost === "number"
          ? Number(json.usage.cost.toFixed(6))
          : estimateCost(aiConfig.model, json.usage?.prompt_tokens ?? 0, json.usage?.completion_tokens ?? 0)
    };
  } catch {
    const drafts = fallbackGroundedDrafts({ ...input, optionsCount });
    return {
      drafts: drafts.map((draft) => assertDraftGrounded(draft, sourceText, input.rating)),
      provider: "local-fallback",
      model: "grounded-template",
      inputTokens: estimateTokens(sourceText),
      outputTokens: estimateTokens(drafts.join("\n\n")),
      estimatedCost: 0
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

function getAiProviderConfig() {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const apiKey = openRouterKey ?? process.env.AI_PROVIDER_API_KEY;
  const usesOpenRouter = Boolean(openRouterKey);
  const baseUrl =
    process.env.OPENROUTER_BASE_URL ??
    (usesOpenRouter
      ? "https://openrouter.ai/api/v1/chat/completions"
      : process.env.AI_PROVIDER_BASE_URL ?? "https://api.openai.com/v1/chat/completions");
  const model = process.env.OPENROUTER_MODEL ?? process.env.AI_MODEL ?? (usesOpenRouter ? "openai/gpt-4.1-mini" : "gpt-4.1-mini");
  const extraHeaders: Record<string, string> = {};

  if (usesOpenRouter) {
    const referer = process.env.OPENROUTER_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL;
    const title = process.env.OPENROUTER_APP_NAME ?? "ReviewFlow";
    if (referer) extraHeaders["HTTP-Referer"] = referer;
    if (title) extraHeaders["X-OpenRouter-Title"] = title;
  }

  return {
    apiKey,
    baseUrl,
    model,
    provider: usesOpenRouter ? "openrouter" : "openai-compatible",
    extraHeaders
  };
}

function parseReviewOptions(content: string, requestedCount: number) {
  const cleaned = content
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const parsed = tryParseJson(cleaned);
  const rawOptions = extractOptions(parsed) ?? splitPlainTextOptions(cleaned);
  const unique = new Set<string>();

  for (const option of rawOptions) {
    const normalized = option.replace(/\s+/g, " ").trim();
    if (normalized.length >= 10) unique.add(normalized);
  }

  return [...unique].slice(0, requestedCount);
}

function tryParseJson(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function extractOptions(parsed: unknown) {
  if (Array.isArray(parsed)) return parsed.filter((item): item is string => typeof item === "string");
  if (!parsed || typeof parsed !== "object") return null;
  const record = parsed as Record<string, unknown>;
  const options = record.reviews ?? record.drafts ?? record.options;
  return Array.isArray(options) ? options.filter((item): item is string => typeof item === "string") : null;
}

function splitPlainTextOptions(content: string) {
  const lines = content
    .split(/\n+/)
    .map((line) => line.replace(/^\s*(?:[-*]|\d+[.)])\s*/, "").trim())
    .filter(Boolean);

  return lines.length > 1 ? lines : [content];
}

function estimateTokens(text: string) {
  return Math.ceil(text.length / 4);
}

function estimateCost(_model: string, inputTokens: number, outputTokens: number) {
  return Number(((inputTokens / 1_000_000) * 0.15 + (outputTokens / 1_000_000) * 0.6).toFixed(6));
}
