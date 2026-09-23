-- ============================================================================
-- LEAVING LATE LEFT NO TRACE, WHICH MADE RELIABILITY A LIE.
--
-- leave_game already worked out whether somebody was dropping out inside twelve
-- hours. It put that fact into a sentence in the host's notification and then
-- deleted the seat row, so nothing about it survived. The consequence was
-- perverse: reliability counted only people who said nothing and failed to turn
-- up, so a member who dropped out of twenty games at two hours' notice scored a
-- flawless 100%, because they never let a no_show be recorded against them.
--
-- WHY A SEPARATE TABLE rather than a soft delete on game_players. That table
-- means "currently seated" and is the predicate behind is_in_game(), which is
-- what RLS uses to decide who may read a game's thread. Widening it is how you
-- accidentally let people who are not in a game read its messages. Its primary
-- key would also stop anybody rejoining a game they had left, which is a thing
-- people genuinely do.
--
-- WHY hours_before IS A NUMBER, not a verdict. Twelve hours is a judgement that
-- may turn out to be wrong, and a boolean cannot be re-examined. Storing the
-- distance means a future migration can move the line, or use two lines, without
-- having thrown the evidence away. was_late is generated from it, so the
-- threshold lives in exactly one place. It goes negative if somebody leaves
-- after the start, which leave_game permits, and negative is late.
--
-- THE SAFETY EXIT. The moment leaving carries a cost, you have built pressure on
-- somebody to attend a game they have become uncomfortable about, and that is
-- the one thing this product cannot do. So there is a door: a withdrawal marked
-- is_safety costs nothing, is invisible to the host as anything other than an
-- ordinary drop-out, and quietly reaches the moderators.
--
-- It is available at ANY notice, which is the reading of "only before the twelve
-- hours" I have taken. The other reading, that the door is only open while you
-- are more than twelve hours out, would lock it exactly when somebody needs it:
-- an early withdrawal already costs nothing, so a safety flag on one changes
-- nothing at all. To switch to that reading, change the line marked SAFETY GATE
-- below to `if p_safety and late then`.
--
-- HOSTS GET A RECORD TOO, framed the right way round. A bare count of
-- cancellations makes hosting feel risky, and a feed with no games in it is the
-- only way Deuce fails. So the profile carries games hosted and games hosted that
-- went ahead, and a percentage, rather than a tally of failures. Cancelling a
-- game that nobody joined is correct behaviour and must not be punished, or hosts
-- will leave dead games on the feed instead.
--
-- Cancellation needs no forgiveness logic: cancel_game marks the game and
-- notifies, it never removes anybody from game_players, so being dumped out of a
-- cancelled game creates no withdrawal row in the first place.
-- ============================================================================

create table public.withdrawals (
  game_id   uuid not null references public.games (id)    on delete cascade,
  player_id uuid not null references public.profiles (id) on delete cascade,
  left_at   timestamptz not null default now(),

  -- How far ahead of the start they left. Negative means after it began.
  hours_before numeric(8, 2) not null,

  -- Marked when the member used the safety exit. Never counts against them, and
  -- never visible to the host or the other players.
  is_safety boolean not null default false,

  was_late boolean generated always as (hours_before < 12) stored,

  -- left_at is in the key so a member can rejoin a game and leave it again.
  primary key (game_id, player_id, left_at)
);

comment on table public.withdrawals is
  'Every drop-out, with how far ahead of the start it happened. Append only. Safety exits are recorded and then excluded from everything that counts.';

create index withdrawals_counted_idx on public.withdrawals (player_id)
  where was_late and not is_safety;

alter table public.withdrawals enable row level security;

-- Nobody reads this table directly except a moderator. Everyone else sees its
-- effect through player_stats, which runs as its owner and is not filtered by
-- this policy. A raw list of who bailed on what is not public information.
create policy withdrawals_select_moderator on public.withdrawals
  for select using (public.is_moderator());

grant select on public.withdrawals to authenticated;

-- ── leave_game, with the record and the door ───────────────────────────────
--
-- The signature changes, so the old one is dropped rather than replaced: adding
-- a parameter to a function creates a second function, and two overloads of
-- leave_game is an ambiguity waiting to be called wrongly.

drop function if exists public.leave_game(uuid);

create or replace function public.leave_game(
  p_game_id uuid,
  p_safety boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  g public.games;
  me uuid := auth.uid();
  my_name text;
  hours numeric(8, 2);
  late boolean;
begin
  select * into g from public.games where id = p_game_id for update;
  if g.id is null then
    raise exception 'That game no longer exists.' using errcode = 'no_data_found';
  end if;
  if g.host_id = me then
    raise exception 'You are hosting this game. Cancel it instead, so everyone is told.'
      using errcode = 'check_violation';
  end if;
  if not exists (select 1 from public.game_players where game_id = p_game_id and player_id = me) then
    raise exception 'You are not in this game.' using errcode = 'no_data_found';
  end if;
  if g.starts_at + make_interval(mins => g.minutes) < now() then
    raise exception 'That game has already been played.' using errcode = 'check_violation';
  end if;

  select first_name into my_name from public.profiles where id = me;

  hours := extract(epoch from (g.starts_at - now())) / 3600.0;
  late  := hours < 12;

  insert into public.withdrawals (game_id, player_id, hours_before, is_safety)
  values (p_game_id, me, hours, coalesce(p_safety, false));

  delete from public.game_players where game_id = p_game_id and player_id = me;

  -- The host is told somebody left. On a safety exit they are told nothing more:
  -- the lateness clause is omitted, because "less than 12 hours before" plus a
  -- silent absence is enough for a host to work out what happened.
  insert into public.notifications (user_id, kind, game_id, actor_id, body)
  values (
    g.host_id,
    'game_left',
    p_game_id,
    me,
    coalesce(my_name, 'Somebody') || ' dropped out of your game.'
      || case when late and not coalesce(p_safety, false)
              then ' Less than 12 hours before it starts.' else '' end
  );

  -- SAFETY GATE. Any notice, deliberately. See the header.
  if coalesce(p_safety, false) then
    insert into public.notifications (user_id, kind, game_id, actor_id, body)
    select p.id, 'safety_exit', p_game_id, me,
           coalesce(my_name, 'A member') || ' left a game and asked a moderator to look at it.'
    from public.profiles p
    where p.is_moderator and p.banned_at is null;
  end if;
end;
$$;

grant execute on function public.leave_game(uuid, boolean) to authenticated;

-- ── player_stats, rebuilt ──────────────────────────────────────────────────
--
-- Dropped and recreated rather than replaced, because the option list and the
-- grant have to be restated exactly and create-or-replace is fussy about column
-- order. The repeated scalar subqueries match the style already in this view.
--
-- reliability now has late withdrawals in its denominator, at the same weight as
-- a no-show for now. no_shows and late_withdrawals are also published separately
-- so anybody reading a profile can weigh the two differently themselves, which
-- is the honest way to present two failures that are not the same failure.

drop view if exists public.player_stats;

create view public.player_stats
with (security_invoker = false)
as
select
  p.id as player_id,

  (select count(*) from public.game_players gp
    where gp.player_id = p.id and gp.attendance = 'played')::int as games_played,

  (select count(*) from public.game_players gp
    where gp.player_id = p.id and gp.attendance = 'no_show')::int as no_shows,

  (select round(avg(r.stars)::numeric, 1) from public.ratings r where r.ratee_id = p.id) as rating,

  (select count(*) from public.ratings r where r.ratee_id = p.id)::int as rating_count,

  (
    select case
      when (
        (select count(*) from public.game_players gp
          where gp.player_id = p.id and gp.attendance in ('played', 'no_show'))
        + (select count(*) from public.withdrawals w
            where w.player_id = p.id and w.was_late and not w.is_safety)
      ) = 0 then null
      else round(
        100.0 * (select count(*) from public.game_players gp
                  where gp.player_id = p.id and gp.attendance = 'played')
        / (
          (select count(*) from public.game_players gp
            where gp.player_id = p.id and gp.attendance in ('played', 'no_show'))
          + (select count(*) from public.withdrawals w
              where w.player_id = p.id and w.was_late and not w.is_safety)
        )
      )::int
    end
  ) as reliability,

  (select count(*) from public.reports rp
    where rp.subject_id = p.id and rp.status = 'actioned')::int as reports,

  -- Published on its own so a reader can weigh it against no_shows themselves.
  (select count(*) from public.withdrawals w
    where w.player_id = p.id and w.was_late and not w.is_safety)::int as late_withdrawals,

  (select count(*) from public.games g where g.host_id = p.id)::int as games_hosted,

  (select count(*) from public.games g
    where g.host_id = p.id
      and g.status <> 'cancelled'
      and g.starts_at + make_interval(mins => g.minutes) < now())::int as games_hosted_played,

  (
    select case
      when (
        (select count(*) from public.games g
          where g.host_id = p.id and g.status <> 'cancelled'
            and g.starts_at + make_interval(mins => g.minutes) < now())
        + (select count(*) from public.games g where g.host_id = p.id and g.status = 'cancelled')
      ) = 0 then null
      else round(
        100.0 * (select count(*) from public.games g
                  where g.host_id = p.id and g.status <> 'cancelled'
                    and g.starts_at + make_interval(mins => g.minutes) < now())
        / (
          (select count(*) from public.games g
            where g.host_id = p.id and g.status <> 'cancelled'
              and g.starts_at + make_interval(mins => g.minutes) < now())
          + (select count(*) from public.games g where g.host_id = p.id and g.status = 'cancelled')
        )
      )::int
    end
  ) as host_reliability

from public.profiles p
where public.is_member();

comment on view public.player_stats is
  'Public reputation: games, rating, reliability including late withdrawals, no-shows and late withdrawals separately, actioned reports, and a hosting record framed as games that went ahead rather than games called off.';

grant select on public.player_stats to authenticated;
