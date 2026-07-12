"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActiveOwner } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function updateProfileAction(formData: FormData) {
  const { user } = await requireActiveOwner();
  const parsed = z.object({ fullName: z.string().min(2).max(120) }).parse({ fullName: formData.get("fullName") });
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ full_name: parsed.fullName }).eq("id", user.id);
  if (error) throw error;
  revalidatePath("/dashboard/settings");
}

export async function updatePasswordAction(formData: FormData) {
  await requireActiveOwner();
  const parsed = z.object({ password: z.string().min(8) }).parse({ password: formData.get("password") });
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.password });
  if (error) throw error;
}

export async function deleteOwnAccountAction(formData: FormData) {
  const { user } = await requireActiveOwner();
  const parsed = z.object({ confirmation: z.literal("DELETE MY ACCOUNT") }).parse({
    confirmation: formData.get("confirmation")
  });
  const admin = createAdminClient();
  await admin.from("audit_logs").insert({
    actor_id: user.id,
    action: "owner.account_deletion_requested",
    entity_type: "profile",
    entity_id: user.id,
    metadata: { confirmation: parsed.confirmation }
  });
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) throw error;
  redirect("/signup");
}
