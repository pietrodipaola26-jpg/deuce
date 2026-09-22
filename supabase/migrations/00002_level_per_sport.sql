-- ============================================================================
-- A LEVEL FOR EACH SPORT.
--
-- One `level` column was wrong, and wrong in a way that showed up the moment
-- anybody played both: a person who has played tennis since they were eight and
-- picked up a padel racquet in October is not the same standard at both, and a
-- single number forced them to misrepresent one of them. Whichever way they set
-- it, one set of hosts got somebody out of their depth and the other lost a
-- player who would have been welcome.
--
-- So the level moves onto the sport. `tennis_level` and `padel_level` are each
-- nullable, and a NULL means "I do not play this" — which also retires the
-- separate `sports` array, because the sports somebody plays are now exactly the
-- ones they have given a level for. Two columns that could disagree with each
-- other are one column too many.
--
-- AT LEAST ONE IS REQUIRED. An account with neither is an account that can never
-- join anything, so the completeness constraint asks for one of the two rather
-- than for a `sports` array that might not match the level anyway.
-- ============================================================================

alter table public.profiles
  add column tennis_level smallint check (tennis_level between 1 and 5),
  add column padel_level  smallint check (padel_level  between 1 and 5);

comment on column public.profiles.tennis_level is
  'Tennis standard, 1-5. NULL means they do not play tennis.';
comment on column public.profiles.padel_level is
  'Padel standard, 1-5. NULL means they do not play padel.';

-- Carry the old single level across to whichever sports the profile claimed. It
-- is the only honest guess available, and everyone can correct it on their
-- profile page.
update public.profiles
set tennis_level = case when 'tennis' = any(sports) then level end,
    padel_level  = case when 'padel'  = any(sports) then level end
where level is not null;

-- Completeness now asks for a name and at least one sport's level.
alter table public.profiles drop constraint profiles_onboarded_is_complete;

alter table public.profiles add constraint profiles_onboarded_is_complete check (
  onboarded_at is null
  or (
    first_name is not null
    and last_initial is not null
    and terms_accepted_at is not null
    and (tennis_level is not null or padel_level is not null)
  )
);

alter table public.profiles drop constraint profiles_sports_bounded;

alter table public.profiles drop column sports;
alter table public.profiles drop column level;

/**
 * JOIN A GAME — now checking the level for THIS sport.
 *
 * Redefined rather than patched at the call site, because this is the function
 * that actually decides. The added case is the person who plays one sport and
 * not the other: they get told what is missing and where to fix it, instead of
 * being compared against a NULL and silently refused.
 */
create or replace function public.join_game(p_game_id uuid)
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
begin
  if me is null or not public.is_member() then
    raise exception 'You need a Deuce account to join a game.' using errcode = 'insufficient_privilege';
  end if;

  -- The lock is the whole point of this function.
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
  if g.taken >= g.spots then
    raise exception 'This game just filled up.' using errcode = 'check_violation';
  end if;

  select case when g.sport = 'tennis' then p.tennis_level else p.padel_level end,
         p.first_name
    into my_level, my_name
    from public.profiles p where p.id = me;

  if my_level is null then
    raise exception 'You have not set a % level yet. Add one on your profile and you can join.',
      case when g.sport = 'tennis' then 'tennis' else 'padel' end
      using errcode = 'check_violation';
  end if;

  -- The host named a level range so that nobody arrives to a mismatch. Honouring
  -- it protects both sides: the beginner who would have had a miserable hour,
  -- and the host who would stop posting open games after it happened twice.
  if my_level < g.level_min or my_level > g.level_max then
    raise exception 'This game is for levels % to %, and your % level is %.',
      g.level_min, g.level_max,
      case when g.sport = 'tennis' then 'tennis' else 'padel' end,
      my_level
      using errcode = 'check_violation';
  end if;

  insert into public.game_players (game_id, player_id, is_host) values (p_game_id, me, false);

  insert into public.notifications (user_id, kind, game_id, actor_id, body)
  values (
    g.host_id,
    'game_joined',
    p_game_id,
    me,
    coalesce(my_name, 'Somebody') || ' joined your game.'
  );

  -- Told separately, because "your game is full" is the thing a host is actually
  -- waiting for and it should not be buried in the fourth join notification.
  if g.taken + 1 >= g.spots then
    insert into public.notifications (user_id, kind, game_id, actor_id, body)
    values (g.host_id, 'game_full', p_game_id, null, 'Your game is full. The thread is open.');
  end if;
end;
$$;

grant execute on function public.join_game(uuid) to authenticated;

/**
 * A HOST MUST PLAY THE SPORT THEY ARE HOSTING.
 *
 * `seat_the_host` puts the host in their own game directly, which deliberately
 * skips `join_game` and therefore skips its level check. That is correct for
 * capacity — a host is always in their game — but it left one way for somebody
 * to end up in a game of a sport they have no level for, and then the invariant
 * "everybody in a game has a level for its sport" would not hold.
 *
 * Checked on the game rather than on the seat, so the message names the real
 * problem and arrives before the row exists.
 */
create or replace function public.host_must_play_the_sport()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  host_level smallint;
begin
  select case when new.sport = 'tennis' then p.tennis_level else p.padel_level end
    into host_level
    from public.profiles p where p.id = new.host_id;

  if host_level is null then
    raise exception 'Set a % level on your profile before hosting a % game.',
      case when new.sport = 'tennis' then 'tennis' else 'padel' end,
      case when new.sport = 'tennis' then 'tennis' else 'padel' end
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger games_host_plays_the_sport
  before insert on public.games
  for each row execute function public.host_must_play_the_sport();
