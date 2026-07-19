export const RATING_VALUES = [1, 2, 3, 4, 5] as const;
export type RatingValue = (typeof RATING_VALUES)[number];
export type RatingTagMap = Partial<Record<RatingValue, string[]>>;

function cleanTags(value: unknown) {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean).slice(0, 20);
  if (typeof value === "string") return value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean).slice(0, 20);
  return [];
}

export function normalizeRatingTags(value: unknown): RatingTagMap {
  if (Array.isArray(value)) {
    const legacy = cleanTags(value);
    return Object.fromEntries(RATING_VALUES.map((rating) => [rating, legacy])) as RatingTagMap;
  }
  if (!value || typeof value !== "object") return {};
  const record = value as Record<string, unknown>;
  return Object.fromEntries(RATING_VALUES.map((rating) => [rating, cleanTags(record[String(rating)])])) as RatingTagMap;
}

export function ratingTagText(value: unknown, rating: RatingValue) {
  return (normalizeRatingTags(value)[rating] ?? []).join("\n");
}

export function ratingTagsFromFields(fields: Record<string, unknown>) {
  return Object.fromEntries(RATING_VALUES.map((rating) => [rating, cleanTags(fields[`ratingTags${rating}`])])) as RatingTagMap;
}

export function hasRatingTagFields(tags: RatingTagMap) {
  return RATING_VALUES.some((rating) => (tags[rating] ?? []).length > 0);
}
