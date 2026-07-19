import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { requireActiveOwner } from "@/lib/auth/roles";

const BUSINESS_SUMMARY_COLUMNS = "id, owner_id, name, slug, category, logo_url, brand_color, poster_headline, poster_template, google_review_url, is_active, created_at, updated_at";
const BUSINESS_COLUMNS = "id, owner_id, name, slug, category, description, services, phone, email, website, address_line, city, state, country, logo_url, brand_color, google_review_url, default_language, experience_tags, low_rating_support_message, contact_fields, poster_headline, poster_template, is_active, created_at, updated_at";
const CAMPAIGN_COLUMNS = "id, business_id, name, public_token, is_active, created_at, updated_at";

export const getOwnerBusinesses = cache(async () => {
  const { user } = await requireActiveOwner();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("businesses")
    .select(BUSINESS_SUMMARY_COLUMNS)
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
});

export const getOwnerBusiness = cache(async (id: string) => {
  const { user } = await requireActiveOwner();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("businesses")
    .select(BUSINESS_COLUMNS)
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();
  if (error) throw error;
  return data;
});

export const getBusinessCampaigns = cache(async (businessId: string) => {
  await getOwnerBusiness(businessId);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("qr_campaigns")
    .select(CAMPAIGN_COLUMNS)
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
});

export const getOwnerBusinessWithCampaigns = cache(async (businessId: string) => {
  const { user } = await requireActiveOwner();
  const supabase = await createClient();
  const [{ data: business, error: businessError }, { data: campaigns, error: campaignError }] = await Promise.all([
    supabase.from("businesses").select(BUSINESS_COLUMNS).eq("id", businessId).eq("owner_id", user.id).single(),
    supabase.from("qr_campaigns").select(CAMPAIGN_COLUMNS).eq("business_id", businessId).order("created_at", { ascending: false })
  ]);
  if (businessError) throw businessError;
  if (campaignError) throw campaignError;
  return { business, campaigns: campaigns ?? [] };
});

export const getOwnerCampaigns = cache(async () => {
  const businesses = await getOwnerBusinesses();
  if (!businesses.length) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("qr_campaigns")
    .select(CAMPAIGN_COLUMNS)
    .in("business_id", businesses.map((business) => business.id))
    .order("created_at", { ascending: false });
  if (error) throw error;

  const businessById = new Map(businesses.map((business) => [business.id, business]));
  return (data ?? []).flatMap((campaign) => {
    const business = businessById.get(campaign.business_id);
    return business ? [{ business, campaign }] : [];
  });
});
