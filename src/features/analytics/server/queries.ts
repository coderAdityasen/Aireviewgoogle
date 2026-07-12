import { format, subDays } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { computeConversionRate, summarizeEvents } from "@/lib/analytics/metrics";
import { getOwnerBusiness } from "@/features/businesses/server/queries";

export async function getOwnerDashboardMetrics() {
  const supabase = await createClient();
  const { data: businesses, error: businessError } = await supabase.from("businesses").select("id, name, is_active");
  if (businessError) throw businessError;

  const businessIds = (businesses ?? []).map((business) => business.id);
  if (!businessIds.length) {
    return {
      businesses: businesses ?? [],
      counts: summarizeEvents([]),
      uniqueVisitors: 0,
      conversion: 0,
      activity: buildActivity([])
    };
  }

  const since = subDays(new Date(), 30).toISOString();
  const [{ data: events, error: eventsError }, { data: sessions, error: sessionsError }] = await Promise.all([
    supabase.from("analytics_events").select("event_type, created_at, business_id").in("business_id", businessIds).gte("created_at", since),
    supabase.from("visitor_sessions").select("id, business_id").in("business_id", businessIds)
  ]);
  if (eventsError) throw eventsError;
  if (sessionsError) throw sessionsError;

  const counts = summarizeEvents(events ?? []);
  return {
    businesses: businesses ?? [],
    counts,
    uniqueVisitors: sessions?.length ?? 0,
    conversion: computeConversionRate(counts.google_redirect_clicked, counts.qr_scan),
    activity: buildActivity(events ?? [])
  };
}

export async function getBusinessAnalytics(businessId: string) {
  await getOwnerBusiness(businessId);
  const supabase = await createClient();
  const since = subDays(new Date(), 30).toISOString();
  const [{ data: events, error: eventsError }, { data: sessions }, { data: feedback }] = await Promise.all([
    supabase.from("analytics_events").select("event_type, created_at, metadata").eq("business_id", businessId).gte("created_at", since),
    supabase.from("visitor_sessions").select("id, device_type, qr_campaign_id").eq("business_id", businessId),
    supabase.from("customer_feedback").select("rating, submitted_privately").eq("business_id", businessId)
  ]);
  if (eventsError) throw eventsError;
  const counts = summarizeEvents(events ?? []);
  const avgRating = feedback?.length
    ? Number((feedback.reduce((sum, row) => sum + row.rating, 0) / feedback.length).toFixed(1))
    : 0;

  return {
    counts,
    uniqueVisitors: sessions?.length ?? 0,
    averageRating: avgRating,
    privateFeedbackCount: feedback?.filter((row) => row.submitted_privately).length ?? 0,
    scanToCopy: computeConversionRate(counts.review_copied, counts.qr_scan),
    scanToRedirect: computeConversionRate(counts.google_redirect_clicked, counts.qr_scan),
    copyToRedirect: computeConversionRate(counts.google_redirect_clicked, counts.review_copied),
    activity: buildActivity(events ?? []),
    byDevice: Object.entries(
      (sessions ?? []).reduce<Record<string, number>>((acc, row) => {
        const key = row.device_type ?? "unknown";
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {})
    ).map(([device, count]) => ({ device, count }))
  };
}

function buildActivity(events: Array<{ event_type: string; created_at: string }>) {
  const days = Array.from({ length: 14 }, (_, index) => {
    const day = format(subDays(new Date(), 13 - index), "yyyy-MM-dd");
    return { day, scans: 0, redirects: 0 };
  });
  const byDay = new Map(days.map((day) => [day.day, day]));
  events.forEach((event) => {
    const day = event.created_at.slice(0, 10);
    const bucket = byDay.get(day);
    if (!bucket) return;
    if (event.event_type === "qr_scan") bucket.scans += 1;
    if (event.event_type === "google_redirect_clicked") bucket.redirects += 1;
  });
  return days;
}
