-- ============================================================================
-- A FULL GAME TURNED PEOPLE AWAY, AND A FREED SEAT WAS JUST A HOLE.
--
-- Both halves of the same missing thing. Somebody who wants to play and arrives
-- at a full game has nowhere to put that intention, and when a seat comes free
-- an hour later nobody is told. A waiting list closes the loop: most drop-outs
-- stop mattering, because the seat refills itself.
--
-- FIRST IN, FIRST PROMOTED, and no host approval anywhere. The order is joined_at
-- and nothing else. That only works if people can see where they stand, so
-- my_waitlist_position() exists and the interface leads with it: somebody who
-- knows they are second will keep the evening free, and somebody who knows they
-- are ninth will not.
--
-- WHY A SEPARATE TABLE, again. game_players is the predicate behind is_in_game(),
-- which RLS uses to decide who may read a game's thread. Put people who are
-- merely waiting into that table and every one of them can read the messages,
-- silently, with nothing raising an error anywhere.
--
-- PROMOTION IS A TRIGGER, not a line inside leave_game. Seats empty in more than
-- one way, including a member deleting their account, and an invariant that
-- depends on whoever remembered to call the helper is not an invariant. It fires
-- on delete only, so the insert it performs cannot re-enter it.
--
-- IT COUNTS SEATS DIRECTLY instead of reading games.taken. Two AFTER DELETE
-- triggers on the same table fire in name order, so depending on which name
-- sorts first this could see a stale taken and decide the game was still full.
-- Counting is a few microseconds and removes the whole class of problem.
--
-- THREE THINGS PROMOTION REFUSES TO DO, each of which would otherwise create a
-- failure the design cannot recover from:
--
--   It re-checks the level. join_game tests the player's level for that sport
--   against the host's range. Somebody who joined the list at level 3 and has
--   since moved to 5 is now outside it, and seating them would put a person in a
--   game the front door would have refused. They are skipped rather than
--   removed, because the host may widen the range later.
--
--   It refuses to seat anybody who is already in a game at that time. Promoting
--   someone into two games at seven on Thursday is a manufactured no-show.
--
--   And when it does seat somebody, it clears their waiting list entries for
--   games that clash with the one they just got into.
--
-- The list is capped at ten. Beyond that it stops being a waiting list and
-- becomes a queue of people who are going to be disappointed.
-- ============================================================================

create table public.waitlist (
  game_id   uuid not null references public.games (id)    on delete cascade,
  player_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (game_id, player_id)
);

comment on table public.waitlist is
  'Who is waiting for a place, and when they started waiting. joined_at is the queue: first in, first promoted, no approval step.';

create index waitlist_queue_idx on public.waitlist (game_id, joined_at);

alter table public.waitlist enable row level security;

-- You can see that you are on a list, and a moderator can see the list. Nobody
-- else needs the names: the count lives on the game row, and your own place
-- comes from my_waitlist_position(). Publishing who wants into which game is a
-- popularity signal nobody asked for.
create policy waitlist_select_self on public.waitlist
  for select using (
    public.is_member() and (player_id = auth.uid() or public.is_moderator())
  );

grant select on public.waitlist to authenticated;

-- ── The count, denormalised for the same reason taken is ───────────────────

alter table public.games
  add column waiting smallint not null default 0 check (waiting >= 0);

comment on column public.games.waiting is
  'How many people are waiting for a place. Denormalised by trigger so "Full, 3 waiting" is a single-row read on a feed, exactly as taken is.';

create or replace function public.sync_game_waiting()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid := coalesce(new.game_id, old.game_id);
begin
  update public.games g
  set waiting = (select count(*) from public.waitlist w where w.game_id = target)
  where g.id = target;
  return null;
end;
$$;

create trigger waitlist_sync_count
  after insert or delete on public.waitlist
  for each row execute function public.sync_game_waiting();

-- ── Joining and leaving the list ───────────────────────────────────────────

create or replace function public.join_waitlist(p_game_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  g public.games;
  me uuid := auth.uid();
  my_level smallint;
  my_name text;
  waiting_now int;
begin
  if me is null or not public.is_member() then
    raise exception 'You need a Deuce account to join a waiting list.'
      using errcode = 'insufficient_privilege';
  end if;

  select * into g from public.games where id = p_game_id for update;

  if g.id is null then
    raise exception 'That game no longer exists.' using errcode = 'no_data_found';
  end if;
  if g.status = 'cancelled' then
    raise exception 'That game was cancelled.' using errcode = 'check_violation';
  end if;
  if g.starts_at < now() then
    raise exception 'That game has already started.' using errcode = 'check_violation';
  end if;
  if exists (select 1 from public.game_players where game_id = p_game_id and player_id = me) then
    raise exception 'You are already in this game.' using errcode = 'unique_violation';
  end if;
  if exists (select 1 from public.waitlist where game_id = p_game_id and player_id = me) then
    raise exception 'You are already on the waiting list.' using errcode = 'unique_violation';
  end if;
  if g.taken < g.spots then
    raise exception 'There is still a free place. Join the game instead.'
      using errcode = 'check_violation';
  end if;

  select count(*) into waiting_now from public.waitlist where game_id = p_game_id;
  if waiting_now >= 10 then
    raise exception 'The waiting list for this game is full.' using errcode = 'check_violation';
  end if;

  -- Checked here as well as at promotion, so nobody spends three days waiting
  -- for a game they were never eligible to be promoted into.
  select case when g.sport = 'tennis' then p.tennis_level else p.padel_level end,
         p.first_name
    into my_level, my_name
    from public.profiles p where p.id = me;

  if my_level is null then
    raise exception 'You have not set a % level yet. Add one on your profile and you can wait for a place.',
      case when g.sport = 'tennis' then 'tennis' else 'padel' end
      using errcode = 'check_violation';
  end if;
  if my_level < g.level_min or my_level > g.level_max then
    raise exception 'This game is for levels % to %, and your % level is %.',
      g.level_min, g.level_max,
      case when g.sport = 'tennis' then 'tennis' else 'padel' end,
      my_level
      using errcode = 'check_violation';
  end if;

  insert into public.waitlist (game_id, player_id) values (p_game_id, me);

  insert into public.notifications (user_id, kind, game_id, actor_id, body)
  values (
    g.host_id, 'waitlist_joined', p_game_id, me,
    coalesce(my_name, 'Somebody') || ' is waiting for a place in your game.'
  );
end;
$$;

create or replace function public.leave_waitlist(p_game_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  delete from public.waitlist where game_id = p_game_id and player_id = me;
  if not found then
    raise exception 'You are not on that waiting list.' using errcode = 'no_data_found';
  end if;
end;
$$;

-- Null when you are not on the list. This is the number the interface leads
-- with, because first-in-first-out is only fair if you can see your place in it.
create or replace function public.my_waitlist_position(p_game_id uuid)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select t.pos from (
    select w.player_id,
           row_number() over (order by w.joined_at, w.player_id)::int as pos
    from public.waitlist w
    where w.game_id = p_game_id
  ) t
  where t.player_id = auth.uid();
$$;

-- ── Promotion ──────────────────────────────────────────────────────────────

create or replace function public.promote_from_waitlist(p_game_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  g public.games;
  seated int;
  cand record;
  cand_level smallint;
  cand_name text;
begin
  select * into g from public.games where id = p_game_id for update;
  if g.id is null or g.status = 'cancelled' then return; end if;
  if g.starts_at < now() then return; end if;

  -- Counted, not read from games.taken. See the header.
  select count(*) into seated from public.game_players where game_id = p_game_id;
  if seated >= g.spots then return; end if;

  for cand in
    select w.player_id from public.waitlist w
    where w.game_id = p_game_id
    order by w.joined_at, w.player_id
  loop
    -- Already in the game somehow: tidy the stale row and keep looking.
    if exists (select 1 from public.game_players gp
               where gp.game_id = p_game_id and gp.player_id = cand.player_id) then
      delete from public.waitlist where game_id = p_game_id and player_id = cand.player_id;
      continue;
    end if;

    select case when g.sport = 'tennis' then p.tennis_level else p.padel_level end,
           p.first_name
      into cand_level, cand_name
      from public.profiles p
      where p.id = cand.player_id
        and p.onboarded_at is not null
        and p.banned_at is null;

    -- Skipped, not removed. The host may widen the range later.
    if cand_level is null or cand_level < g.level_min or cand_level > g.level_max then
      continue;
    end if;

    -- Already playing something else at that hour.
    if exists (
      select 1
      from public.game_players gp
      join public.games o on o.id = gp.game_id
      where gp.player_id = cand.player_id
        and o.id <> p_game_id
        and o.status <> 'cancelled'
        and tstzrange(o.starts_at, o.starts_at + make_interval(mins => o.minutes))
         && tstzrange(g.starts_at, g.starts_at + make_interval(mins => g.minutes))
    ) then
      continue;
    end if;

    insert into public.game_players (game_id, player_id, is_host)
    values (p_game_id, cand.player_id, false);

    delete from public.waitlist where game_id = p_game_id and player_id = cand.player_id;

    -- They cannot be in two places at seven, so stop them waiting for one.
    delete from public.waitlist w
    using public.games o
    where w.player_id = cand.player_id
      and w.game_id = o.id
      and o.id <> p_game_id
      and tstzrange(o.starts_at, o.starts_at + make_interval(mins => o.minutes))
       && tstzrange(g.starts_at, g.starts_at + make_interval(mins => g.minutes));

    insert into public.notifications (user_id, kind, game_id, actor_id, body)
    values (
      cand.player_id, 'waitlist_promoted', p_game_id, g.host_id,
      'A place came free and you are in the game. Leave it now if you can no longer make it.'
    );

    insert into public.notifications (user_id, kind, game_id, actor_id, body)
    values (
      g.host_id, 'game_joined', p_game_id, cand.player_id,
      coalesce(cand_name, 'Somebody') || ' came off the waiting list into your game.'
    );

    return; -- One seat, one promotion.
  end loop;
end;
$$;

create or replace function public.promote_on_seat_freed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.promote_from_waitlist(old.game_id);
  return null;
end;
$$;

create trigger game_players_promote_waitlist
  after delete on public.game_players
  for each row execute function public.promote_on_seat_freed();

-- ── Cancelling a game has to tell the people waiting for it ────────────────
--
-- Recreated whole rather than patched, because a cancelled game that leaves ten
-- people waiting for a place in it is worse than one that never had a list.

create or replace function public.cancel_game(p_game_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  g public.games;
  me uuid := auth.uid();
begin
  select * into g from public.games where id = p_game_id for update;
  if g.id is null then
    raise exception 'That game no longer exists.' using errcode = 'no_data_found';
  end if;
  if g.host_id <> me then
    raise exception 'Only the host can cancel this game.' using errcode = 'insufficient_privilege';
  end if;
  if g.status = 'cancelled' then
    return; -- Idempotent: a double-click must not fan out two rounds of notices.
  end if;

  update public.games
  set status = 'cancelled',
      cancelled_at = now(),
      cancelled_reason = nullif(trim(coalesce(p_reason, '')), '')
  where id = p_game_id;

  insert into public.notifications (user_id, kind, game_id, actor_id, body)
  select gp.player_id, 'game_cancelled', p_game_id, me,
         'The host cancelled this game.'
           || case when nullif(trim(coalesce(p_reason, '')), '') is null then ''
                   else ' Reason: ' || trim(p_reason) end
  from public.game_players gp
  where gp.game_id = p_game_id and gp.player_id <> me;

  -- The waiting list is told too, and then it is emptied. Leaving people queued
  -- for a game that will never happen is the cruellest possible default.
  insert into public.notifications (user_id, kind, game_id, actor_id, body)
  select w.player_id, 'game_cancelled', p_game_id, me,
         'The host cancelled this game, so the waiting list has closed.'
  from public.waitlist w
  where w.game_id = p_game_id;

  delete from public.waitlist where game_id = p_game_id;

  insert into public.messages (game_id, sender_id, body, is_system)
  values (p_game_id, null, 'This game was cancelled by the host.', true);
end;
$$;

grant execute on function public.join_waitlist(uuid)          to authenticated;
grant execute on function public.leave_waitlist(uuid)         to authenticated;
grant execute on function public.my_waitlist_position(uuid)   to authenticated;
