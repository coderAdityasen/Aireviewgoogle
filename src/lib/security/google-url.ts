const GOOGLE_HOST_RE = /(^|\.)google\.(com|[a-z]{2}|com\.[a-z]{2}|co\.[a-z]{2})$/i;
const GOOGLE_MAPS_HOSTS = new Set(["maps.app.goo.gl", "g.page", "maps.google.com", "www.google.com", "google.com", "share.google"]);

export function normalizeGoogleReviewUrl(input: string) {
  const trimmed = input.trim();
  if (!trimmed) throw new Error("Google review URL is required.");

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error("Enter a valid Google review or Google Maps URL.");
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Only HTTPS Google review URLs are allowed.");
  }

  url.protocol = "https:";
  url.hash = "";

  const host = url.hostname.toLowerCase();
  const path = url.pathname.toLowerCase();
  const isGoogleHost = GOOGLE_HOST_RE.test(host) || GOOGLE_MAPS_HOSTS.has(host);
  const isAllowedGooglePath =
    path.startsWith("/maps") ||
    path.startsWith("/local/writereview") ||
    path.startsWith("/search") ||
    path.includes("/review") ||
    host === "maps.app.goo.gl" ||
    host === "g.page" ||
    host === "share.google";

  if (!isGoogleHost || !isAllowedGooglePath) {
    throw new Error("Only official Google review, Google Maps or Google Business Profile URLs are supported.");
  }

  url.username = "";
  url.password = "";
  return url.toString();
}

export function isSafeStoredGoogleUrl(input: string) {
  try {
    normalizeGoogleReviewUrl(input);
    return true;
  } catch {
    return false;
  }
}
