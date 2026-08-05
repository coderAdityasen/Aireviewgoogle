import { subDays } from "date-fns";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeConversionRate, emptyEventCounts, type EventCount } from "@/lib/analytics/metrics";
import type { AnalyticsEventType } from "@/types/database";

const ADMIN_EVENT_TYPES: AnalyticsEventType[] = [
  "qr_scan",
  "page_view",
  "feedback_started",
  "feedback_completed",
  "review_generated",
  "review_edited",
  "review_copied",
  "google_redirect_clicked",
  "private_feedback_submitted"
];

/** Cap AI log pages so a pathological table cannot OOM the admin request. */
const AI_USAGE_PAGE_SIZE = 1000;
const AI_USAGE_MAX_PAGES = 20;

async function countEventsByType(since: string): Promise<EventCount> {
  const admin = createAdminClient();
  const counts = emptyEventCounts();

  const results = await Promise.all(
    ADMIN_EVENT_TYPES.map(async (eventType) => {
      const { count, error } = await admin
        .from("analytics_events")
        .select("id", { count: "exact", head: true })
        .eq("event_type", eventType)
        .gte("created_at", since);
      if (error) throw error;
      return [eventType, count ?? 0] as const;
    })
  );

  for (const [eventType, count] of results) {
    counts[eventType] = count;
  }
  return counts;
}

async function sumAiUsage(since: string) {
  const admin = createAdminClient();
  let aiCost = 0;
  let aiTokens = 0;

  for (let page = 0; page < AI_USAGE_MAX_PAGES; page += 1) {
    const from = page * AI_USAGE_PAGE_SIZE;
    const to = from + AI_USAGE_PAGE_SIZE - 1;
    const { data, error } = await admin
      .from("ai_usage_logs")
      .select("input_tokens, output_tokens, estimated_cost")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .range(from, to);
    if (error) throw error;
    if (!data?.length) break;

    for (const row of data) {
      aiCost += Number(row.estimated_cost ?? 0);
      aiTokens += (row.input_tokens ?? 0) + (row.output_tokens ?? 0);
    }
    if (data.length < AI_USAGE_PAGE_SIZE) break;
  }

  return { aiCost, aiTokens };
}

export async function getAdminOverview() {
  const admin = createAdminClient();
  const since = subDays(new Date(), 30).toISOString();

  const [profiles, businesses, counts, sessionsCount, feedback, aiUsage] = await Promise.all([
    admin
      .from("profiles")
      .select("id, full_name, role, account_status, created_at, last_activity_at")
      .order("created_at", { ascending: false }),
    admin
      .from("businesses")
      .select("id, name, category, is_active, created_at")
      .order("created_at", { ascending: false }),
    countEventsByType(since),
    admin
      .from("visitor_sessions")
      .select("id", { count: "exact", head: true })
      .gte("last_seen_at", since),
    admin
      .from("customer_feedback")
      .select("id, rating, original_notes, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
    sumAiUsage(since)
  ]);

  if (profiles.error) throw profiles.error;
  if (businesses.error) throw businesses.error;
  if (sessionsCount.error) throw sessionsCount.error;
  if (feedback.error) throw feedback.error;

  return {
    owners: profiles.data ?? [],
    businesses: businesses.data ?? [],
    counts,
    uniqueVisitors: sessionsCount.count ?? 0,
    recentFeedback: feedback.data ?? [],
    aiCost: aiUsage.aiCost,
    aiTokens: aiUsage.aiTokens,
    scanToRedirect: computeConversionRate(counts.google_redirect_clicked, counts.qr_scan)
  };
}

export async function getAdminOwners() {
  const admin = createAdminClient();
  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, full_name, role, account_status, created_at, last_activity_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const { data: authUsers } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const emailById = new Map(authUsers.users.map((user) => [user.id, user.email ?? ""]));
  const { data: subscriptions } = await admin
    .from("subscriptions")
    .select("owner_id, plan_key, status, access_until, current_period_end");
  const subscriptionByOwner = new Map(
    (subscriptions ?? []).map((subscription) => [subscription.owner_id, subscription])
  );
  return profiles.map((profile) => ({
    ...profile,
    email: emailById.get(profile.id) ?? "",
    subscription: subscriptionByOwner.get(profile.id) ?? null
  }));
}

export async function getAdminBusinesses(q?: string) {
  const admin = createAdminClient();
  let query = admin
    .from("businesses")
    .select(
      "id, owner_id, name, category, phone, website, google_review_url, experience_tags, low_rating_support_message, contact_fields, is_active, created_at, profiles(full_name, account_status)"
    )
    .order("created_at", { ascending: false });
  if (q) query = query.or(`name.ilike.%${q}%,category.ilike.%${q}%`);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}
