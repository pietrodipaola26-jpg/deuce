-- ============================================================================
-- ONE PERSON'S WORD WAS BECOMING SOMEBODY ELSE'S PERMANENT RECORD.
--
-- mark_attendance had three rules: host only, after the game, and nobody may
-- mark themselves. Each is defensible alone and together they produced three bad
-- outcomes.
--
--   A HOST WHO DOES NOT TURN UP WAS INVISIBLE. They booked the court, four
--   people arranged an evening around it, and the schema had no way to record
--   that they were not there. The worst kind of no-show, and the only kind the
--   system could not see.
--
--   ONE UNVERIFIED CLAIM BECAME A FACT. A host could mark anybody absent with no
--   second opinion. Consider the order of events: somebody has a bad experience
--   with a host and files a report; the host, who can see who was in their game,
--   marks that person absent; their reliability drops in public, and a moderator
--   reading the report sees a number that looks like corroboration. The
--   retaliation vector pointed exactly at the person the safety system exists to
--   protect.
--
--   AND MOSTLY IT DID NOT HAPPEN. Optional, manual, after the fact, one person.
--   Reliability stayed null for nearly everybody, so the number built to answer
--   "is it safe to meet this stranger" showed nothing.
--
-- ANYBODY WHO WAS THERE CAN NOW SAY WHO ELSE WAS, INCLUDING ABOUT THE HOST.
-- Four people asked instead of one, which raises the response rate as a side
-- effect of being fairer.
--
-- THE TWO RULES ARE DELIBERATELY ASYMMETRIC.
--
--   played    one signal is enough. Nobody is harmed by being recorded present,
--             and requiring two would mean most games record nothing at all.
--   no_show   two signals that AGREE, and nobody saying otherwise. One voice is
--             an allegation, not evidence, and if anybody says the person was
--             there it stays unknown.
--
-- Being wrongly marked absent costs somebody their reputation with no way to
-- answer back. Missing a real no-show costs a count. Those harms are not
-- symmetrical and the rules should not be either.
--
-- SEVEN DAYS, then it closes. Open for ever invites grudges: somebody loses an
-- argument in a thread in November and goes back to mark a no-show in September.
--
-- game_players.attendance IS NOW DERIVED and never written by hand. A trigger
-- recomputes it from the signals, so the verdict cannot disagree with the
-- evidence, and player_stats keeps working untouched.
-- ============================================================================

create table public.attendance_reports (
  game_id     uuid not null references public.games (id)    on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  subject_id  uuid not null references public.profiles (id) on delete cascade,

  -- 'unknown' is not something anybody asserts. Withdrawing is a delete.
  state public.attendance not null check (state in ('played', 'no_show')),

  created_at timestamptz not null default now(),

  primary key (game_id, reporter_id, subject_id),
  constraint attendance_reports_no_self check (reporter_id <> subject_id)
);

comment on table public.attendance_reports is
  'Who says who turned up. One row per reporter per subject per game. The verdict on game_players is derived from these and never written directly.';

create index attendance_reports_subject_idx on public.attendance_reports (game_id, subject_id);

alter table public.attendance_reports enable row level security;

-- You see what you said; a moderator sees everything, because a disputed
-- no-show has to be readable by somebody. Nobody else needs the raw votes: the
-- derived verdict is the public fact.
create policy attendance_reports_select_own on public.attendance_reports
  for select using (
    public.is_member() and (reporter_id = auth.uid() or public.is_moderator())
  );

grant select on public.attendance_reports to authenticated;

-- == The verdict, derived ===================================================

create or replace function public.sync_attendance(p_game_id uuid, p_subject uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  said_played int;
  said_missed int;
begin
  select count(*) filter (where r.state = 'played'),
         count(*) filter (where r.state = 'no_show')
    into said_played, said_missed
  from public.attendance_reports r
  where r.game_id = p_game_id and r.subject_id = p_subject;

  -- The cast is required. A CASE over string literals is text, and assigning
  -- text to an enum column is an error rather than a coercion. Same trap that
  -- broke sync_game_seat_count() in 00001 and the VALUES lists in 00009/00013.
  update public.game_players gp
  set attendance = (case
        when said_missed >= 2 and said_played = 0 then 'no_show'
        when said_played >= 1 and said_missed = 0 then 'played'
        else 'unknown'
      end)::public.attendance
  where gp.game_id = p_game_id and gp.player_id = p_subject;
end;
$fn$;

create or replace function public.attendance_reports_sync()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  perform public.sync_attendance(
    coalesce(new.game_id, old.game_id),
    coalesce(new.subject_id, old.subject_id)
  );
  return null;
end;
$fn$;

create trigger attendance_reports_recount
  after insert or update or delete on public.attendance_reports
  for each row execute function public.attendance_reports_sync();

-- == Saying who turned up ===================================================
--
-- Same name and signature as before, so nothing calling it has to change.
-- Everything about who may call it is different.

drop function if exists public.mark_attendance(uuid, uuid, public.attendance);

create or replace function public.mark_attendance(
  p_game_id uuid,
  p_player_id uuid,
  p_state public.attendance
)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  g public.games;
  me uuid := auth.uid();
begin
  if me is null or not public.is_member() then
    raise exception 'You need a Deuce account to do that.' using errcode = 'insufficient_privilege';
  end if;

  select * into g from public.games where id = p_game_id;
  if g.id is null then
    raise exception 'That game no longer exists.' using errcode = 'no_data_found';
  end if;
  if g.status = 'cancelled' then
    raise exception 'That game was cancelled, so nobody was expected.' using errcode = 'check_violation';
  end if;

  -- Anybody who was there. Not only the host.
  if not exists (select 1 from public.game_players where game_id = p_game_id and player_id = me) then
    raise exception 'Only somebody who was in the game can say who turned up.'
      using errcode = 'insufficient_privilege';
  end if;

  if not public.game_has_ended(p_game_id) then
    raise exception 'You can say who turned up once the game has finished.'
      using errcode = 'check_violation';
  end if;

  if now() > g.starts_at + make_interval(mins => g.minutes) + interval '7 days' then
    raise exception 'That game was more than a week ago.' using errcode = 'check_violation';
  end if;

  if p_player_id = me then
    raise exception 'You cannot mark yourself.' using errcode = 'check_violation';
  end if;

  if not exists (select 1 from public.game_players where game_id = p_game_id and player_id = p_player_id) then
    raise exception 'That player was not in this game.' using errcode = 'no_data_found';
  end if;

  if p_state = 'unknown' then
    delete from public.attendance_reports
    where game_id = p_game_id and reporter_id = me and subject_id = p_player_id;
  else
    insert into public.attendance_reports (game_id, reporter_id, subject_id, state)
    values (p_game_id, me, p_player_id, p_state)
    on conflict (game_id, reporter_id, subject_id)
      do update set state = excluded.state, created_at = now();
  end if;
end;
$fn$;

-- == Reading ================================================================

create or replace function public.my_attendance_marks(p_game_id uuid)
returns table (subject_id uuid, state public.attendance)
language sql
stable
security definer
set search_path = ''
as $fn$
  select r.subject_id, r.state
  from public.attendance_reports r
  where r.game_id = p_game_id and r.reporter_id = auth.uid();
$fn$;

-- The raw votes, for a moderator reading a disputed case. This is the whole
-- reason for keeping signals rather than only a verdict: "two said absent and
-- one said present" is a different situation from "one said absent", and a
-- single derived value cannot tell them apart.
create or replace function public.attendance_signals(p_game_id uuid)
returns table (reporter_id uuid, subject_id uuid, state public.attendance, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $fn$
begin
  if not public.is_moderator() then
    raise exception 'Not yours to read.' using errcode = 'insufficient_privilege';
  end if;

  return query
  select r.reporter_id, r.subject_id, r.state, r.created_at
  from public.attendance_reports r
  where r.game_id = p_game_id
  order by r.created_at;
end;
$fn$;

grant execute on function public.mark_attendance(uuid, uuid, public.attendance) to authenticated;
grant execute on function public.my_attendance_marks(uuid)  to authenticated;
grant execute on function public.attendance_signals(uuid)   to authenticated;
