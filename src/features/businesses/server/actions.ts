"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireActiveOwner } from "@/lib/auth/roles";
import { businessSchema } from "@/lib/validation/business";

function servicesToJson(services: string) {
  return services
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function uniqueBusinessSlug(baseName: string) {
  const admin = createAdminClient();
  const base = slugify(baseName) || "business";
  for (let index = 0; index < 50; index += 1) {
    const candidate = index === 0 ? base : `${base}-${index + 1}`;
    const { data } = await admin.from("businesses").select("id").eq("slug", candidate).maybeSingle();
    if (!data) return candidate;
  }
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function createBusinessAction(input: unknown) {
  const { user } = await requireActiveOwner();
  const parsed = businessSchema.parse(input);
  const supabase = await createClient();
  const slug = await uniqueBusinessSlug(parsed.name);

  if (parsed.ownerFullName) {
    await supabase.from("profiles").update({ full_name: parsed.ownerFullName }).eq("id", user.id);
  }

  const { data, error } = await supabase
    .from("businesses")
    .insert({
      owner_id: user.id,
      name: parsed.name,
      slug,
      category: parsed.category,
      description: parsed.description,
      services: servicesToJson(parsed.services),
      phone: parsed.phone || null,
      email: parsed.email || null,
      website: parsed.website || null,
      address_line: parsed.addressLine || null,
      city: parsed.city || null,
      state: parsed.state || null,
      country: parsed.country || null,
      logo_url: parsed.logoUrl || null,
      brand_color: parsed.brandColor,
      google_review_url: parsed.googleReviewUrl,
      default_language: parsed.defaultLanguage,
      is_active: true
    })
    .select("id")
    .single();

  if (error) throw error;

  await supabase.from("qr_campaigns").insert({
    business_id: data.id,
    name: "General QR",
    is_active: true
  });

  await createAdminClient().from("audit_logs").insert({
    actor_id: user.id,
    action: "business.created",
    entity_type: "business",
    entity_id: data.id,
    metadata: { name: parsed.name }
  });

  revalidatePath("/dashboard");
  redirect(`/dashboard/businesses/${data.id}`);
}

export async function updateBusinessAction(businessId: string, input: unknown) {
  const { user } = await requireActiveOwner();
  const parsed = businessSchema.parse(input);
  const supabase = await createClient();
  const { error } = await supabase
    .from("businesses")
    .update({
      name: parsed.name,
      category: parsed.category,
      description: parsed.description,
      services: servicesToJson(parsed.services),
      phone: parsed.phone || null,
      email: parsed.email || null,
      website: parsed.website || null,
      address_line: parsed.addressLine || null,
      city: parsed.city || null,
      state: parsed.state || null,
      country: parsed.country || null,
      logo_url: parsed.logoUrl || null,
      brand_color: parsed.brandColor,
      google_review_url: parsed.googleReviewUrl,
      default_language: parsed.defaultLanguage
    })
    .eq("id", businessId)
    .eq("owner_id", user.id);

  if (error) throw error;

  await createAdminClient().from("audit_logs").insert({
    actor_id: user.id,
    action: "business.updated",
    entity_type: "business",
    entity_id: businessId,
    metadata: { name: parsed.name }
  });

  revalidatePath("/dashboard/businesses");
  redirect(`/dashboard/businesses/${businessId}`);
}

export async function deleteBusinessAction(businessId: string, confirmation: string) {
  const { user } = await requireActiveOwner();
  if (confirmation !== "DELETE") throw new Error("Confirmation did not match.");
  const supabase = await createClient();
  const { error } = await supabase.from("businesses").delete().eq("id", businessId).eq("owner_id", user.id);
  if (error) throw error;

  await createAdminClient().from("audit_logs").insert({
    actor_id: user.id,
    action: "business.deleted",
    entity_type: "business",
    entity_id: businessId
  });

  revalidatePath("/dashboard/businesses");
  redirect("/dashboard/businesses");
}
