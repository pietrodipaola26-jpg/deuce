-- ============================================================================
-- MODERATION THAT DOES SOMETHING.
--
-- Until now, upholding a report incremented a counter on a public profile and
-- nothing else. The community rules promised a warning, a suspension and a
-- removal, and the product could deliver none of them. This migration closes
-- that gap, and the rules page is rewritten in the same commit to describe what
-- actually happens rather than an escalation ladder that did not exist.
--
-- A moderator now resolves a report one of three ways: a warning, a ban, or a
-- dismissal, each carrying a written reason. The reason is not decoration. It is
-- what the person is told, and it is the only record of why a decision was made.
-- ============================================================================

-- ── How a report ends ───────────────────────────────────────────────────────

/**
 * The outcome sits BESIDE the status rather than replacing it.
 *
 * `status` stays the lifecycle ('open' -> 'actioned' or 'dismissed') and
 * `outcome` says which action was taken. Keeping them separate means
 * `player_stats`, which counts reports with status 'actioned', keeps working
 * untouched and keeps meaning the same thing: a report a moderator agreed with.
 */
create type public.report_outcome as enum ('warning', 'ban');

alter table public.reports
  add column outcome public.report_outcome,
  add column resolution_note text check (char_length(resolution_note) <= 1000);

comment on column public.reports.outcome is
  'What the moderator did. NULL while open, and NULL when dismissed.';
comment on column public.reports.resolution_note is
  'Why. Shown to the reporter and, for a warning or ban, to the subject.';

-- An outcome only exists on an upheld report, and a resolved report says when.
alter table public.reports add constraint reports_outcome_matches_status check (
  (status = 'open'      and outcome is null and resolved_at is null)
  or (status = 'actioned'  and outcome is not null)
  or (status = 'dismissed' and outcome is null)
);

-- ── Being banned ────────────────────────────────────────────────────────────

alter table public.profiles
  add column banned_at timestamptz,
  add column banned_reason text check (char_length(banned_reason) <= 1000);

comment on column public.profiles.banned_at is
  'Set by resolve_report. A banned account keeps its row so its record survives, and is_member() refuses it everything.';

/**
 * A BAN IS ENFORCED IN ONE PLACE.
 *
 * Every read policy and every write path in this schema asks `is_member()`, so
 * adding the ban check here bans somebody from the entire product in a single
 * expression rather than in forty policies that could each be forgotten.
 *
 * The account is not deleted. Their record has to survive, because the people
 * they played with keep their own history, and because a ban that erased the
 * evidence for it would be unreviewable.
 */
create or replace function public.is_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.onboarded_at is not null
      and p.banned_at is null
  );
$$;

/**
 * Posting to a thread needs membership as well as participation.
 *
 * `is_in_game()` only asks whether somebody holds a seat, and a banned player
 * still holds theirs — so without this they could keep writing into the thread
 * of a game they had already been banned over. The seat is deliberately not
 * removed: the other players need to know who was meant to be there.
 */
drop policy messages_insert_participants on public.messages;

create policy messages_insert_participants on public.messages
  for insert with check (
    public.is_member()
    and public.is_in_game(game_id)
    and sender_id = auth.uid()
    and is_system = false
    and exists (
      select 1 from public.games g
      where g.id = game_id
        and g.starts_at + make_interval(mins => g.minutes) > now() - interval '24 hours'
    )
  );

-- ── Telling people what happened ────────────────────────────────────────────

alter type public.notification_kind add value 'report_filed';
alter type public.notification_kind add value 'report_resolved';
alter type public.notification_kind add value 'moderation_decision';
