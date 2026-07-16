"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireActiveOwner } from "@/lib/auth/roles";

export async function deleteFeedbackAction(formData: FormData) {
  const { user } = await requireActiveOwner();
  const parsed = z.object({ id: z.string().uuid(), businessId: z.string().uuid(), confirmation: z.literal("DELETE") }).parse({
    id: formData.get("id"),
    businessId: formData.get("businessId"),
    confirmation: formData.get("confirmation")
  });
  const supabase = await createClient();
  const { error } = await supabase
    .from("customer_feedback")
    .delete()
    .eq("id", parsed.id)
    .eq("business_id", parsed.businessId);
  if (error) throw error;
  await createAdminClient().from("audit_logs").insert({
    actor_id: user.id,
    action: "feedback.deleted",
    entity_type: "customer_feedback",
    entity_id: parsed.id,
    metadata: { business_id: parsed.businessId }
  });
  revalidatePath(`/dashboard/businesses/${parsed.businessId}/feedback`);
}

export async function updateFeedbackResolutionAction(formData: FormData) {
  const { user } = await requireActiveOwner();
  const parsed = z.object({ id: z.string().uuid(), businessId: z.string().uuid(), status: z.enum(["new", "in_progress", "resolved"]), internalNotes: z.string().max(2000).optional() }).parse({ id: formData.get("id"), businessId: formData.get("businessId"), status: formData.get("status"), internalNotes: formData.get("internalNotes") ?? undefined });
  const supabase = await createClient();
  const { error } = await supabase.from("customer_feedback").update({ resolution_status: parsed.status, internal_notes: parsed.internalNotes ?? null, resolved_at: parsed.status === "resolved" ? new Date().toISOString() : null }).eq("id", parsed.id).eq("business_id", parsed.businessId);
  if (error) throw error;
  await createAdminClient().from("audit_logs").insert({ actor_id: user.id, action: `feedback.${parsed.status}`, entity_type: "customer_feedback", entity_id: parsed.id, metadata: { business_id: parsed.businessId } });
  revalidatePath(`/dashboard/businesses/${parsed.businessId}/feedback`);
  revalidatePath("/dashboard/feedback");
}
