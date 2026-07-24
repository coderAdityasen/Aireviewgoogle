-- Optional one-time AI impact / growth forecast for GMB suggestions.

alter table public.gmb_suggestions
  add column if not exists impact_report jsonb,
  add column if not exists impact_generated_at timestamptz;
