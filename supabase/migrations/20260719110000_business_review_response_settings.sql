alter table public.businesses
  add column if not exists review_settings jsonb not null default '{}'::jsonb;

comment on column public.businesses.review_settings is
  'Owner-configured review generation style, rating guidance, tags and safety controls.';
