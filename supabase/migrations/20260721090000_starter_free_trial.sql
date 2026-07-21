-- Give every new signup a 7-day free trial (replaces the ₹499 upfront Starter charge).
-- Existing paid subscriptions and entitlement overrides are untouched.

alter table public.profiles add column if not exists trial_ends_at timestamptz;

-- Start the trial automatically the moment a profile is created (i.e. on signup/login).
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

  insert into public.profiles (id, full_name, role, account_status, trial_ends_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    case when requested_role = 'admin' then 'admin' else 'business_owner' end,
    'active',
    case when requested_role = 'admin' then null else now() + interval '7 days' end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Let an active trial satisfy the same RLS gate a paid subscription does.
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
        (p.trial_ends_at is not null and p.trial_ends_at > now())
        or exists (
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

create index if not exists profiles_trial_ends_idx on public.profiles(trial_ends_at);