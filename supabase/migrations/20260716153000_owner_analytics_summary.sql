-- Performance support for owner analytics.
-- The Supabase CLI is not available in this workspace, so this migration was
-- created with the same timestamped naming convention used by the project.

create index if not exists analytics_events_business_created_idx
  on public.analytics_events (business_id, created_at desc);

create index if not exists visitor_sessions_business_last_seen_idx
  on public.visitor_sessions (business_id, last_seen_at desc);

drop function if exists public.get_owner_analytics_summary(timestamptz, uuid);

create or replace function public.get_owner_analytics_summary(
  p_since timestamptz,
  p_business_id uuid default null,
  p_days integer default 14
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
with scoped_businesses as (
  select b.id, b.name, b.is_active
  from public.businesses b
  where b.owner_id = (select auth.uid())
    and (p_business_id is null or b.id = p_business_id)
),
scoped_events as (
  select e.event_type, e.created_at, e.business_id
  from public.analytics_events e
  join scoped_businesses b on b.id = e.business_id
  where e.created_at >= p_since
),
scoped_sessions as (
  select s.id, s.device_type
  from public.visitor_sessions s
  join scoped_businesses b on b.id = s.business_id
  where s.last_seen_at >= p_since
),
scoped_feedback as (
  select f.rating, f.submitted_privately
  from public.customer_feedback f
  join scoped_businesses b on b.id = f.business_id
  where f.created_at >= p_since
),
activity as (
  select
    series.day::date as day,
    count(e.*) filter (where e.event_type = 'qr_scan') as scans,
    count(e.*) filter (where e.event_type = 'google_redirect_clicked') as redirects
  from generate_series(greatest(p_since::date, current_date - greatest(1, least(p_days, 90)) + 1), current_date, interval '1 day') as series(day)
  left join scoped_events e
    on e.created_at >= series.day
   and e.created_at < series.day + interval '1 day'
  group by series.day
)
select jsonb_build_object(
  'businesses', coalesce((
    select jsonb_agg(jsonb_build_object('id', b.id, 'name', b.name, 'is_active', b.is_active) order by b.name)
    from scoped_businesses b
  ), '[]'::jsonb),
  'counts', jsonb_build_object(
    'qr_scan', (select count(*) from scoped_events where event_type = 'qr_scan'),
    'page_view', (select count(*) from scoped_events where event_type = 'page_view'),
    'feedback_started', (select count(*) from scoped_events where event_type = 'feedback_started'),
    'feedback_completed', (select count(*) from scoped_events where event_type = 'feedback_completed'),
    'review_generated', (select count(*) from scoped_events where event_type = 'review_generated'),
    'review_edited', (select count(*) from scoped_events where event_type = 'review_edited'),
    'review_copied', (select count(*) from scoped_events where event_type = 'review_copied'),
    'google_redirect_clicked', (select count(*) from scoped_events where event_type = 'google_redirect_clicked'),
    'private_feedback_submitted', (select count(*) from scoped_events where event_type = 'private_feedback_submitted')
  ),
  'unique_visitors', (select count(*) from scoped_sessions),
  'average_rating', coalesce((select round(avg(rating)::numeric, 1) from scoped_feedback), 0),
  'private_feedback_count', (select count(*) from scoped_feedback where submitted_privately = true),
  'activity', coalesce((
    select jsonb_agg(jsonb_build_object('day', to_char(a.day, 'YYYY-MM-DD'), 'scans', a.scans, 'redirects', a.redirects) order by a.day)
    from activity a
  ), '[]'::jsonb),
  'by_device', coalesce((
    select jsonb_agg(jsonb_build_object('device', coalesce(s.device_type, 'unknown'), 'count', s.total) order by s.total desc)
    from (
      select device_type, count(*) as total
      from scoped_sessions
      group by device_type
    ) s
  ), '[]'::jsonb)
);
$$;

revoke all on function public.get_owner_analytics_summary(timestamptz, uuid, integer) from public, anon;
grant execute on function public.get_owner_analytics_summary(timestamptz, uuid, integer) to authenticated, service_role;
