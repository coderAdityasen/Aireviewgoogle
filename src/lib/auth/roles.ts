import { redirect } from "next/navigation";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getAdminEmailAllowlist } from "@/lib/env";
import type { Profile } from "@/types/database";

export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return user;
});

export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (error) return null;
  return data;
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireActiveOwner() {
  const user = await requireUser();
  const profile = await getCurrentProfile();

  if (!profile || profile.account_status !== "active") {
    redirect("/login?suspended=1");
  }

  return { user, profile };
}

export async function requireAdmin() {
  const user = await requireUser();
  const allowlist = getAdminEmailAllowlist();
  const email = user.email?.toLowerCase() ?? "";

  if (email && allowlist.includes(email)) {
    return { user, via: "email_allowlist" as const };
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id, role, account_status")
    .eq("id", user.id)
    .eq("role", "admin")
    .eq("account_status", "active")
    .maybeSingle();

  if (!data) redirect("/dashboard");
  return { user, via: "database_role" as const };
}

export async function assertBusinessAccess(businessId: string) {
  const { user } = await requireActiveOwner();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("businesses")
    .select("id, owner_id")
    .eq("id", businessId)
    .eq("owner_id", user.id)
    .single();

  if (error || !data) {
    throw new Error("You do not have access to this business.");
  }
}
