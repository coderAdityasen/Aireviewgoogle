"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  assertGmbSuggestionsAccess,
  requirePaidOwner,
} from "@/lib/billing/entitlements";
import {
  generateGmbImpactReport,
  generateGmbSuggestions,
  type GmbImpactReport,
  type GmbSuggestion,
} from "@/features/ai/server/gmb-suggestions";

export type StoredGmbSuggestions = {
  businessId: string;
  suggestions: GmbSuggestion[];
  suggestionCount: number;
  provider: string;
  model: string;
  generatedAt: string;
  impactReport: GmbImpactReport | null;
  impactGeneratedAt: string | null;
};

const businessIdSchema = z.object({
  businessId: z.string().uuid(),
});

function servicesList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function parseStoredSuggestions(value: unknown): GmbSuggestion[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const title = String(row.title ?? "").trim();
      const detail = String(row.detail ?? "").trim();
      const action = String(row.action ?? "").trim();
      if (!title || !detail) return null;
      const impactRaw = String(row.impact ?? "medium").toLowerCase();
      const impact =
        impactRaw === "high" || impactRaw === "low" ? impactRaw : "medium";
      const category = String(
        row.category ?? "profile_completeness",
      ) as GmbSuggestion["category"];
      return {
        id: String(row.id ?? `gmb-${index + 1}`),
        category,
        title,
        impact,
        detail,
        action:
          action || "Open Google Business Profile and complete this item.",
      } satisfies GmbSuggestion;
    })
    .filter((item): item is GmbSuggestion => Boolean(item));
}

function parseImpactReport(value: unknown): GmbImpactReport | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const summary = String(row.summary ?? "").trim();
  if (!summary) return null;
  const metrics = Array.isArray(row.metrics)
    ? row.metrics
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const m = item as Record<string, unknown>;
          const label = String(m.label ?? "").trim();
          if (!label) return null;
          return {
            label,
            before: String(m.before ?? "—"),
            after: String(m.after ?? "—"),
            change: String(m.change ?? "—"),
          };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
    : [];
  return {
    summary,
    timeframe: String(row.timeframe ?? "60–90 days"),
    metrics,
    growthHighlights: Array.isArray(row.growthHighlights)
      ? row.growthHighlights.map((x) => String(x)).filter(Boolean)
      : [],
    specialistFocus: Array.isArray(row.specialistFocus)
      ? row.specialistFocus.map((x) => String(x)).filter(Boolean)
      : [],
  };
}

async function loadOwnedBusiness(businessId: string, ownerId: string) {
  const supabase = await createClient();
  const { data: business, error } = await supabase
    .from("businesses")
    .select(
      "id, owner_id, name, category, description, services, phone, email, website, address_line, city, state, country, google_review_url",
    )
    .eq("id", businessId)
    .eq("owner_id", ownerId)
    .single();

  if (error || !business) throw new Error("Business not found.");
  return business;
}

function profileFromBusiness(
  business: Awaited<ReturnType<typeof loadOwnedBusiness>>,
) {
  return {
    name: business.name,
    category: business.category,
    description: business.description,
    services: servicesList(business.services),
    phone: business.phone,
    email: business.email,
    website: business.website,
    addressLine: business.address_line,
    city: business.city,
    state: business.state,
    country: business.country,
    googleReviewUrl: business.google_review_url,
  };
}

/** Load saved suggestions (and optional impact report) for one business. */
export async function getStoredGmbSuggestions(
  businessId: string,
): Promise<StoredGmbSuggestions | null> {
  const { user } = await requirePaidOwner();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gmb_suggestions")
    .select(
      "business_id, suggestions, suggestion_count, provider, model, generated_at, impact_report, impact_generated_at",
    )
    .eq("business_id", businessId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const suggestions = parseStoredSuggestions(data.suggestions);
  return {
    businessId: data.business_id,
    suggestions,
    suggestionCount: data.suggestion_count ?? suggestions.length,
    provider: data.provider,
    model: data.model,
    generatedAt: data.generated_at,
    impactReport: parseImpactReport(data.impact_report),
    impactGeneratedAt: data.impact_generated_at,
  };
}

/**
 * One-time generate for a business. Fails if already generated.
 * Growth/Pro only.
 */
export async function generateAndSaveGmbSuggestionsAction(
  input: unknown,
): Promise<StoredGmbSuggestions> {
  const { user } = await requirePaidOwner();
  await assertGmbSuggestionsAccess(user.id);
  const { businessId } = businessIdSchema.parse(input);

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("gmb_suggestions")
    .select("business_id")
    .eq("business_id", businessId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (existing) {
    throw new Error(
      "Suggestions are already generated for this location and cannot be regenerated.",
    );
  }

  const business = await loadOwnedBusiness(businessId, user.id);
  const result = await generateGmbSuggestions(profileFromBusiness(business));
  const suggestions = result.suggestions;
  const generatedAt = new Date().toISOString();

  const { error: upsertError } = await admin.from("gmb_suggestions").insert({
    business_id: businessId,
    owner_id: user.id,
    suggestions: suggestions as never,
    suggestion_count: suggestions.length,
    provider: result.provider,
    model: result.model,
    generated_at: generatedAt,
  });

  if (upsertError) {
    throw new Error(upsertError.message || "Could not save GMB suggestions.");
  }

  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/gmb-suggestions");

  return {
    businessId,
    suggestions,
    suggestionCount: suggestions.length,
    provider: result.provider,
    model: result.model,
    generatedAt,
    impactReport: null,
    impactGeneratedAt: null,
  };
}

/**
 * One-time AI impact / growth forecast based on saved suggestions.
 * Cannot be re-run once stored.
 */
export async function generateAndSaveGmbImpactAction(
  input: unknown,
): Promise<GmbImpactReport> {
  const { user } = await requirePaidOwner();
  await assertGmbSuggestionsAccess(user.id);
  const { businessId } = businessIdSchema.parse(input);

  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from("gmb_suggestions")
    .select("suggestions, impact_report")
    .eq("business_id", businessId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error) throw error;
  if (!row) {
    throw new Error("Generate suggestions first, then view projected impact.");
  }

  const existingImpact = parseImpactReport(row.impact_report);
  if (existingImpact) {
    return existingImpact;
  }

  const suggestions = parseStoredSuggestions(row.suggestions);
  if (!suggestions.length) {
    throw new Error("No suggestions available for impact analysis.");
  }

  const business = await loadOwnedBusiness(businessId, user.id);
  const { report } = await generateGmbImpactReport({
    profile: profileFromBusiness(business),
    suggestions,
  });

  const impactGeneratedAt = new Date().toISOString();
  const { error: updateError } = await admin
    .from("gmb_suggestions")
    .update({
      impact_report: report as never,
      impact_generated_at: impactGeneratedAt,
    })
    .eq("business_id", businessId)
    .eq("owner_id", user.id);

  if (updateError) {
    throw new Error(updateError.message || "Could not save impact report.");
  }

  revalidatePath("/dashboard/gmb-suggestions");
  return report;
}

/** Total GMB suggestion count across the owner's locations. */
export async function getOwnerGmbSuggestionCount(
  ownerId: string,
): Promise<number> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("gmb_suggestions")
    .select("suggestion_count")
    .eq("owner_id", ownerId);

  if (error) throw error;
  return (data ?? []).reduce(
    (sum, row) => sum + (row.suggestion_count ?? 0),
    0,
  );
}

export type DashboardNavCounts = {
  reviews: number;
  privateFeedback: number;
  gmbSuggestions: number;
};

/** Counts for sidebar badges (reviews, private feedback, GMB). */
export async function getDashboardNavCounts(
  ownerId: string,
): Promise<DashboardNavCounts> {
  const admin = createAdminClient();

  const { data: businesses, error: businessError } = await admin
    .from("businesses")
    .select("id")
    .eq("owner_id", ownerId);

  if (businessError) throw businessError;
  const businessIds = (businesses ?? []).map((b) => b.id);

  if (!businessIds.length) {
    return { reviews: 0, privateFeedback: 0, gmbSuggestions: 0 };
  }

  const [reviewsResult, privateResult, gmbCount] = await Promise.all([
    admin
      .from("customer_feedback")
      .select("id", { count: "exact", head: true })
      .in("business_id", businessIds)
      .eq("submitted_privately", false)
      .eq("continued_to_google", true)
      .not("final_edited_text", "is", null),
    admin
      .from("customer_feedback")
      .select("id", { count: "exact", head: true })
      .in("business_id", businessIds)
      .eq("submitted_privately", true),
    getOwnerGmbSuggestionCount(ownerId),
  ]);

  if (reviewsResult.error) throw reviewsResult.error;
  if (privateResult.error) throw privateResult.error;

  return {
    reviews: reviewsResult.count ?? 0,
    privateFeedback: privateResult.count ?? 0,
    gmbSuggestions: gmbCount,
  };
}
