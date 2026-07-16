import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { detectDeviceType, getClientIp, getOrCreateAnonymousId, hashIp } from "@/lib/security/ip";
import type { AnalyticsEventType, Business, QrCampaign } from "@/types/database";
import { hasPaidAccess } from "@/lib/billing/entitlements";

export async function getPublicBusiness(slug: string, campaignToken?: string | null) {
  const admin = createAdminClient();
  const { data: business, error } = await admin
    .from("businesses")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  if (!business) return { business: null, campaign: null };
  if (!(await hasPaidAccess(business.owner_id))) return { business: null, campaign: null, unavailableBusiness: true };

  let campaign: QrCampaign | null = null;
  if (campaignToken) {
    const { data } = await admin
      .from("qr_campaigns")
      .select("*")
      .eq("business_id", business.id)
      .eq("public_token", campaignToken)
      .maybeSingle();
    if (!data || !data.is_active) return { business: business as Business, campaign: null, unavailableCampaign: true };
    campaign = data;
  }

  return { business: business as Business, campaign };
}

export async function createVisitorSessionForRequest(
  request: NextRequest,
  input: { businessId: string; campaignId?: string | null }
) {
  const admin = createAdminClient();
  const cookieStore = await cookies();
  const anonymousId = getOrCreateAnonymousId(cookieStore.get("rf_session")?.value);
  const ip = getClientIp(request);
  const ipHash = hashIp(ip);
  const userAgent = request.headers.get("user-agent");

  const { data: existing } = await admin
    .from("visitor_sessions")
    .select("*")
    .eq("business_id", input.businessId)
    .eq("anonymous_session_id", anonymousId)
    .maybeSingle();

  if (existing) {
    await admin
      .from("visitor_sessions")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", existing.id);
    return { session: existing, anonymousId, ipHash };
  }

  const { data: session, error } = await admin
    .from("visitor_sessions")
    .insert({
      business_id: input.businessId,
      qr_campaign_id: input.campaignId ?? null,
      anonymous_session_id: anonymousId,
      ip_hash: ipHash,
      user_agent: userAgent,
      device_type: detectDeviceType(userAgent),
      referrer: request.headers.get("referer")
    })
    .select("*")
    .single();

  if (error) throw error;
  return { session, anonymousId, ipHash };
}

export async function recordEvent(input: {
  businessId: string;
  campaignId?: string | null;
  visitorSessionId?: string | null;
  eventType: AnalyticsEventType;
  metadata?: Record<string, unknown>;
}) {
  const admin = createAdminClient();
  await admin.from("analytics_events").insert({
    business_id: input.businessId,
    qr_campaign_id: input.campaignId ?? null,
    visitor_session_id: input.visitorSessionId ?? null,
    event_type: input.eventType,
    metadata: (input.metadata ?? {}) as never
  });
}
