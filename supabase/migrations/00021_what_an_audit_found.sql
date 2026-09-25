-- ============================================================================
-- WHAT AN AUDIT FOUND, AND WHAT IT COST TO CLOSE.
--
-- Every table in this schema had RLS enabled and every SECURITY DEFINER
-- function pinned its search_path. Read access was airtight: an ordinary member
-- signed in with the publishable key could not see one row of anybody else's
-- ratings, withdrawals, waitlist entries, notifications or attendance reports,
-- and the anon key could not see the schema at all.
--
-- Three things were still open, and they were open for the same reason: RLS
-- restricts WHICH ROWS you may touch, and says nothing about WHICH COLUMNS or
-- BY WHAT ROUTE. Every finding below is a place where owning the row was
-- mistaken for being allowed to do anything to it.
-- ============================================================================


-- ── 1. A member could make themselves a moderator ───────────────────────────
--
-- The profiles policy was `update ... using (id = auth.uid())`, which is the
-- correct row rule and a complete blank cheque on columns. So this succeeded
-- from the browser console, with the key that ships in the client bundle:
--
--   update profiles set is_moderator = true where id = auth.uid();
--
-- That is every report, every withdrawal, every logged error, the whole of
-- /numbers, and the power to resolve reports and rewrite venues. It was the
-- single worst defect in the schema and it was one statement away.
--
-- The fix is a column-level grant, not a trigger, because a grant is checked by
-- the privilege system before RLS is ever consulted and cannot be forgotten by
-- a future policy. It also fails CLOSED: a column added to profiles tomorrow is
-- unwritable until somebody grants it deliberately, which is the right default
-- for a table that carries a privilege flag and a ban.
--
-- The eleven columns below are exactly what onboardMember() and updateProfile()
-- in src/lib/actions/profile.ts write. is_moderator, banned_at, banned_reason
-- and the timestamps are deliberately absent: they are moderation state, and
-- moderation goes through SECURITY DEFINER functions that run as the owner and
-- are unaffected by any of this.

revoke update on public.profiles from authenticated;

grant update (
  first_name, last_initial, tennis_level, padel_level, languages,
  programme, study_year, bio,
  terms_accepted_at, age_confirmed_at, onboarded_at
) on public.profiles to authenticated;


-- ── 2. The withdrawal record was one DELETE away from meaningless ───────────
--
-- 00016 exists so that walking out of a game two hours before it starts leaves
-- a mark. leave_game() writes the withdrawals row and THEN frees the seat, in
-- one transaction, which is right.
--
-- But game_players also carried `delete using (player_id = auth.uid() and not
-- is_host)`, so a member could skip the function and remove their own seat
-- directly. Measured on a full game with four people waiting:
--
--   seat gone, waitlist 4 -> 3, game still reads 4/4, withdrawals: 0
--
-- The waitlist trigger backfilled the seat, so the game looked untouched, the
-- host was never told, and late_withdrawals and host_reliability on
-- player_stats stayed clean. Every incentive 00016 was built to create was
-- available to opt out of.
--
-- Dropping the policy is the whole fix and it costs nothing, because
-- leave_game() is SECURITY DEFINER: it runs as the owner and never consulted
-- this policy in the first place. Removing it does not remove a capability from
-- a member. It removes the second route to the capability — the one that
-- skipped the bookkeeping.

drop policy if exists game_players_leave on public.game_players;
drop policy if exists "game_players_leave" on public.game_players;

do $$
declare p text;
begin
  -- Named defensively: the policy's name has changed across migrations and what
  -- matters is that no DELETE policy survives, not which one was there.
  for p in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'game_players' and cmd = 'DELETE'
  loop
    execute format('drop policy %I on public.game_players', p);
  end loop;
end $$;

comment on table public.game_players is
  'Seats. Members hold no direct write privilege on this table at all: joining goes through join_game, leaving through leave_game, and promotion through the waitlist trigger. That is deliberate — every one of those routes has bookkeeping attached, and a direct write would skip it.';


-- ── 3. A host could rewrite a game after people had committed to it ─────────
--
-- games carried `update using (host_id = auth.uid())`, again correct on rows and
-- silent on columns. So the host of a game three other people had joined could
-- move the price to EUR 399 and the start time three days later, in one
-- statement, with nobody notified.
--
-- This is not a hypothetical abuse. It is the ordinary shape of a mistake: a
-- host whose court booking changes edits the game, and three people turn up on
-- the wrong day because the card they read is not the card that exists now.
--
-- THE RULE. Before anybody else has a seat, the host may change anything — it is
-- still just a draft with their own name on it. From the moment a second person
-- joins, the terms they agreed to are frozen: where, when, how long, what
-- surface, what roof, what level, and what it costs. The host can still edit the
-- note, still add what they are bringing, still open more seats, and still
-- cancel — and cancelling already tells everybody, which is exactly why it is
-- the honest way out of a game whose terms no longer work.
--
-- ASSUMPTION WORTH NAMING: the alternative design is to permit the edit and
-- notify every player. That is friendlier to the host and worse for the player,
-- because a notification is something you might not read, and this is a
-- commitment to be somewhere. Refusing the edit is the conservative default;
-- say so and it becomes permit-and-notify instead.
--
-- Increases to `spots` are exempt: opening a fifth seat harms nobody and is the
-- one edit a filling game genuinely needs. Decreases are not, because they would
-- strand somebody who already has a seat.

create or replace function public.games_terms_are_frozen_once_joined()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  others int;
begin
  -- WHO THIS RULE BINDS. Only requests arriving through the API as an end user.
  --
  -- The rule exists to stop a HOST rewriting terms, and a host always arrives as
  -- `authenticated`. The operator, a migration, and any SECURITY DEFINER function
  -- run as the owner, and they are trusted — the RLS policy this trigger backs up
  -- (`host_id = auth.uid()`) is itself bypassed by the table owner, so binding the
  -- owner here would make the trigger stricter than the thing it reinforces, and
  -- would mean correcting one wrong start time in production required disabling a
  -- trigger. The schema tests move a game into the past for exactly that reason.
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  -- The seat-count and waiting triggers update this table constantly. They only
  -- ever touch taken and waiting, so checking whether a frozen column actually
  -- CHANGED means this guard costs one comparison on those writes and never
  -- fires on them. No role test needed, which is what keeps it honest: the rule
  -- is about the edit, not about who is making it.
  if  new.venue_id  is not distinct from old.venue_id
  and new.sport     is not distinct from old.sport
  and new.surface   is not distinct from old.surface
  and new.indoor    is not distinct from old.indoor
  and new.starts_at is not distinct from old.starts_at
  and new.minutes   is not distinct from old.minutes
  and new.level_min is not distinct from old.level_min
  and new.level_max is not distinct from old.level_max
  and new.total_cents is not distinct from old.total_cents
  and new.spots     >= old.spots
  then
    return new;
  end if;

  select count(*) into others
  from public.game_players gp
  where gp.game_id = old.id and gp.player_id <> old.host_id;

  if others > 0 then
    raise exception
      'Somebody has already joined this game, so its time, court, level and price are fixed. Cancel it instead — everyone gets told, and you can post the new one.'
      using errcode = 'check_violation';
  end if;

  return new;
end $$;

drop trigger if exists games_terms_are_frozen_once_joined on public.games;
create trigger games_terms_are_frozen_once_joined
  before update on public.games
  for each row execute function public.games_terms_are_frozen_once_joined();


-- ── 4. Five tables were defended by one layer instead of two ───────────────
--
-- Every table from 00001 has its grants to anon revoked, so an unauthenticated
-- caller is refused by the privilege system before RLS is consulted. The five
-- tables added later kept Supabase's default blanket grant and were held by RLS
-- alone.
--
-- Nothing leaked: their policies all resolve is_moderator() or auth.uid(),
-- which are false and null for anon, and every one of them returned zero rows
-- under test. This is not a fix for a leak. It is putting the newer tables back
-- on the same two-layer footing as the older ones, so that the day somebody
-- writes a more permissive policy, the grant is still standing behind it.
--
-- authenticated keeps nothing here either. Every write to these five tables
-- already goes through a SECURITY DEFINER function, which is why revoking is
-- invisible to the application: record_error, record_game_view, mark_attendance,
-- leave_game, join_waitlist and leave_waitlist all run as the owner.

revoke all on public.error_log          from anon, authenticated;
revoke all on public.game_views         from anon, authenticated;
revoke all on public.withdrawals        from anon, authenticated;
revoke all on public.waitlist           from anon, authenticated;
revoke all on public.attendance_reports from anon, authenticated;

-- The SELECT policies on these tables are how a moderator reads them through
-- the API, and how a member reads their own waitlist position and attendance
-- marks, so the select privilege goes back. Nothing else does.
grant select on public.error_log          to authenticated;
grant select on public.game_views         to authenticated;
grant select on public.withdrawals        to authenticated;
grant select on public.waitlist           to authenticated;
grant select on public.attendance_reports to authenticated;
