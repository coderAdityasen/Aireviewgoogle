"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertBusinessLimit, assertQrCampaignLimit, requirePaidOwner } from "@/lib/billing/entitlements";
import { businessSchema } from "@/lib/validation/business";

const progressSchema = z.object({ currentStep: z.number().int().min(1).max(6), completedSteps: z.array(z.number().int().min(1).max(6)), draftData: z.record(z.string(), z.unknown()) });

export async function getOnboardingProgress(ownerId: string) {
  const { user } = await requirePaidOwner();
  if (user.id !== ownerId) throw new Error("You do not have access to this onboarding session.");
  const supabase = await createClient();
  const { data, error } = await supabase.from("onboarding_progress").select("owner_id, current_step, completed_steps, status, draft_data, completed_at, updated_at").eq("owner_id", ownerId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveOnboardingProgressAction(input: unknown) {
  const { user } = await requirePaidOwner();
  const parsed = progressSchema.parse(input);
  const supabase = await createClient();
  const { error } = await supabase.from("onboarding_progress").upsert({ owner_id: user.id, current_step: parsed.currentStep, completed_steps: parsed.completedSteps, status: "in_progress", draft_data: parsed.draftData as never }, { onConflict: "owner_id" });
  if (error) throw error;
  return { ok: true };
}

export async function completeOnboardingAction(input: unknown) {
  const { user } = await requirePaidOwner();
  await assertBusinessLimit(user.id);
  await assertQrCampaignLimit(user.id);
  const parsed = businessSchema.parse(input);
  const admin = createAdminClient();
  const slug = await uniqueBusinessSlug(parsed.name);
  const { data: business, error } = await admin.from("businesses").insert({ owner_id: user.id, name: parsed.name, slug, category: parsed.category, description: parsed.description, services: parsed.services.split(/[\n,]/).map((item) => item.trim()).filter(Boolean), phone: parsed.phone || null, email: parsed.email || null, website: parsed.website || null, address_line: parsed.addressLine || null, city: parsed.city || null, state: parsed.state || null, country: parsed.country || null, logo_url: parsed.logoUrl || null, brand_color: parsed.brandColor, google_review_url: parsed.googleReviewUrl, google_place_id: parsed.googlePlaceId || null, google_maps_url: parsed.googleMapsUrl || null, latitude: parsed.latitude ?? null, longitude: parsed.longitude ?? null, default_language: parsed.defaultLanguage, experience_tags: parsed.experienceTags.split(/[\n,]/).map((item) => item.trim()).filter(Boolean), low_rating_support_message: parsed.lowRatingSupportMessage || null, contact_fields: parsed.contactFields.split(/[\n,]/).map((item) => item.trim()).filter(Boolean), poster_headline: parsed.posterHeadline || null, poster_template: parsed.posterTemplate, is_active: true }).select("id").single();
  if (error) throw error;
  const { data: campaign, error: campaignError } = await admin.from("qr_campaigns").insert({ business_id: business.id, name: parsed.campaignName?.trim() || (parsed.name ? `${parsed.name} QR` : "Customer QR"), is_active: true }).select("id, public_token").single();
  if (campaignError) throw campaignError;
  const { error: progressError } = await admin.from("onboarding_progress").upsert({ owner_id: user.id, current_step: 3, completed_steps: [1, 2, 3], status: "completed", draft_data: parsed as never, completed_at: new Date().toISOString() }, { onConflict: "owner_id" });
  if (progressError) throw progressError;
  await admin.from("audit_logs").insert({ actor_id: user.id, action: "onboarding.completed", entity_type: "business", entity_id: business.id, metadata: { name: parsed.name } });
  revalidatePath("/dashboard");
  return { businessId: business.id, slug, campaignToken: campaign.public_token };
}

async function uniqueBusinessSlug(name: string) {
  const admin = createAdminClient();
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "business";
  for (let index = 0; index < 50; index += 1) {
    const candidate = index === 0 ? base : `${base}-${index + 1}`;
    const { data } = await admin.from("businesses").select("id").eq("slug", candidate).maybeSingle();
    if (!data) return candidate;
  }
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}
