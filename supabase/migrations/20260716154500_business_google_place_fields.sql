-- Optional Google Places metadata used to resume and verify onboarding selections.

alter table public.businesses add column if not exists google_place_id text;
alter table public.businesses add column if not exists google_maps_url text;
alter table public.businesses add column if not exists latitude double precision;
alter table public.businesses add column if not exists longitude double precision;

create index if not exists businesses_google_place_idx on public.businesses(google_place_id);
