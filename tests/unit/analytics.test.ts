import { describe, expect, it } from "vitest";
import { computeConversionRate, summarizeEvents } from "@/lib/analytics/metrics";

describe("analytics metrics", () => {
  it("calculates conversion rates", () => {
    expect(computeConversionRate(5, 10)).toBe(50);
    expect(computeConversionRate(1, 3)).toBe(33.3);
    expect(computeConversionRate(1, 0)).toBe(0);
  });

  it("summarizes supported events", () => {
    const counts = summarizeEvents([
      { event_type: "qr_scan" },
      { event_type: "review_copied" },
      { event_type: "review_copied" },
      { event_type: "google_redirect_clicked" }
    ]);
    expect(counts.qr_scan).toBe(1);
    expect(counts.review_copied).toBe(2);
    expect(counts.google_redirect_clicked).toBe(1);
  });
});
