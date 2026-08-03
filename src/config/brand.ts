/**
 * Product brand (app name) vs attribution line.
 * Only use `poweredBy` for "Powered by …" footers / posters.
 */
export const BRAND = {
  /** App product name shown in UI */
  name: "ReviewFlow",
  /** Short mark for logos / avatars */
  initial: "R",
  /** Lowercase slug for files */
  slug: "reviewflow",
  /** Attribution only — auth, marketing footers, posters, public QR. */
  poweredBy: "Powered by ADS N GROW media",
  /** Company name without the "Powered by" prefix (posters that compose their own line). */
  poweredByCompany: "ADS N GROW media",
  neverPosts: "ReviewFlow never posts a review for you.",
  description:
    "Collect genuine customer feedback through QR-powered review flows.",
} as const;
