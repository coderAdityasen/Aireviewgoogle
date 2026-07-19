alter table public.businesses
  add column if not exists poster_settings jsonb not null default '{}'::jsonb;

comment on column public.businesses.poster_settings is
  'Owner-editable QR poster configuration. Contains only public presentation settings and public storage URLs.';
