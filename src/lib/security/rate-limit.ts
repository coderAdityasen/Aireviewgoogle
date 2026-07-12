import { createAdminClient } from "@/lib/supabase/admin";
import { hashSubject } from "@/lib/security/ip";

export class RateLimitError extends Error {
  constructor() {
    super("Too many attempts. Please wait before trying again.");
    this.name = "RateLimitError";
  }
}

export async function assertRateLimit(input: {
  scope: string;
  ipHash?: string | null;
  sessionId?: string | null;
  businessId?: string | null;
  campaignId?: string | null;
  actorId?: string | null;
  maxAttempts?: number;
  windowSeconds?: number;
}) {
  const maxAttempts = input.maxAttempts ?? Number(process.env.RATE_LIMIT_MAX_ATTEMPTS ?? 10);
  const windowSeconds = input.windowSeconds ?? Number(process.env.RATE_LIMIT_WINDOW_SECONDS ?? 300);
  const subjectHash = hashSubject([
    input.scope,
    input.ipHash,
    input.sessionId,
    input.businessId,
    input.campaignId,
    input.actorId
  ]);
  const since = new Date(Date.now() - windowSeconds * 1000).toISOString();
  const admin = createAdminClient();

  const { count, error } = await admin
    .from("rate_limit_events")
    .select("id", { count: "exact", head: true })
    .eq("scope", input.scope)
    .eq("subject_hash", subjectHash)
    .gte("created_at", since);

  if (error) throw error;
  if ((count ?? 0) >= maxAttempts) throw new RateLimitError();

  await admin.from("rate_limit_events").insert({
    scope: input.scope,
    subject_hash: subjectHash,
    business_id: input.businessId ?? null,
    qr_campaign_id: input.campaignId ?? null
  });
}
