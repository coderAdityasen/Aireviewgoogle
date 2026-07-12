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
