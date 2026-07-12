import { describe, expect, it } from "vitest";
import { normalizeGoogleReviewUrl } from "@/lib/security/google-url";

describe("Google review URL validation", () => {
  it("accepts Google review and Maps destinations", () => {
    expect(normalizeGoogleReviewUrl("http://www.google.com/maps/place/test")).toMatch(/^https:\/\/www\.google\.com\/maps/);
    expect(normalizeGoogleReviewUrl("https://search.google.com/local/writereview?placeid=abc")).toContain(
      "https://search.google.com/local/writereview"
    );
    expect(normalizeGoogleReviewUrl("https://maps.app.goo.gl/example")).toBe("https://maps.app.goo.gl/example");
  });

  it("rejects unsafe or unrelated destinations", () => {
    expect(() => normalizeGoogleReviewUrl("javascript:alert(1)")).toThrow();
    expect(() => normalizeGoogleReviewUrl("https://google.com.evil.test/maps")).toThrow();
    expect(() => normalizeGoogleReviewUrl("https://example.com/maps")).toThrow();
  });
});
