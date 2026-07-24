import "server-only";

export type GmbSuggestion = {
  id: string;
  category:
    | "profile_completeness"
    | "photos"
    | "categories"
    | "posts"
    | "reviews"
    | "hours"
    | "local_seo"
    | "engagement";
  title: string;
  impact: "high" | "medium" | "low";
  detail: string;
  action: string;
};

export type GmbProfileInput = {
  name: string;
  category: string;
  description?: string | null;
  services?: string[] | string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  addressLine?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  googleReviewUrl?: string | null;
};

const SYSTEM_PROMPT = `You are a Google Business Profile (GMB) optimization expert for local businesses.
Given a business profile snapshot from ReviewFlow, return practical, specific profile improvement suggestions.

Rules:
- Focus on Google Business Profile / Maps listing quality, not generic marketing fluff.
- Be concrete and actionable for a small local team.
- Do not invent claims about the business that are not supported by the input (e.g. do not invent awards or hours).
- Prefer 5–7 high-value suggestions ordered by impact.
- Return JSON only with this shape:
{
  "suggestions": [
    {
      "category": "profile_completeness" | "photos" | "categories" | "posts" | "reviews" | "hours" | "local_seo" | "engagement",
      "title": "short title",
      "impact": "high" | "medium" | "low",
      "detail": "why this matters",
      "action": "what to do next in Google Business Profile"
    }
  ]
}`;

export async function generateGmbSuggestions(input: GmbProfileInput): Promise<{
  suggestions: GmbSuggestion[];
  provider: string;
  model: string;
}> {
  const profileText = formatProfile(input);
  const config = getAiProviderConfig();

  if (!config.apiKey || !config.model) {
    return {
      suggestions: fallbackSuggestions(input),
      provider: "local-fallback",
      model: "gmb-heuristics",
    };
  }

  try {
    const response = await fetch(config.baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        ...config.extraHeaders,
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.35,
        max_tokens: 1200,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Analyze this Google Business Profile-related snapshot and suggest improvements:\n\n${profileText}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`AI provider returned ${response.status}`);
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("Empty AI response");

    const parsed = parseSuggestions(content);
    if (!parsed.length) throw new Error("No suggestions parsed");

    return {
      suggestions: parsed,
      provider: config.provider,
      model: config.model,
    };
  } catch (error) {
    console.error("[gmb-ai] Falling back to heuristics", {
      reason: error instanceof Error ? error.message : "unknown",
    });
    return {
      suggestions: fallbackSuggestions(input),
      provider: "local-fallback",
      model: "gmb-heuristics",
    };
  }
}

function formatProfile(input: GmbProfileInput) {
  const services = Array.isArray(input.services)
    ? input.services.join(", ")
    : typeof input.services === "string"
      ? input.services
      : "";

  return [
    `Business name: ${input.name || "—"}`,
    `Primary category: ${input.category || "—"}`,
    `Description: ${input.description || "—"}`,
    `Services: ${services || "—"}`,
    `Phone: ${input.phone || "—"}`,
    `Email: ${input.email || "—"}`,
    `Website: ${input.website || "—"}`,
    `Address: ${[input.addressLine, input.city, input.state, input.country].filter(Boolean).join(", ") || "—"}`,
    `Google review URL configured: ${input.googleReviewUrl ? "yes" : "no"}`,
  ].join("\n");
}

function parseSuggestions(content: string): GmbSuggestion[] {
  const cleaned = content
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as {
      suggestions?: Array<Record<string, unknown>>;
    };
    const list = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
    return list
      .map((item, index) => normalizeSuggestion(item, index))
      .filter((item): item is GmbSuggestion => Boolean(item))
      .slice(0, 8);
  } catch {
    return [];
  }
}

function normalizeSuggestion(
  item: Record<string, unknown>,
  index: number,
): GmbSuggestion | null {
  const title = String(item.title ?? "").trim();
  const detail = String(item.detail ?? item.description ?? "").trim();
  const action = String(item.action ?? item.nextStep ?? "").trim();
  if (!title || !detail) return null;

  const impactRaw = String(item.impact ?? "medium").toLowerCase();
  const impact =
    impactRaw === "high" || impactRaw === "low" ? impactRaw : "medium";

  const categoryRaw = String(item.category ?? "profile_completeness");
  const allowed = new Set([
    "profile_completeness",
    "photos",
    "categories",
    "posts",
    "reviews",
    "hours",
    "local_seo",
    "engagement",
  ]);
  const category = (
    allowed.has(categoryRaw) ? categoryRaw : "profile_completeness"
  ) as GmbSuggestion["category"];

  return {
    id: `gmb-${index + 1}`,
    category,
    title,
    impact,
    detail,
    action: action || "Open Google Business Profile and complete this item.",
  };
}

function fallbackSuggestions(input: GmbProfileInput): GmbSuggestion[] {
  const suggestions: GmbSuggestion[] = [];
  let n = 0;
  const nextId = () => `gmb-f-${++n}`;

  if (!input.description || input.description.trim().length < 40) {
    suggestions.push({
      id: nextId(),
      category: "profile_completeness",
      title: "Write a fuller business description",
      impact: "high",
      detail:
        "Profiles with a clear, keyword-aware description rank better in local search and help customers understand what you offer.",
      action:
        "In Google Business Profile → Info, add a 250–750 character description covering category, area served, and standout services.",
    });
  }

  if (!input.phone) {
    suggestions.push({
      id: nextId(),
      category: "profile_completeness",
      title: "Add a public phone number",
      impact: "high",
      detail:
        "Missing contact details reduce trust and make it harder for Maps users to reach you.",
      action: "Add your primary business phone under Google Business Profile → Contact.",
    });
  }

  if (!input.website) {
    suggestions.push({
      id: nextId(),
      category: "local_seo",
      title: "Link your website",
      impact: "medium",
      detail:
        "A website link improves credibility and sends Maps traffic to bookings or menus.",
      action: "Add your website URL in Google Business Profile → Contact / Website.",
    });
  }

  if (!input.addressLine || !input.city) {
    suggestions.push({
      id: nextId(),
      category: "profile_completeness",
      title: "Complete your service address",
      impact: "high",
      detail:
        "Incomplete address data weakens map placement and “near me” visibility.",
      action:
        "Verify street, city, and pin location on the map so customers navigate to the right place.",
    });
  }

  const services = Array.isArray(input.services)
    ? input.services
    : typeof input.services === "string"
      ? input.services.split(/[\n,]/).map((s) => s.trim()).filter(Boolean)
      : [];

  if (services.length < 3) {
    suggestions.push({
      id: nextId(),
      category: "categories",
      title: "Expand services and categories",
      impact: "high",
      detail:
        "Service items and secondary categories help Google match you for more relevant searches.",
      action:
        "Add 5–10 concrete services and review primary/secondary categories for accuracy.",
    });
  }

  suggestions.push(
    {
      id: nextId(),
      category: "photos",
      title: "Publish fresh photos weekly",
      impact: "high",
      detail:
        "Active photo updates correlate with higher engagement and conversion on Maps listings.",
      action:
        "Upload exterior, interior, team, and product/service photos; keep the cover image current.",
    },
    {
      id: nextId(),
      category: "posts",
      title: "Post offers or updates regularly",
      impact: "medium",
      detail:
        "Google Posts keep the listing looking active and can highlight seasonal offers.",
      action:
        "Create a short Post (offer, event, or update) at least twice a month from the Profile dashboard.",
    },
    {
      id: nextId(),
      category: "reviews",
      title: "Respond to every recent review",
      impact: "high",
      detail:
        "Owner replies show engagement and help future customers trust the business.",
      action:
        "Reply to new Google reviews within 48 hours with specific, professional responses.",
    },
    {
      id: nextId(),
      category: "hours",
      title: "Keep hours and special hours accurate",
      impact: "medium",
      detail:
        "Wrong hours create bad experiences and can lower ranking signals over time.",
      action:
        "Review regular hours and set holiday / special hours before closures.",
    },
  );

  if (input.googleReviewUrl) {
    suggestions.push({
      id: nextId(),
      category: "engagement",
      title: "Route more happy customers to your review link",
      impact: "high",
      detail:
        "You already have a review destination configured in ReviewFlow—use it consistently at high-satisfaction moments.",
      action:
        "Share your ReviewFlow QR after positive visits so 4–5★ feedback reaches Google.",
    });
  }

  return suggestions.slice(0, 7);
}

export type GmbImpactReport = {
  summary: string;
  timeframe: string;
  metrics: Array<{
    label: string;
    before: string;
    after: string;
    change: string;
  }>;
  growthHighlights: string[];
  specialistFocus: string[];
};

const IMPACT_SYSTEM_PROMPT = `You are a local SEO analyst. Given a business profile and a list of Google Business Profile improvement suggestions, forecast realistic impact and growth IF those changes are fully implemented by a specialist.

Rules:
- Be optimistic but realistic for a local small business (no impossible claims).
- Do not invent historical stats as fact; frame as projected ranges.
- Return JSON only:
{
  "summary": "2-3 sentence overview",
  "timeframe": "e.g. 60–90 days",
  "metrics": [
    { "label": "Maps discovery", "before": "…", "after": "…", "change": "+X–Y%" }
  ],
  "growthHighlights": ["bullet", "bullet"],
  "specialistFocus": ["what a GMB specialist would execute first", "…"]
}
Provide 3–5 metrics and 3–5 growthHighlights and 3–5 specialistFocus items.`;

export async function generateGmbImpactReport(input: {
  profile: GmbProfileInput;
  suggestions: GmbSuggestion[];
}): Promise<{ report: GmbImpactReport; provider: string; model: string }> {
  const config = getAiProviderConfig();
  const suggestionText = input.suggestions
    .map(
      (s, i) =>
        `${i + 1}. [${s.impact}] ${s.title} — ${s.detail} Next: ${s.action}`,
    )
    .join("\n");

  if (!config.apiKey || !config.model) {
    return {
      report: fallbackImpactReport(input.suggestions),
      provider: "local-fallback",
      model: "gmb-impact-heuristics",
    };
  }

  try {
    const response = await fetch(config.baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        ...config.extraHeaders,
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.4,
        max_tokens: 1100,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: IMPACT_SYSTEM_PROMPT },
          {
            role: "user",
            content: `Business:\n${formatProfile(input.profile)}\n\nSuggestions to implement:\n${suggestionText}`,
          },
        ],
      }),
    });

    if (!response.ok) throw new Error(`AI provider returned ${response.status}`);
    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("Empty AI response");
    const report = parseImpactReport(content);
    if (!report) throw new Error("Could not parse impact report");
    return { report, provider: config.provider, model: config.model };
  } catch (error) {
    console.error("[gmb-ai] impact fallback", {
      reason: error instanceof Error ? error.message : "unknown",
    });
    return {
      report: fallbackImpactReport(input.suggestions),
      provider: "local-fallback",
      model: "gmb-impact-heuristics",
    };
  }
}

function parseImpactReport(content: string): GmbImpactReport | null {
  const cleaned = content
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  try {
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    const summary = String(parsed.summary ?? "").trim();
    if (!summary) return null;
    const metricsRaw = Array.isArray(parsed.metrics) ? parsed.metrics : [];
    const metrics = metricsRaw
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const row = item as Record<string, unknown>;
        const label = String(row.label ?? "").trim();
        if (!label) return null;
        return {
          label,
          before: String(row.before ?? "—"),
          after: String(row.after ?? "—"),
          change: String(row.change ?? "—"),
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .slice(0, 6);

    const growthHighlights = Array.isArray(parsed.growthHighlights)
      ? parsed.growthHighlights.map((x) => String(x).trim()).filter(Boolean).slice(0, 6)
      : [];
    const specialistFocus = Array.isArray(parsed.specialistFocus)
      ? parsed.specialistFocus.map((x) => String(x).trim()).filter(Boolean).slice(0, 6)
      : [];

    return {
      summary,
      timeframe: String(parsed.timeframe ?? "60–90 days"),
      metrics,
      growthHighlights,
      specialistFocus,
    };
  } catch {
    return null;
  }
}

function fallbackImpactReport(suggestions: GmbSuggestion[]): GmbImpactReport {
  const high = suggestions.filter((s) => s.impact === "high").length;
  return {
    summary:
      "Implementing these Google Business Profile improvements can strengthen local visibility, trust, and conversion. A specialist typically sequences high-impact profile and review work first, then photos, posts, and ongoing engagement.",
    timeframe: "60–90 days",
    metrics: [
      {
        label: "Maps discovery",
        before: "Baseline local visibility",
        after: "Stronger category + map pack presence",
        change: high >= 2 ? "+15–35%" : "+10–25%",
      },
      {
        label: "Profile engagement",
        before: "Occasional profile actions",
        after: "More calls, direction requests, and website clicks",
        change: "+12–30%",
      },
      {
        label: "Review velocity",
        before: "Inconsistent new reviews",
        after: "Steadier 4–5★ flow with owner replies",
        change: "+20–40%",
      },
      {
        label: "Listing completeness",
        before: "Partial profile signals",
        after: "Complete info, media, and categories",
        change: "High lift",
      },
    ],
    growthHighlights: [
      "Clearer first impression on Maps and Search",
      "Better match for relevant local queries",
      "Higher trust from fresh photos and review replies",
      "More customers taking action (call / directions / site)",
    ],
    specialistFocus: suggestions.slice(0, 5).map((s) => s.title),
  };
}

function getAiProviderConfig() {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const apiKey = openRouterKey ?? process.env.AI_PROVIDER_API_KEY;
  const usesOpenRouter = Boolean(openRouterKey);
  const baseUrl =
    process.env.OPENROUTER_BASE_URL ??
    (usesOpenRouter
      ? "https://openrouter.ai/api/v1/chat/completions"
      : (process.env.AI_PROVIDER_BASE_URL ??
        "https://api.openai.com/v1/chat/completions"));
  const model = process.env.OPENROUTER_MODEL ?? process.env.AI_MODEL ?? "";
  const extraHeaders: Record<string, string> = {};

  if (usesOpenRouter) {
    const referer =
      process.env.OPENROUTER_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL;
    const title = process.env.OPENROUTER_APP_NAME ?? "ReviewFlow";
    if (referer) extraHeaders["HTTP-Referer"] = referer;
    if (title) extraHeaders["X-OpenRouter-Title"] = title;
  }

  return {
    apiKey,
    baseUrl,
    model,
    provider: usesOpenRouter ? "openrouter" : "openai-compatible",
    extraHeaders,
  };
}
