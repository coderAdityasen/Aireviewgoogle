-- Custom plan inquiries (contact-us form) + allow plan_key "custom".

-- 1) Inquiries from Contact us on the Custom plan
create table if not exists public.custom_plan_inquiries (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text,
  company_name text,
  locations_needed text,
  message text not null,
  user_id uuid references public.profiles(id) on delete set null,
  status text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists custom_plan_inquiries_status_created_idx
  on public.custom_plan_inquiries (status, created_at desc);

create index if not exists custom_plan_inquiries_email_idx
  on public.custom_plan_inquiries (email);

-- 2) Expand plan_key checks: custom replaces pro for new grants; keep pro for legacy rows
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'subscriptions_plan_key_check'
  ) then
    alter table public.subscriptions drop constraint subscriptions_plan_key_check;
  end if;
exception when undefined_object then null;
end $$;

alter table public.subscriptions
  drop constraint if exists subscriptions_plan_key_check;

alter table public.subscriptions
  add constraint subscriptions_plan_key_check
  check (plan_key in ('starter', 'growth', 'pro', 'custom'));

alter table public.entitlement_overrides
  drop constraint if exists entitlement_overrides_plan_key_check;

alter table public.entitlement_overrides
  add constraint entitlement_overrides_plan_key_check
  check (plan_key in ('starter', 'growth', 'pro', 'custom'));

-- Prefer custom going forward for any existing pro rows
update public.subscriptions set plan_key = 'custom' where plan_key = 'pro';
update public.entitlement_overrides set plan_key = 'custom' where plan_key = 'pro';

-- Default override plan becomes custom (was pro)
alter table public.entitlement_overrides
  alter column plan_key set default 'custom';

-- RLS: only service role / admin app uses these via service key; block public direct access
alter table public.custom_plan_inquiries enable row level security;
