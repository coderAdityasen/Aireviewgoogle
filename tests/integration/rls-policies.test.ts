import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/20260711173000_initial_reviewflow_schema.sql"), "utf8");

describe("RLS migration", () => {
  it("enables RLS on every application table", () => {
    for (const table of [
      "profiles",
      "businesses",
      "qr_campaigns",
      "visitor_sessions",
      "analytics_events",
      "customer_feedback",
      "ai_usage_logs",
      "audit_logs",
      "platform_settings"
    ]) {
      expect(migration).toContain(`alter table public.${table} enable row level security;`);
    }
  });

  it("uses ownership and admin helper policies instead of client metadata", () => {
    expect(migration).toContain("app_private.is_admin()");
    expect(migration).toContain("app_private.owns_business");
    expect(migration).not.toMatch(/raw_user_meta_data.*role/i);
  });

  it("limits public feedback inserts and prevents public feedback reads", () => {
    expect(migration).toContain("Feedback can be inserted by public route");
    expect(migration).not.toContain("grant select on public.customer_feedback to anon");
  });
});
