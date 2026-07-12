create extension if not exists pgcrypto;

create schema if not exists app_private;
revoke all on schema app_private from public;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'business_owner' check (role in ('admin', 'business_owner')),
  avatar_url text,
  account_status text not null default 'active' check (account_status in ('active', 'suspended')),
  last_activity_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  slug text not null unique,
  category text not null,
  description text,
  services jsonb not null default '[]'::jsonb,
  phone text,
  email text,
  website text,
  address_line text,
  city text,
  state text,
  country text,
  logo_url text,
  brand_color text not null default '#0f766e',
  google_review_url text not null,
  default_language text not null default 'en',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.qr_campaigns (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  public_token text not null unique default encode(gen_random_bytes(16), 'hex'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.visitor_sessions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  qr_campaign_id uuid references public.qr_campaigns(id) on delete set null,
  anonymous_session_id text not null,
  ip_hash text,
  user_agent text,
  device_type text,
  referrer text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  qr_campaign_id uuid references public.qr_campaigns(id) on delete set null,
  visitor_session_id uuid references public.visitor_sessions(id) on delete set null,
  event_type text not null check (
    event_type in (
      'qr_scan',
      'page_view',
      'feedback_started',
      'feedback_completed',
      'review_generated',
      'review_edited',
      'review_copied',
      'google_redirect_clicked',
      'private_feedback_submitted'
    )
  ),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_feedback (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  qr_campaign_id uuid references public.qr_campaigns(id) on delete set null,
  visitor_session_id uuid references public.visitor_sessions(id) on delete set null,
  rating integer not null check (rating between 1 and 5),
  answers jsonb not null default '{}'::jsonb,
  original_notes text,
  generated_draft text,
  final_edited_text text,
  preferred_language text not null default 'en',
  review_length text not null default 'standard' check (review_length in ('short', 'standard', 'detailed')),
  submitted_privately boolean not null default false,
  consent_confirmed boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  feedback_id uuid references public.customer_feedback(id) on delete set null,
  provider text not null,
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  estimated_cost numeric(12, 6) not null default 0,
  status text not null check (status in ('success', 'blocked', 'error')),
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.platform_settings (
  id uuid primary key default gen_random_uuid(),
  setting_key text not null unique,
  setting_value jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.rate_limit_events (
  id uuid primary key default gen_random_uuid(),
  scope text not null,
  subject_hash text not null,
  business_id uuid references public.businesses(id) on delete cascade,
  qr_campaign_id uuid references public.qr_campaigns(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists profiles_status_idx on public.profiles(account_status);
create index if not exists businesses_owner_idx on public.businesses(owner_id);
create index if not exists businesses_status_idx on public.businesses(is_active);
create index if not exists businesses_category_idx on public.businesses(category);
create index if not exists qr_campaigns_business_idx on public.qr_campaigns(business_id);
create index if not exists visitor_sessions_business_idx on public.visitor_sessions(business_id);
create index if not exists visitor_sessions_campaign_idx on public.visitor_sessions(qr_campaign_id);
create index if not exists visitor_sessions_anon_idx on public.visitor_sessions(anonymous_session_id);
create index if not exists analytics_events_business_type_idx on public.analytics_events(business_id, event_type, created_at);
create index if not exists analytics_events_campaign_idx on public.analytics_events(qr_campaign_id, created_at);
create index if not exists customer_feedback_business_idx on public.customer_feedback(business_id, created_at);
create index if not exists ai_usage_business_idx on public.ai_usage_logs(business_id, created_at);
create index if not exists audit_actor_idx on public.audit_logs(actor_id, created_at);
create index if not exists rate_limit_subject_idx on public.rate_limit_events(scope, subject_hash, created_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists businesses_set_updated_at on public.businesses;
create trigger businesses_set_updated_at
before update on public.businesses
for each row execute function public.set_updated_at();

drop trigger if exists qr_campaigns_set_updated_at on public.qr_campaigns;
create trigger qr_campaigns_set_updated_at
before update on public.qr_campaigns
for each row execute function public.set_updated_at();

create or replace function public.set_platform_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists platform_settings_set_updated_at on public.platform_settings;
create trigger platform_settings_set_updated_at
before update on public.platform_settings
for each row execute function public.set_platform_settings_updated_at();

create or replace function public.slugify(input text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(lower(coalesce(input, '')), '[^a-z0-9]+', '-', 'g'));
$$;

create or replace function app_private.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
      and account_status = 'active'
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
    select 1
    from public.profiles
    where id = (select auth.uid())
      and account_status = 'active'
      and role in ('admin', 'business_owner')
  );
$$;

create or replace function app_private.owns_business(target_business_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.businesses
    where id = target_business_id
      and owner_id = (select auth.uid())
  );
$$;

create or replace function app_private.can_access_campaign(target_campaign_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.qr_campaigns qc
    join public.businesses b on b.id = qc.business_id
    where qc.id = target_campaign_id
      and b.owner_id = (select auth.uid())
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
    select 1
    from public.businesses b
    where b.id = target_business_id
      and b.is_active = true
      and (
        target_campaign_id is null
        or exists (
          select 1
          from public.qr_campaigns qc
          where qc.id = target_campaign_id
            and qc.business_id = b.id
            and qc.is_active = true
        )
      )
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$ select app_private.is_admin(); $$;

create or replace function public.owns_business(business_id uuid)
returns boolean
language sql
stable
as $$ select app_private.owns_business(business_id); $$;

create or replace function public.can_access_campaign(campaign_id uuid)
returns boolean
language sql
stable
as $$ select app_private.can_access_campaign(campaign_id); $$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text;
begin
  requested_role := coalesce(new.raw_app_meta_data ->> 'role', 'business_owner');

  insert into public.profiles (id, full_name, role, account_status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    case when requested_role = 'admin' then 'admin' else 'business_owner' end,
    'active'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.qr_campaigns enable row level security;
alter table public.visitor_sessions enable row level security;
alter table public.analytics_events enable row level security;
alter table public.customer_feedback enable row level security;
alter table public.ai_usage_logs enable row level security;
alter table public.audit_logs enable row level security;
alter table public.platform_settings enable row level security;
alter table public.rate_limit_events enable row level security;

grant usage on schema public to anon, authenticated, service_role;
grant usage on schema app_private to anon, authenticated, service_role;

revoke all on function public.is_admin() from public;
revoke all on function public.owns_business(uuid) from public;
revoke all on function public.can_access_campaign(uuid) from public;
revoke all on function app_private.is_admin() from public;
revoke all on function app_private.is_active_owner() from public;
revoke all on function app_private.owns_business(uuid) from public;
revoke all on function app_private.can_access_campaign(uuid) from public;
revoke all on function app_private.public_business_is_active(uuid, uuid) from public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.owns_business(uuid) to authenticated;
grant execute on function public.can_access_campaign(uuid) to authenticated;
grant execute on function app_private.is_admin() to authenticated, service_role;
grant execute on function app_private.is_active_owner() to authenticated, service_role;
grant execute on function app_private.owns_business(uuid) to authenticated, service_role;
grant execute on function app_private.can_access_campaign(uuid) to authenticated, service_role;
grant execute on function app_private.public_business_is_active(uuid, uuid) to anon, authenticated, service_role;

grant select on public.profiles to authenticated;
grant update (full_name, avatar_url, last_activity_at, updated_at) on public.profiles to authenticated;
grant select, insert, update, delete on public.businesses to authenticated;
grant select, insert, update, delete on public.qr_campaigns to authenticated;
grant select on public.visitor_sessions to authenticated;
grant insert (business_id, qr_campaign_id, anonymous_session_id, ip_hash, user_agent, device_type, referrer, first_seen_at, last_seen_at) on public.visitor_sessions to anon;
grant select on public.analytics_events to authenticated;
grant insert (business_id, qr_campaign_id, visitor_session_id, event_type, metadata, created_at) on public.analytics_events to anon;
grant select, update, delete on public.customer_feedback to authenticated;
grant insert (business_id, qr_campaign_id, visitor_session_id, rating, answers, original_notes, generated_draft, final_edited_text, preferred_language, review_length, submitted_privately, consent_confirmed, created_at) on public.customer_feedback to anon;
grant select on public.ai_usage_logs to authenticated;
grant select on public.audit_logs to authenticated;
grant select on public.platform_settings to authenticated;
grant all on public.profiles, public.businesses, public.qr_campaigns, public.visitor_sessions, public.analytics_events, public.customer_feedback, public.ai_usage_logs, public.audit_logs, public.platform_settings, public.rate_limit_events to service_role;

create policy "Profiles can be read by owner"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "Profiles can be read by admins"
on public.profiles
for select
to authenticated
using ((select app_private.is_admin()));

create policy "Profiles can be updated by owner"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id and (select app_private.is_active_owner()))
with check ((select auth.uid()) = id);

create policy "Businesses can be read by owners"
on public.businesses
for select
to authenticated
using (owner_id = (select auth.uid()) and (select app_private.is_active_owner()));

create policy "Businesses can be read by admins"
on public.businesses
for select
to authenticated
using ((select app_private.is_admin()));

create policy "Businesses can be inserted by owners"
on public.businesses
for insert
to authenticated
with check (owner_id = (select auth.uid()) and (select app_private.is_active_owner()));

create policy "Businesses can be updated by owners"
on public.businesses
for update
to authenticated
using (owner_id = (select auth.uid()) and (select app_private.is_active_owner()))
with check (owner_id = (select auth.uid()));

create policy "Businesses can be deleted by owners"
on public.businesses
for delete
to authenticated
using (owner_id = (select auth.uid()) and (select app_private.is_active_owner()));

create policy "Businesses can be managed by admins"
on public.businesses
for all
to authenticated
using ((select app_private.is_admin()))
with check ((select app_private.is_admin()));

create policy "Campaigns can be read by owners"
on public.qr_campaigns
for select
to authenticated
using ((select app_private.owns_business(business_id)) and (select app_private.is_active_owner()));

create policy "Campaigns can be read by admins"
on public.qr_campaigns
for select
to authenticated
using ((select app_private.is_admin()));

create policy "Campaigns can be inserted by owners"
on public.qr_campaigns
for insert
to authenticated
with check ((select app_private.owns_business(business_id)) and (select app_private.is_active_owner()));

create policy "Campaigns can be updated by owners"
on public.qr_campaigns
for update
to authenticated
using ((select app_private.owns_business(business_id)) and (select app_private.is_active_owner()))
with check ((select app_private.owns_business(business_id)));

create policy "Campaigns can be deleted by owners"
on public.qr_campaigns
for delete
to authenticated
using ((select app_private.owns_business(business_id)) and (select app_private.is_active_owner()));

create policy "Campaigns can be managed by admins"
on public.qr_campaigns
for all
to authenticated
using ((select app_private.is_admin()))
with check ((select app_private.is_admin()));

create policy "Visitor sessions can be inserted by public route"
on public.visitor_sessions
for insert
to anon
with check ((select app_private.public_business_is_active(business_id, qr_campaign_id)));

create policy "Visitor sessions can be read by business owners"
on public.visitor_sessions
for select
to authenticated
using (((select app_private.owns_business(business_id)) and (select app_private.is_active_owner())) or (select app_private.is_admin()));

create policy "Analytics can be inserted by public route"
on public.analytics_events
for insert
to anon
with check ((select app_private.public_business_is_active(business_id, qr_campaign_id)));

create policy "Analytics can be read by business owners"
on public.analytics_events
for select
to authenticated
using (((select app_private.owns_business(business_id)) and (select app_private.is_active_owner())) or (select app_private.is_admin()));

create policy "Feedback can be inserted by public route"
on public.customer_feedback
for insert
to anon
with check (consent_confirmed = true and (select app_private.public_business_is_active(business_id, qr_campaign_id)));

create policy "Feedback can be read by business owners"
on public.customer_feedback
for select
to authenticated
using (((select app_private.owns_business(business_id)) and (select app_private.is_active_owner())) or (select app_private.is_admin()));

create policy "Feedback can be updated by business owners"
on public.customer_feedback
for update
to authenticated
using (((select app_private.owns_business(business_id)) and (select app_private.is_active_owner())) or (select app_private.is_admin()))
with check (((select app_private.owns_business(business_id)) and (select app_private.is_active_owner())) or (select app_private.is_admin()));

create policy "Feedback can be deleted by business owners"
on public.customer_feedback
for delete
to authenticated
using (((select app_private.owns_business(business_id)) and (select app_private.is_active_owner())) or (select app_private.is_admin()));

create policy "AI usage can be read by business owners"
on public.ai_usage_logs
for select
to authenticated
using (((select app_private.owns_business(business_id)) and (select app_private.is_active_owner())) or (select app_private.is_admin()));

create policy "Audit logs can be read by admins"
on public.audit_logs
for select
to authenticated
using ((select app_private.is_admin()));

create policy "Platform settings can be read by admins"
on public.platform_settings
for select
to authenticated
using ((select app_private.is_admin()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('business-logos', 'business-logos', true, 2097152, array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Owners can upload their business logos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'business-logos'
  and split_part(name, '/', 1) = (select auth.uid())::text
  and (select app_private.is_active_owner())
);

create policy "Owners can update their business logos"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'business-logos'
  and split_part(name, '/', 1) = (select auth.uid())::text
  and (select app_private.is_active_owner())
)
with check (
  bucket_id = 'business-logos'
  and split_part(name, '/', 1) = (select auth.uid())::text
);

create policy "Owners can delete their business logos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'business-logos'
  and split_part(name, '/', 1) = (select auth.uid())::text
  and (select app_private.is_active_owner())
);

create policy "Public can read business logos"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'business-logos');
