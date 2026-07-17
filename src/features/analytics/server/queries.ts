import { subDays } from "date-fns";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { computeConversionRate } from "@/lib/analytics/metrics";
import { getOwnerBusiness } from "@/features/businesses/server/queries";

const eventTypes = [
  "qr_scan",
  "page_view",
  "feedback_started",
  "feedback_completed",
  "review_generated",
  "review_edited",
  "review_copied",
  "google_redirect_clicked",
  "private_feedback_submitted"
] as const;

const summarySchema = z.object({
  businesses: z.array(z.object({ id: z.string(), name: z.string(), is_active: z.boolean() })),
  counts: z.object(Object.fromEntries(eventTypes.map((eventType) => [eventType, z.number()])) as Record<(typeof eventTypes)[number], z.ZodNumber>),
  unique_visitors: z.number(),
  average_rating: z.number(),
  private_feedback_count: z.number(),
  activity: z.array(z.object({ day: z.string(), scans: z.number(), redirects: z.number() })),
  by_device: z.array(z.object({ device: z.string(), count: z.number() }))
});

export async function getOwnerDashboardMetrics(days = 14) {
  const supabase = await createClient();
  const since = subDays(new Date(), days).toISOString();
  const [{ data, error }, { data: recentData, error: recentError }] = await Promise.all([
    supabase.rpc("get_owner_analytics_summary", { p_since: since, p_business_id: null, p_days: days }),
    supabase.from("analytics_events").select("event_type, created_at, businesses(name)").order("created_at", { ascending: false }).limit(8)
  ]);
  if (error) throw error;
  if (recentError) throw recentError;

  const summary = summarySchema.parse(data);
  const counts = summary.counts;
  return {
    businesses: summary.businesses,
    counts,
    uniqueVisitors: summary.unique_visitors,
    conversion: computeConversionRate(counts.google_redirect_clicked, counts.qr_scan),
    activity: summary.activity,
    averageRating: summary.average_rating,
    privateFeedbackCount: summary.private_feedback_count,
    recentActivity: ((recentData ?? []) as Array<{ event_type: string; created_at: string; businesses?: { name?: string } | Array<{ name?: string }> }>).map((event) => ({
      eventType: event.event_type,
      createdAt: event.created_at,
      businessName: Array.isArray(event.businesses) ? event.businesses[0]?.name ?? "Location" : event.businesses?.name ?? "Location"
    }))
  };
}

export async function getBusinessAnalytics(businessId: string, days = 30) {
  await getOwnerBusiness(businessId);
  const supabase = await createClient();
  const since = subDays(new Date(), days).toISOString();
  const { data, error } = await supabase.rpc("get_owner_analytics_summary", { p_since: since, p_business_id: businessId, p_days: days });
  if (error) throw error;

  const summary = summarySchema.parse(data);
  const counts = summary.counts;
  return {
    counts,
    uniqueVisitors: summary.unique_visitors,
    averageRating: summary.average_rating,
    privateFeedbackCount: summary.private_feedback_count,
    scanToCopy: computeConversionRate(counts.review_copied, counts.qr_scan),
    scanToRedirect: computeConversionRate(counts.google_redirect_clicked, counts.qr_scan),
    copyToRedirect: computeConversionRate(counts.google_redirect_clicked, counts.review_copied),
    activity: summary.activity,
    byDevice: summary.by_device
  };
}
