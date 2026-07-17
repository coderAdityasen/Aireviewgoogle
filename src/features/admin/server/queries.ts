import { subDays } from "date-fns";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeConversionRate, summarizeEvents } from "@/lib/analytics/metrics";

export async function getAdminOverview() {
  const admin = createAdminClient();
  const since = subDays(new Date(), 30).toISOString();
  const [profiles, businesses, events, sessions, feedback, aiUsage] = await Promise.all([
    admin.from("profiles").select("id, full_name, role, account_status, created_at, last_activity_at").order("created_at", { ascending: false }),
    admin.from("businesses").select("id, name, category, is_active, created_at").order("created_at", { ascending: false }),
    admin.from("analytics_events").select("event_type, created_at, business_id").gte("created_at", since),
    admin.from("visitor_sessions").select("id").gte("last_seen_at", since),
    admin.from("customer_feedback").select("id, rating, original_notes, created_at").order("created_at", { ascending: false }).limit(10),
    admin.from("ai_usage_logs").select("input_tokens, output_tokens, estimated_cost, status")
  ]);

  if (profiles.error) throw profiles.error;
  if (businesses.error) throw businesses.error;
  if (events.error) throw events.error;
  if (sessions.error) throw sessions.error;
  if (feedback.error) throw feedback.error;
  if (aiUsage.error) throw aiUsage.error;

  const counts = summarizeEvents(events.data ?? []);
  return {
    owners: profiles.data ?? [],
    businesses: businesses.data ?? [],
    events: events.data ?? [],
    counts,
    uniqueVisitors: sessions.data?.length ?? 0,
    recentFeedback: feedback.data ?? [],
    aiCost: (aiUsage.data ?? []).reduce((sum, row) => sum + Number(row.estimated_cost ?? 0), 0),
    aiTokens: (aiUsage.data ?? []).reduce((sum, row) => sum + row.input_tokens + row.output_tokens, 0),
    scanToRedirect: computeConversionRate(counts.google_redirect_clicked, counts.qr_scan)
  };
}

export async function getAdminOwners() {
  const admin = createAdminClient();
  const { data: profiles, error } = await admin.from("profiles").select("id, full_name, role, account_status, created_at, last_activity_at").order("created_at", { ascending: false });
  if (error) throw error;
  const { data: authUsers } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const emailById = new Map(authUsers.users.map((user) => [user.id, user.email ?? ""]));
  const { data: subscriptions } = await admin.from("subscriptions").select("owner_id, plan_key, status, access_until, current_period_end");
  const subscriptionByOwner = new Map((subscriptions ?? []).map((subscription) => [subscription.owner_id, subscription]));
  return profiles.map((profile) => ({ ...profile, email: emailById.get(profile.id) ?? "", subscription: subscriptionByOwner.get(profile.id) ?? null }));
}

export async function getAdminBusinesses(q?: string) {
  const admin = createAdminClient();
  let query = admin.from("businesses").select("id, owner_id, name, category, phone, website, google_review_url, is_active, created_at, profiles(full_name, account_status)").order("created_at", { ascending: false });
  if (q) query = query.or(`name.ilike.%${q}%,category.ilike.%${q}%`);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}
