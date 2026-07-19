"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { qrCampaignSchema } from "@/lib/validation/business";
import { assertQrCampaignLimit, requirePaidOwner } from "@/lib/billing/entitlements";

export async function createQrCampaignAction(input: unknown) {
  const { user } = await requirePaidOwner();
  await assertQrCampaignLimit(user.id);
  const parsed = qrCampaignSchema.parse(input);
  const supabase = await createClient();
  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select("id, owner_id")
    .eq("id", parsed.businessId)
    .eq("owner_id", user.id)
    .single();
  if (businessError || !business) throw new Error("Business not found.");

  const { error } = await supabase.from("qr_campaigns").insert({
    business_id: parsed.businessId,
    name: parsed.name,
    is_active: true
  });
  if (error) throw error;

  await createAdminClient().from("audit_logs").insert({
    actor_id: user.id,
    action: "qr_campaign.created",
    entity_type: "qr_campaign",
    metadata: { business_id: parsed.businessId, name: parsed.name }
  });

  revalidatePath(`/dashboard/businesses/${parsed.businessId}/qr-campaigns`);
}

export async function setQrCampaignActiveAction(campaignId: string, businessId: string, isActive: boolean) {
  const { user } = await requirePaidOwner();
  const supabase = await createClient();
  const { data: business } = await supabase.from("businesses").select("id").eq("id", businessId).eq("owner_id", user.id).single();
  if (!business) throw new Error("Business not found.");

  const { error } = await supabase
    .from("qr_campaigns")
    .update({ is_active: isActive })
    .eq("id", campaignId)
    .eq("business_id", businessId);
  if (error) throw error;

  await createAdminClient().from("audit_logs").insert({
    actor_id: user.id,
    action: isActive ? "qr_campaign.activated" : "qr_campaign.disabled",
    entity_type: "qr_campaign",
    entity_id: campaignId,
    metadata: { business_id: businessId }
  });

  revalidatePath(`/dashboard/businesses/${businessId}/qr-campaigns`);
}

export async function updatePosterSettingsAction(businessId: string, input: { brandColor: string; posterHeadline: string; posterTemplate: "light" | "dark" }) {
  const { user } = await requirePaidOwner();
  if (!/^#[0-9A-Fa-f]{6}$/.test(input.brandColor)) throw new Error("Choose a valid brand color.");
  if (input.posterHeadline.trim().length < 2 || input.posterHeadline.trim().length > 160) throw new Error("Add a poster headline between 2 and 160 characters.");
  const supabase = await createClient();
  const { error } = await supabase.from("businesses").update({ brand_color: input.brandColor, poster_headline: input.posterHeadline.trim(), poster_template: input.posterTemplate }).eq("id", businessId).eq("owner_id", user.id);
  if (error) throw error;
  await createAdminClient().from("audit_logs").insert({ actor_id: user.id, action: "business.poster_settings_updated", entity_type: "business", entity_id: businessId, metadata: { poster_template: input.posterTemplate } });
  revalidatePath("/dashboard/qr-posters");
  revalidatePath(`/dashboard/businesses/${businessId}/edit`);
}
