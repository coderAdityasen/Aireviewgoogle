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
  /** Full attribution line (plain text — posters / canvas). */
  poweredBy: "Powered by ADS N GROW MEDIA HOUSE",
  /** Company name without the "Powered by" prefix. */
  poweredByCompany: "ADS N GROW MEDIA HOUSE",
  /** Public website — use for clickable attribution. */
  poweredByUrl: "https://www.adsngrow.in",
  neverPosts: "ReviewFlow never posts a review for you.",
  description:
    "Collect genuine customer feedback through QR-powered review flows.",
} as const;
