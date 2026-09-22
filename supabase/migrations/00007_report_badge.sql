-- ============================================================================
-- A COUNT OF REPORTS THE MODERATOR HAS NOT LOOKED AT YET.
--
-- The alerts badge counts notifications a member has not read. Reports need the
-- same thing, but they are not notifications and should not be mixed into that
-- count: a moderator's queue is a different job from their own games, and a
-- number that combined the two would mean nothing.
--
-- So the moderator carries a single timestamp for when they last opened the
-- queue, and the badge counts open reports filed since. Opening the page moves
-- the timestamp, which is what clears the badge.
-- ============================================================================

alter table public.profiles
  add column reports_seen_at timestamptz;

comment on column public.profiles.reports_seen_at is
  'When this moderator last opened the queue. Only the badge count uses it.';

/**
 * The badge number.
 *
 * SECURITY DEFINER because the nav asks for this on every page load, including
 * for members who are not moderators and cannot read `reports` at all. Rather
 * than failing their query, it answers zero for anybody who is not a moderator.
 */
create or replace function public.unseen_report_count()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when not public.is_moderator() then 0
    else (
      select count(*)::int
      from public.reports r
      where r.status = 'open'
        and r.created_at > coalesce(
          (select p.reports_seen_at from public.profiles p where p.id = auth.uid()),
          '-infinity'::timestamptz
        )
    )
  end;
$$;

/** Called when the queue is opened. Clears the badge and nothing else. */
create or replace function public.mark_reports_seen()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_moderator() then
    return;
  end if;
  update public.profiles set reports_seen_at = now() where id = auth.uid();
end;
$$;

grant execute on function public.unseen_report_count() to authenticated;
grant execute on function public.mark_reports_seen()  to authenticated;
