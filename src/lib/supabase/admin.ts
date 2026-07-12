import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getServiceRoleKey, getSupabasePublicEnv } from "@/lib/env";

export function createAdminClient() {
  const { url } = getSupabasePublicEnv();
  return createClient<Database>(url, getServiceRoleKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
