-- ============================================================================
-- THE NUMBERS, FOR THE ONE PERSON WHO SHOULD SEE THEM.
--
-- Not analytics. There is no third party in this file, no pixel, no script, and
-- nothing new is recorded about any member. Every figure below is a query over
-- rows the application already writes in the course of doing its job, which is
-- why this can exist without touching the privacy policy or the claim that Deuce
-- makes no third party network calls.
--
-- THE ONE EXCEPTION IS VIEWS, and it is built to stay out of that category.
-- game_views counts openings of a game page per day with NO user id, no session,
-- no address. A row says "this game was opened eleven times on Tuesday" and
-- cannot say by whom, because nothing identifying is passed to it. That is a
-- counter, not tracking, and it is the difference between "nobody wants this
-- game" and "nobody saw this game", which need opposite responses.
--
-- It also refuses to count the host and anybody already in the game. A host
-- refreshing their own card is not demand, and excluding them makes the number
-- mean something without recording who they are.
--
-- WHO IS EXCLUDED FROM WHAT. Moderator accounts do not count as members, because
-- the founder signing up is not adoption. Their GAMES do count, because a real
-- game posted to get the feed moving is real supply and hiding it would hide
-- exactly the games this product needs first.
--
-- WEEKS RUN MONDAY TO SUNDAY IN MILAN TIME, not UTC, because the question is
-- about a week of somebody's life rather than a week of the server's.
--
-- SAFETY EXITS APPEAR AS A BARE COUNT AND NEVER AS NAMES. The moderator alert
-- already carries the name, which is where it is actionable. A dashboard that
-- lists who used the door turns a safety mechanism into a watchlist, and the
-- entire value of that door is that using it feels free.
-- ============================================================================

-- ── 1. The anonymous view counter ──────────────────────────────────────────

create table public.game_views (
  game_id uuid not null references public.games (id) on delete cascade,
  day date not null,
  views integer not null default 0 check (views >= 0),
  primary key (game_id, day)
);

comment on table public.game_views is
  'Openings of a game page, per day, with no identity attached. Deliberately cannot answer who looked, only how many times it was looked at. Excludes the host and anybody already in the game.';

alter table public.game_views enable row level security;

create policy game_views_select_moderator on public.game_views
  for select using (public.is_moderator());

grant select on public.game_views to authenticated;

/**
 * Count one opening of a game page.
 *
 * Stores nothing about the caller. The identity check happens here, inside the
 * function, and is thrown away: the row that gets written knows only a game, a
 * date and a number.
 */
create or replace function public.record_game_view(p_game_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  g public.games;
  me uuid := auth.uid();
begin
  if me is null or not public.is_member() then return; end if;

  select * into g from public.games where id = p_game_id;
  if g.id is null then return; end if;

  -- A host refreshing their own card is not demand, and neither is somebody
  -- who has already joined coming back to read the thread.
  if g.host_id = me then return; end if;
  if exists (select 1 from public.game_players gp
             where gp.game_id = p_game_id and gp.player_id = me) then
    return;
  end if;

  insert into public.game_views (game_id, day, views)
  values (p_game_id, (now() at time zone 'Europe/Rome')::date, 1)
  on conflict (game_id, day) do update set views = public.game_views.views + 1;
end;
$$;

grant execute on function public.record_game_view(uuid) to authenticated;

-- ── 2. The numbers ─────────────────────────────────────────────────────────
--
-- One row per metric, three columns: all time, this week, last week. A wide
-- single row with thirty columns would be worse to read here and worse to render
-- there, and adding a metric to this shape costs one union branch.
--
-- Week columns are null for metrics that describe a state rather than an event.
-- "Members who have played twice" is not a thing that happened in a week.

create or replace function public.deuce_numbers()
returns table (metric text, all_time bigint, this_week bigint, last_week bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  w_this timestamptz := (date_trunc('week', (now() at time zone 'Europe/Rome')) at time zone 'Europe/Rome');
  w_last timestamptz := (date_trunc('week', (now() at time zone 'Europe/Rome')) at time zone 'Europe/Rome') - interval '7 days';
begin
  if not public.is_moderator() then
    raise exception 'Not yours to read.' using errcode = 'insufficient_privilege';
  end if;

  return query

  -- ── Supply ───────────────────────────────────────────────────────────────
  -- Cast on the first branch only: a UNION takes its column types from the
  -- first arm, and an unquoted literal is 'unknown' until something tells it.
  select 'games_created'::text, count(*),
         count(*) filter (where g.created_at >= w_this),
         count(*) filter (where g.created_at >= w_last and g.created_at < w_this)
  from public.games g

  union all
  select 'games_played', count(*),
         count(*) filter (where g.starts_at >= w_this),
         count(*) filter (where g.starts_at >= w_last and g.starts_at < w_this)
  from public.games g
  where g.status <> 'cancelled'
    and g.starts_at + make_interval(mins => g.minutes) < now()

  union all
  select 'games_cancelled', count(*),
         count(*) filter (where g.cancelled_at >= w_this),
         count(*) filter (where g.cancelled_at >= w_last and g.cancelled_at < w_this)
  from public.games g
  where g.status = 'cancelled'

  union all
  select 'hosts', count(distinct g.host_id),
         count(distinct g.host_id) filter (where g.created_at >= w_this),
         count(distinct g.host_id) filter (where g.created_at >= w_last and g.created_at < w_this)
  from public.games g

  -- ── Demand ───────────────────────────────────────────────────────────────
  union all
  select 'games_filled', count(*),
         count(*) filter (where g.starts_at >= w_this),
         count(*) filter (where g.starts_at >= w_last and g.starts_at < w_this)
  from public.games g
  where g.status <> 'cancelled'
    and g.starts_at + make_interval(mins => g.minutes) < now()
    and g.taken >= g.spots

  union all
  select 'games_short', count(*),
         count(*) filter (where g.starts_at >= w_this),
         count(*) filter (where g.starts_at >= w_last and g.starts_at < w_this)
  from public.games g
  where g.status <> 'cancelled'
    and g.starts_at + make_interval(mins => g.minutes) < now()
    and g.taken < g.spots

  union all
  select 'joins', count(*),
         count(*) filter (where gp.joined_at >= w_this),
         count(*) filter (where gp.joined_at >= w_last and gp.joined_at < w_this)
  from public.game_players gp
  where not gp.is_host

  union all
  select 'waiting_now', count(*), null::bigint, null::bigint
  from public.waitlist

  union all
  select 'views', coalesce(sum(v.views), 0),
         coalesce(sum(v.views) filter (where v.day >= w_this::date), 0),
         coalesce(sum(v.views) filter (where v.day >= w_last::date and v.day < w_this::date), 0)
  from public.game_views v

  -- Minutes from posting a game to its last seat going, median, full games only.
  union all
  select 'median_minutes_to_fill',
         coalesce(round(percentile_cont(0.5) within group (order by t.mins))::bigint, 0),
         null::bigint, null::bigint
  from (
    select extract(epoch from (max(gp.joined_at) - g.created_at)) / 60.0 as mins
    from public.games g
    join public.game_players gp on gp.game_id = g.id
    where g.status <> 'cancelled' and g.taken >= g.spots
    group by g.id, g.created_at
  ) t

  -- ── Health. Moderators are not members. ──────────────────────────────────
  union all
  select 'signups', count(*),
         count(*) filter (where p.created_at >= w_this),
         count(*) filter (where p.created_at >= w_last and p.created_at < w_this)
  from public.profiles p
  where not p.is_moderator

  union all
  select 'onboarded', count(*) filter (where p.onboarded_at is not null),
         count(*) filter (where p.onboarded_at >= w_this),
         count(*) filter (where p.onboarded_at >= w_last and p.onboarded_at < w_this)
  from public.profiles p
  where not p.is_moderator

  union all
  select 'played_once', count(*), null::bigint, null::bigint
  from (
    select gp.player_id
    from public.game_players gp
    join public.games g on g.id = gp.game_id
    join public.profiles p on p.id = gp.player_id
    where not p.is_moderator
      and g.status <> 'cancelled'
      and g.starts_at + make_interval(mins => g.minutes) < now()
    group by gp.player_id
    having count(*) >= 1
  ) a

  union all
  select 'played_twice', count(*), null::bigint, null::bigint
  from (
    select gp.player_id
    from public.game_players gp
    join public.games g on g.id = gp.game_id
    join public.profiles p on p.id = gp.player_id
    where not p.is_moderator
      and g.status <> 'cancelled'
      and g.starts_at + make_interval(mins => g.minutes) < now()
    group by gp.player_id
    having count(*) >= 2
  ) b

  union all
  select 'messages', count(*),
         count(*) filter (where m.created_at >= w_this),
         count(*) filter (where m.created_at >= w_last and m.created_at < w_this)
  from public.messages m
  where not m.is_system

  union all
  select 'late_withdrawals', count(*),
         count(*) filter (where w.left_at >= w_this),
         count(*) filter (where w.left_at >= w_last and w.left_at < w_this)
  from public.withdrawals w
  where w.was_late and not w.is_safety

  -- A count. Never a name. See the header.
  union all
  select 'safety_exits', count(*),
         count(*) filter (where w.left_at >= w_this),
         count(*) filter (where w.left_at >= w_last and w.left_at < w_this)
  from public.withdrawals w
  where w.is_safety

  union all
  select 'no_shows', count(*),
         count(*) filter (where g.starts_at >= w_this),
         count(*) filter (where g.starts_at >= w_last and g.starts_at < w_this)
  from public.game_players gp
  join public.games g on g.id = gp.game_id
  where gp.attendance = 'no_show';
end;
$$;

-- ── 3. The two lists ───────────────────────────────────────────────────────

create or replace function public.deuce_hosts()
returns table (player_id uuid, first_name text, last_initial text, games bigint, played bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_moderator() then
    raise exception 'Not yours to read.' using errcode = 'insufficient_privilege';
  end if;

  return query
  select p.id, p.first_name, p.last_initial,
         count(*)::bigint,
         count(*) filter (
           where g.status <> 'cancelled'
             and g.starts_at + make_interval(mins => g.minutes) < now()
         )::bigint
  from public.games g
  join public.profiles p on p.id = g.host_id
  group by p.id, p.first_name, p.last_initial
  order by count(*) desc, p.first_name
  limit 20;
end;
$$;

create or replace function public.deuce_courts()
returns table (name text, area text, games bigint, played bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_moderator() then
    raise exception 'Not yours to read.' using errcode = 'insufficient_privilege';
  end if;

  return query
  select v.name, v.area,
         count(*)::bigint,
         count(*) filter (
           where g.status <> 'cancelled'
             and g.starts_at + make_interval(mins => g.minutes) < now()
         )::bigint
  from public.games g
  join public.venues v on v.id = g.venue_id
  group by v.name, v.area
  order by count(*) desc, v.name
  limit 20;
end;
$$;

-- Eight weeks, oldest first, for the hand drawn sparkline. Weeks with nothing in
-- them still appear, because a gap in a line is information and a missing point
-- is a lie about the shape.
create or replace function public.deuce_weekly()
returns table (week_start date, games_created bigint, games_played bigint, signups bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_moderator() then
    raise exception 'Not yours to read.' using errcode = 'insufficient_privilege';
  end if;

  return query
  with weeks as (
    select generate_series(
      date_trunc('week', (now() at time zone 'Europe/Rome')) - interval '7 weeks',
      date_trunc('week', (now() at time zone 'Europe/Rome')),
      interval '1 week'
    ) as w
  )
  select
    (weeks.w)::date,
    (select count(*) from public.games g
      where g.created_at >= (weeks.w at time zone 'Europe/Rome')
        and g.created_at <  (weeks.w at time zone 'Europe/Rome') + interval '7 days'),
    (select count(*) from public.games g
      where g.status <> 'cancelled'
        and g.starts_at + make_interval(mins => g.minutes) < now()
        and g.starts_at >= (weeks.w at time zone 'Europe/Rome')
        and g.starts_at <  (weeks.w at time zone 'Europe/Rome') + interval '7 days'),
    (select count(*) from public.profiles p
      where not p.is_moderator
        and p.created_at >= (weeks.w at time zone 'Europe/Rome')
        and p.created_at <  (weeks.w at time zone 'Europe/Rome') + interval '7 days')
  from weeks
  order by weeks.w;
end;
$$;

grant execute on function public.deuce_numbers() to authenticated;
grant execute on function public.deuce_hosts()   to authenticated;
grant execute on function public.deuce_courts()  to authenticated;
grant execute on function public.deuce_weekly()  to authenticated;
