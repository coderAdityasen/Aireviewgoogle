/**
 * Shared AI provider config + completion helper.
 * Priority: Gemini (Studio key) → OpenRouter → OpenAI-compatible → none.
 */

export type AiProviderKind = "gemini" | "openrouter" | "openai-compatible" | "none";

export type AiProviderConfig = {
  apiKey: string;
  model: string;
  provider: AiProviderKind;
  /** Chat-completions style URL (OpenRouter / OpenAI). Empty for Gemini. */
  baseUrl: string;
  extraHeaders: Record<string, string>;
};

export function getAiProviderConfig(): AiProviderConfig {
  // 1) Google AI Studio / Gemini direct
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (geminiKey) {
    const model =
      process.env.GEMINI_MODEL?.trim() ||
      process.env.AI_MODEL?.trim() ||
      "gemini-2.0-flash";
    return {
      apiKey: geminiKey,
      model,
      provider: "gemini",
      baseUrl: "",
      extraHeaders: {},
    };
  }

  // 2) OpenRouter
  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();
  if (openRouterKey) {
    const model = process.env.OPENROUTER_MODEL?.trim() || process.env.AI_MODEL?.trim() || "";
    if (!model) {
      throw new Error("OPENROUTER_MODEL (or AI_MODEL) is required when OPENROUTER_API_KEY is set.");
    }
    const extraHeaders: Record<string, string> = {};
    const referer = process.env.OPENROUTER_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL;
    const title = process.env.OPENROUTER_APP_NAME ?? "ReviewFlow";
    if (referer) extraHeaders["HTTP-Referer"] = referer;
    if (title) extraHeaders["X-OpenRouter-Title"] = title;
    return {
      apiKey: openRouterKey,
      model,
      provider: "openrouter",
      baseUrl:
        process.env.OPENROUTER_BASE_URL?.trim() ||
        "https://openrouter.ai/api/v1/chat/completions",
      extraHeaders,
    };
  }

  // 3) Generic OpenAI-compatible
  const apiKey = process.env.AI_PROVIDER_API_KEY?.trim() || "";
  const model = process.env.AI_MODEL?.trim() || "";
  if (apiKey && !model) {
    throw new Error("AI_MODEL is required when AI_PROVIDER_API_KEY is set.");
  }
  return {
    apiKey,
    model,
    provider: apiKey ? "openai-compatible" : "none",
    baseUrl:
      process.env.AI_PROVIDER_BASE_URL?.trim() ||
      "https://api.openai.com/v1/chat/completions",
    extraHeaders: {},
  };
}

export type ChatCompletionInput = {
  systemParts: string[];
  userText: string;
  temperature: number;
  maxTokens: number;
  /** Prefer JSON object response when the provider supports it. */
  jsonMode?: boolean;
};

export type ChatCompletionResult = {
  content: string;
  inputTokens?: number;
  outputTokens?: number;
  estimatedCost?: number;
};

/**
 * Run a single chat completion against the configured provider.
 */
export async function runChatCompletion(
  config: AiProviderConfig,
  input: ChatCompletionInput,
): Promise<ChatCompletionResult> {
  if (config.provider === "none" || !config.apiKey) {
    throw new Error("No AI provider API key configured.");
  }

  if (config.provider === "gemini") {
    return runGeminiCompletion(config, input);
  }

  return runOpenAiCompatibleCompletion(config, input);
}

async function runGeminiCompletion(
  config: AiProviderConfig,
  input: ChatCompletionInput,
): Promise<ChatCompletionResult> {
  const model = config.model;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(config.apiKey)}`;

  const systemText = input.systemParts.filter(Boolean).join("\n\n");
  const body: Record<string, unknown> = {
    contents: [
      {
        role: "user",
        parts: [{ text: input.userText }],
      },
    ],
    generationConfig: {
      temperature: input.temperature,
      maxOutputTokens: input.maxTokens,
      ...(input.jsonMode ? { responseMimeType: "application/json" } : {}),
    },
  };
  if (systemText) {
    body.systemInstruction = {
      parts: [{ text: systemText }],
    };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      `Gemini request failed (${response.status}): ${errorBody.slice(0, 400)}`,
    );
  }

  const json = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
    usageMetadata?: {
      promptTokenCount?: number;
      candidatesTokenCount?: number;
      totalTokenCount?: number;
    };
  };

  const content =
    json.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? "")
      .join("")
      .trim() ?? "";

  if (!content) {
    throw new Error("Gemini returned an empty response.");
  }

  const inputTokens = json.usageMetadata?.promptTokenCount;
  const outputTokens = json.usageMetadata?.candidatesTokenCount;

  return {
    content,
    inputTokens,
    outputTokens,
    estimatedCost: undefined,
  };
}

async function runOpenAiCompatibleCompletion(
  config: AiProviderConfig,
  input: ChatCompletionInput,
): Promise<ChatCompletionResult> {
  const messages: Array<{ role: string; content: string }> = [
    ...input.systemParts.filter(Boolean).map((content) => ({
      role: "system" as const,
      content,
    })),
    { role: "user", content: input.userText },
  ];

  const response = await fetch(config.baseUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
      ...config.extraHeaders,
    },
    body: JSON.stringify({
      model: config.model,
      temperature: input.temperature,
      max_tokens: input.maxTokens,
      ...(input.jsonMode ? { response_format: { type: "json_object" } } : {}),
      ...(config.provider === "openrouter" &&
      process.env.OPENROUTER_DATA_COLLECTION === "deny"
        ? { provider: { data_collection: "deny" } }
        : {}),
      messages,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      `AI provider returned ${response.status}: ${errorBody.slice(0, 400)}`,
    );
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      cost?: number;
    };
  };

  const content = json.choices?.[0]?.message?.content?.trim() ?? "";
  if (!content) {
    throw new Error("AI provider returned an empty draft.");
  }

  return {
    content,
    inputTokens: json.usage?.prompt_tokens,
    outputTokens: json.usage?.completion_tokens,
    estimatedCost:
      typeof json.usage?.cost === "number"
        ? Number(json.usage.cost.toFixed(6))
        : undefined,
  };
}
