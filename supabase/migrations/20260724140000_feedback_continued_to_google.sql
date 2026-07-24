-- Reviews feed only includes drafts the customer copied and continued to Google with.

alter table public.customer_feedback
  add column if not exists continued_to_google boolean not null default false;

create index if not exists customer_feedback_continued_to_google_idx
  on public.customer_feedback(business_id, continued_to_google, created_at desc)
  where continued_to_google = true;

-- Best-effort backfill from prior Google redirect events (same visitor session).
update public.customer_feedback cf
set continued_to_google = true
where cf.submitted_privately = false
  and cf.final_edited_text is not null
  and exists (
    select 1
    from public.analytics_events ae
    where ae.business_id = cf.business_id
      and ae.event_type = 'google_redirect_clicked'
      and ae.visitor_session_id is not null
      and ae.visitor_session_id = cf.visitor_session_id
  );
