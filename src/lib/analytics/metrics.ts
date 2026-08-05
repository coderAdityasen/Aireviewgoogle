import type { AnalyticsEventType } from "@/types/database";

export type EventCount = Record<AnalyticsEventType, number>;

export function emptyEventCounts(): EventCount {
  return {
    qr_scan: 0,
    page_view: 0,
    feedback_started: 0,
    feedback_completed: 0,
    review_generated: 0,
    review_edited: 0,
    review_copied: 0,
    google_redirect_clicked: 0,
    private_feedback_submitted: 0
  };
}

export function computeConversionRate(numerator: number, denominator: number) {
  if (!denominator) return 0;
  return Number(((numerator / denominator) * 100).toFixed(1));
}

export function summarizeEvents(events: Array<{ event_type: AnalyticsEventType }>) {
  return events.reduce((acc, event) => {
    acc[event.event_type] = (acc[event.event_type] ?? 0) + 1;
    return acc;
  }, emptyEventCounts());
}
