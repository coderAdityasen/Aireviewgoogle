-- Persist AI GMB profile suggestions per business (generated once, no regenerate).

create table if not exists public.gmb_suggestions (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  suggestions jsonb not null default '[]'::jsonb,
  suggestion_count integer not null default 0 check (suggestion_count >= 0),
  provider text not null default 'local-fallback',
  model text not null default 'gmb-heuristics',
  generated_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gmb_suggestions_owner_idx
  on public.gmb_suggestions(owner_id, generated_at desc);

drop trigger if exists gmb_suggestions_set_updated_at on public.gmb_suggestions;
create trigger gmb_suggestions_set_updated_at
  before update on public.gmb_suggestions
  for each row execute function public.set_updated_at();

alter table public.gmb_suggestions enable row level security;

grant select on public.gmb_suggestions to authenticated;
grant all on public.gmb_suggestions to service_role;

create policy "Owners can read their GMB suggestions"
  on public.gmb_suggestions
  for select
  to authenticated
  using (
    owner_id = (select auth.uid())
    and (select app_private.is_active_owner())
  );

create policy "Admins can read all GMB suggestions"
  on public.gmb_suggestions
  for select
  to authenticated
  using ((select app_private.is_admin()));
