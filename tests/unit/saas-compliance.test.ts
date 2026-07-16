import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const publicForm = readFileSync(join(root, "src/features/feedback/components/public-feedback-form.tsx"), "utf8");
const migration = readFileSync(join(root, "supabase/migrations/20260716120000_billing_entitlements_onboarding.sql"), "utf8");

describe("paid SaaS compliance guardrails", () => {
  it("does not ship a default positive experience", () => {
    expect(publicForm).not.toContain("its one of the besty website");
    expect(publicForm).toContain('useState("")');
  });

  it("keeps low-rating Google access available", () => {
    expect(publicForm).toContain("Open Google review page");
    expect(publicForm).toContain("isLowRating");
  });

  it("creates provider-owned billing tables with RLS and client write protection", () => {
    for (const table of ["subscriptions", "payment_transactions", "billing_events", "subscription_usage", "onboarding_progress", "entitlement_overrides"]) {
      expect(migration).toContain(`alter table public.${table} enable row level security;`);
    }
    expect(migration).toContain("revoke insert, update, delete on public.subscriptions from anon, authenticated;");
    expect(migration).toContain("unique (owner_id, period_start, metric)");
  });
});
