const riskyGeneratedFacts = [
  /\b\d+\s*(minutes?|hours?|days?|weeks?)\b/i,
  /\$\s?\d+|\b\d+\s?(usd|dollars?|rupees?|inr)\b/i,
  /\b(discount|coupon|free|refund|manager|employee|staff|team|technician|driver|server|waiter|waitress)\b/i,
  /\b(highly recommend|would recommend to everyone|best .* ever)\b/i
];

function normalize(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
}

export function assertDraftGrounded(draft: string, sourceText: string, rating: number) {
  const normalizedSource = normalize(sourceText);

  for (const pattern of riskyGeneratedFacts) {
    const match = draft.match(pattern);
    if (match && !normalizedSource.includes(normalize(match[0]).trim())) {
      throw new Error("Draft introduced a fact not present in the customer input.");
    }
  }

  if (rating <= 2 && /\b(excellent|amazing|perfect|highly recommend|five stars)\b/i.test(draft)) {
    throw new Error("Draft sentiment does not preserve the low customer rating.");
  }

  return draft.trim();
}

export function fallbackGroundedDraft(input: {
  businessName: string;
  rating: number;
  answers: Record<string, string>;
  notes: string;
  length: "short" | "standard" | "detailed";
}) {
  const answerText = Object.values(input.answers)
    .map((value) => value.trim())
    .filter(Boolean)
    .join(" ");
  const source = [input.notes.trim(), answerText].filter(Boolean).join(" ");
  const base = source.replace(/\s+/g, " ").trim();
  const ratingLine = `I rated my experience with ${input.businessName} ${input.rating} out of 5.`;

  if (input.length === "short") {
    return `${ratingLine} ${base}`.slice(0, 500).trim();
  }

  if (input.length === "detailed") {
    return `${ratingLine} ${base}`.trim();
  }

  return `${ratingLine} ${base}`.slice(0, 900).trim();
}

export function fallbackGroundedDrafts(input: {
  businessName: string;
  rating: number;
  answers: Record<string, string>;
  notes: string;
  length: "short" | "standard" | "detailed";
  optionsCount: number;
}) {
  const answerText = Object.values(input.answers)
    .map((value) => value.trim())
    .filter(Boolean)
    .join(" ");
  const source = [input.notes.trim(), answerText].filter(Boolean).join(" ");
  const base = source.replace(/\s+/g, " ").trim();
  const options = [
    `I rated my experience with ${input.businessName} ${input.rating} out of 5. ${base}`,
    `My experience with ${input.businessName}: ${base} I would rate it ${input.rating} out of 5.`,
    `${base} Overall, my rating for ${input.businessName} is ${input.rating} out of 5.`
  ];
  const maxLength = input.length === "short" ? 500 : input.length === "detailed" ? 1600 : 900;

  return options.slice(0, input.optionsCount).map((option) => option.slice(0, maxLength).trim());
}
