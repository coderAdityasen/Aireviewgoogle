-- ReviewFlow paid access, billing audit state and resumable onboarding.
-- Apply after the existing ReviewFlow migrations.

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null default 'razorpay' check (provider in ('razorpay')),
  provider_customer_id text,
  provider_subscription_id text not null unique,
  plan_key text not null check (plan_key in ('starter', 'growth', 'pro')),
  status text not null check (status in ('created', 'authenticated', 'active', 'charged', 'updated', 'pending', 'halted', 'paused', 'resumed', 'cancelled', 'completed', 'expired', 'unpaid')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  access_until timestamptz,
  cancel_at_period_end boolean not null default false,
  cancelled_at timestamptz,
  last_provider_event_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  provider_payment_id text not null unique,
  amount integer not null check (amount >= 0),
  currency text not null default 'INR' check (char_length(currency) = 3),
  status text not null check (status in ('created', 'authorized', 'captured', 'failed', 'refunded')),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  provider_event_id text not null unique,
  event_type text not null,
  event_created_at timestamptz not null,
  processed_at timestamptz,
  processing_status text not null default 'received' check (processing_status in ('received', 'processed', 'ignored', 'failed')),
  payload_sha256 text not null,
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists public.subscription_usage (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  metric text not null check (metric in ('ai_generation', 'csv_export')),
  usage_count integer not null default 0 check (usage_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, period_start, metric)
);

create table if not exists public.onboarding_progress (
  owner_id uuid primary key references public.profiles(id) on delete cascade,
  current_step integer not null default 1 check (current_step between 1 and 6),
  completed_steps integer[] not null default '{}',
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  draft_data jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.entitlement_overrides (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  granted_by uuid not null references public.profiles(id) on delete restrict,
  plan_key text not null default 'pro' check (plan_key in ('starter', 'growth', 'pro')),
  reason text not null check (char_length(trim(reason)) between 3 and 500),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.customer_feedback add column if not exists customer_name text;
alter table public.customer_feedback add column if not exists customer_email text;
alter table public.customer_feedback add column if not exists customer_phone text;
alter table public.customer_feedback add column if not exists topic text;
alter table public.customer_feedback add column if not exists resolution_status text not null default 'new' check (resolution_status in ('new', 'in_progress', 'resolved'));
alter table public.customer_feedback add column if not exists internal_notes text;
alter table public.customer_feedback add column if not exists resolved_at timestamptz;
alter table public.businesses add column if not exists experience_tags jsonb not null default '[]'::jsonb;
alter table public.businesses add column if not exists low_rating_support_message text;
alter table public.businesses add column if not exists contact_fields jsonb not null default '["name", "email"]'::jsonb;
alter table public.businesses add column if not exists poster_headline text;
alter table public.businesses add column if not exists poster_template text not null default 'light' check (poster_template in ('light', 'dark'));

create index if not exists subscriptions_owner_idx on public.subscriptions(owner_id, created_at desc);
create index if not exists subscriptions_status_idx on public.subscriptions(status, access_until);
create index if not exists payment_transactions_owner_idx on public.payment_transactions(owner_id, created_at desc);
create index if not exists billing_events_type_idx on public.billing_events(event_type, event_created_at desc);
create index if not exists subscription_usage_owner_period_idx on public.subscription_usage(owner_id, period_start, metric);
create index if not exists onboarding_status_idx on public.onboarding_progress(status, updated_at desc);
create index if not exists entitlement_overrides_owner_idx on public.entitlement_overrides(owner_id, expires_at);
create index if not exists feedback_resolution_idx on public.customer_feedback(business_id, resolution_status, created_at desc);

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at before update on public.subscriptions for each row execute function public.set_updated_at();
drop trigger if exists subscription_usage_set_updated_at on public.subscription_usage;
create trigger subscription_usage_set_updated_at before update on public.subscription_usage for each row execute function public.set_updated_at();

create or replace function app_private.is_paid_owner(target_owner_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = target_owner_id
      and p.account_status = 'active'
      and (
        exists (
          select 1 from public.subscriptions s
          where s.owner_id = p.id
            and s.status in ('active', 'authenticated', 'charged', 'resumed')
            and (s.access_until is null or s.access_until > now())
        )
        or exists (
          select 1 from public.entitlement_overrides eo
          where eo.owner_id = p.id
            and (eo.expires_at is null or eo.expires_at > now())
        )
      )
  );
$$;

create or replace function app_private.public_business_is_active(target_business_id uuid, target_campaign_id uuid default null)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.businesses b
    where b.id = target_business_id
      and b.is_active = true
      and app_private.is_paid_owner(b.owner_id)
      and (
        target_campaign_id is null
        or exists (select 1 from public.qr_campaigns qc where qc.id = target_campaign_id and qc.business_id = b.id and qc.is_active = true)
      )
  );
$$;

create or replace function app_private.is_active_owner()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.account_status = 'active'
      and (p.role = 'admin' or app_private.is_paid_owner(p.id))
  );
$$;

alter table public.subscriptions enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.billing_events enable row level security;
alter table public.subscription_usage enable row level security;
alter table public.onboarding_progress enable row level security;
alter table public.entitlement_overrides enable row level security;

grant select on public.subscriptions to authenticated;
grant select on public.payment_transactions to authenticated;
grant select on public.subscription_usage to authenticated;
grant select, insert, update on public.onboarding_progress to authenticated;
grant select on public.entitlement_overrides to authenticated;
grant all on public.subscriptions, public.payment_transactions, public.billing_events, public.subscription_usage, public.onboarding_progress, public.entitlement_overrides to service_role;
grant execute on function app_private.is_paid_owner(uuid) to anon, authenticated, service_role;
grant execute on function app_private.public_business_is_active(uuid, uuid) to anon, authenticated, service_role;
revoke execute on function app_private.is_paid_owner(uuid) from public, anon;
grant execute on function app_private.is_paid_owner(uuid) to authenticated, service_role;

create policy "Owners can read their subscriptions" on public.subscriptions for select to authenticated using (owner_id = (select auth.uid()) or (select app_private.is_admin()));
create policy "Admins can read payment transactions" on public.payment_transactions for select to authenticated using (owner_id = (select auth.uid()) or (select app_private.is_admin()));
create policy "Owners can read their usage" on public.subscription_usage for select to authenticated using (owner_id = (select auth.uid()) or (select app_private.is_admin()));
create policy "Owners can manage their onboarding" on public.onboarding_progress for select to authenticated using (owner_id = (select auth.uid()) and (select app_private.is_paid_owner(owner_id)));
create policy "Owners can start onboarding" on public.onboarding_progress for insert to authenticated with check (owner_id = (select auth.uid()) and (select app_private.is_paid_owner(owner_id)));
create policy "Owners can update their onboarding" on public.onboarding_progress for update to authenticated using (owner_id = (select auth.uid()) and (select app_private.is_paid_owner(owner_id))) with check (owner_id = (select auth.uid()) and (select app_private.is_paid_owner(owner_id)));
create policy "Admins can read overrides" on public.entitlement_overrides for select to authenticated using ((select app_private.is_admin()));
create policy "Admins can manage overrides" on public.entitlement_overrides for all to authenticated using ((select app_private.is_admin())) with check ((select app_private.is_admin()));

-- Explicitly prevent client roles from mutating provider-owned records.
revoke insert, update, delete on public.subscriptions from anon, authenticated;
revoke insert, update, delete on public.payment_transactions from anon, authenticated;
revoke insert, update, delete on public.billing_events from anon, authenticated;
revoke insert, update, delete on public.subscription_usage from anon, authenticated;
revoke insert, update, delete on public.entitlement_overrides from anon, authenticated;
