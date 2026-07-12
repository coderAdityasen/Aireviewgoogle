import { createClient } from "@/lib/supabase/server";
import { requireActiveOwner } from "@/lib/auth/roles";

export async function getOwnerBusinesses() {
  const { user } = await requireActiveOwner();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getOwnerBusiness(id: string) {
  const { user } = await requireActiveOwner();
  const supabase = await createClient();
  const { data, error } = await supabase.from("businesses").select("*").eq("id", id).eq("owner_id", user.id).single();
  if (error) throw error;
  return data;
}

export async function getBusinessCampaigns(businessId: string) {
  await getOwnerBusiness(businessId);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("qr_campaigns")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}
