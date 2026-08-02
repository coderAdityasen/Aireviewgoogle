"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeGoogleReviewUrl } from "@/lib/security/google-url";
import { optionalHttpUrl } from "@/lib/validation/business";
import { REVIEW_PROMPT_SETTING_KEY, assertAdminPromptIsSafe } from "@/features/ai/server/prompt";
import { hasRatingTagFields, ratingTagsFromFields } from "@/lib/feedback/rating-tags";

const statusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["active", "suspended"])
});

export async function setOwnerStatusAction(formData: FormData) {
  const { user } = await requireAdmin();
  const parsed = statusSchema.parse({ id: formData.get("id"), status: formData.get("status") });
  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ account_status: parsed.status }).eq("id", parsed.id);
  if (error) throw error;
  await admin.from("audit_logs").insert({
    actor_id: user.id,
    action: `owner.${parsed.status}`,
    entity_type: "profile",
    entity_id: parsed.id
  });
  revalidatePath("/admin/owners");
}

export async function grantEntitlementOverrideAction(formData: FormData) {
  const { user } = await requireAdmin();
  const parsed = z.object({ ownerId: z.string().uuid(), planKey: z.enum(["starter", "growth", "custom"]), reason: z.string().min(3).max(500), expiresAt: z.string().optional() }).parse({ ownerId: formData.get("ownerId"), planKey: formData.get("planKey"), reason: formData.get("reason"), expiresAt: formData.get("expiresAt") || undefined });
  const admin = createAdminClient();
  const { data, error } = await admin.from("entitlement_overrides").insert({ owner_id: parsed.ownerId, granted_by: user.id, plan_key: parsed.planKey, reason: parsed.reason, expires_at: parsed.expiresAt ? new Date(parsed.expiresAt).toISOString() : null }).select("id").single();
  if (error) throw error;
  await admin.from("audit_logs").insert({ actor_id: user.id, action: "entitlement.override_granted", entity_type: "entitlement_override", entity_id: data.id, metadata: { owner_id: parsed.ownerId, plan_key: parsed.planKey, reason: parsed.reason, expires_at: parsed.expiresAt ?? null } });
  revalidatePath("/admin/owners");
}

export async function setBusinessActiveAction(formData: FormData) {
  const { user } = await requireAdmin();
  const parsed = z.object({ id: z.string().uuid(), isActive: z.enum(["true", "false"]) }).parse({
    id: formData.get("id"),
    isActive: formData.get("isActive")
  });
  const admin = createAdminClient();
  const { error } = await admin.from("businesses").update({ is_active: parsed.isActive === "true" }).eq("id", parsed.id);
  if (error) throw error;
  await admin.from("audit_logs").insert({
    actor_id: user.id,
    action: parsed.isActive === "true" ? "business.activated" : "business.disabled",
    entity_type: "business",
    entity_id: parsed.id
  });
  revalidatePath("/admin/businesses");
}

export async function updateBusinessAdminAction(formData: FormData) {
  const { user } = await requireAdmin();
  const parsed = z
    .object({
      id: z.string().uuid(),
      name: z.string().min(2).max(160),
      category: z.string().min(2).max(80),
      googleReviewUrl: z.string().transform((value) => normalizeGoogleReviewUrl(value)),
      phone: z.string().max(40).optional().default(""),
      website: optionalHttpUrl("website URL"),
      experienceTags: z.string().max(1000).optional().default(""),
      ratingTags1: z.string().max(1000).optional().default(""),
      ratingTags2: z.string().max(1000).optional().default(""),
      ratingTags3: z.string().max(1000).optional().default(""),
      ratingTags4: z.string().max(1000).optional().default(""),
      ratingTags5: z.string().max(1000).optional().default(""),
      lowRatingSupportMessage: z.string().max(400).optional().default(""),
      contactFields: z.string().max(200).optional().default("name,email")
    })
    .parse({
      id: formData.get("id"),
      name: formData.get("name"),
      category: formData.get("category"),
      googleReviewUrl: formData.get("googleReviewUrl"),
      phone: formData.get("phone"),
      website: formData.get("website"),
      experienceTags: formData.get("experienceTags"),
      ratingTags1: formData.get("ratingTags1"),
      ratingTags2: formData.get("ratingTags2"),
      ratingTags3: formData.get("ratingTags3"),
      ratingTags4: formData.get("ratingTags4"),
      ratingTags5: formData.get("ratingTags5"),
      lowRatingSupportMessage: formData.get("lowRatingSupportMessage"),
      contactFields: formData.get("contactFields")
    });
  const admin = createAdminClient();
  const ratingTags = ratingTagsFromFields(parsed);
  const { error } = await admin
    .from("businesses")
    .update({
      name: parsed.name,
      category: parsed.category,
      google_review_url: parsed.googleReviewUrl,
      phone: parsed.phone || null,
      website: parsed.website || null,
      experience_tags: hasRatingTagFields(ratingTags) ? ratingTags : parsed.experienceTags.split(/[\n,]/).map((item) => item.trim()).filter(Boolean),
      low_rating_support_message: parsed.lowRatingSupportMessage || null,
      contact_fields: parsed.contactFields.split(/[\n,]/).map((item) => item.trim()).filter((item) => ["name", "email", "phone"].includes(item))
    })
    .eq("id", parsed.id);
  if (error) throw error;
  await admin.from("audit_logs").insert({
    actor_id: user.id,
    action: "business.admin_updated",
    entity_type: "business",
    entity_id: parsed.id
  });
  revalidatePath("/admin/businesses");
}

export async function deleteBusinessAdminAction(formData: FormData) {
  const { user } = await requireAdmin();
  const parsed = z.object({ id: z.string().uuid(), confirmation: z.literal("DELETE") }).parse({
    id: formData.get("id"),
    confirmation: formData.get("confirmation")
  });
  const admin = createAdminClient();
  const { error } = await admin.from("businesses").delete().eq("id", parsed.id);
  if (error) throw error;
  await admin.from("audit_logs").insert({
    actor_id: user.id,
    action: "business.admin_deleted",
    entity_type: "business",
    entity_id: parsed.id
  });
  revalidatePath("/admin/businesses");
}

export async function updatePlatformSettingAction(formData: FormData) {
  const { user } = await requireAdmin();
  const parsed = z.object({ key: z.string().min(2), value: z.string().min(2) }).parse({
    key: formData.get("key"),
    value: formData.get("value")
  });
  const settingValue = JSON.parse(parsed.value) as Record<string, unknown>;
  const admin = createAdminClient();
  const { error } = await admin
    .from("platform_settings")
    .upsert({ setting_key: parsed.key, setting_value: settingValue as never, updated_by: user.id }, { onConflict: "setting_key" });
  if (error) throw error;
  await admin.from("audit_logs").insert({
    actor_id: user.id,
    action: "platform_settings.updated",
    entity_type: "platform_settings",
    metadata: { key: parsed.key }
  });
  revalidatePath("/admin/settings");
}

export async function updateReviewPromptSettingAction(formData: FormData) {
  const { user } = await requireAdmin();
  const parsed = z
    .object({
      prompt: z.string().min(80).max(5000).transform((value) => assertAdminPromptIsSafe(value)),
      optionsCount: z.coerce.number().int().min(2).max(3)
    })
    .parse({
      prompt: formData.get("prompt"),
      optionsCount: formData.get("optionsCount")
    });

  const admin = createAdminClient();
  const { error } = await admin.from("platform_settings").upsert(
    {
      setting_key: REVIEW_PROMPT_SETTING_KEY,
      setting_value: {
        prompt: parsed.prompt,
        optionsCount: parsed.optionsCount
      },
      updated_by: user.id
    },
    { onConflict: "setting_key" }
  );
  if (error) throw error;

  await admin.from("audit_logs").insert({
    actor_id: user.id,
    action: "platform_settings.review_prompt_updated",
    entity_type: "platform_settings",
    metadata: { key: REVIEW_PROMPT_SETTING_KEY, optionsCount: parsed.optionsCount }
  });
  revalidatePath("/admin/settings");
}
