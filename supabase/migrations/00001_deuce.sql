-- ============================================================================
-- DEUCE — the whole schema, in one migration.
--
-- Deuce connects verified Bocconi students in Milan for tennis and padel. The
-- product problem is not court discovery, it is that nobody wants to be the one
-- who asks. So the schema's job is to make a game a row that already answers
-- every question a nervous player would otherwise have to ask in a group chat:
-- level, surface, court, time, cost, and who is already going.
--
-- THREE RULES THIS FILE FOLLOWS.
--
--  1. INVARIANTS LIVE HERE, NOT IN THE UI. A game cannot be over-filled, a
--     non-participant cannot read a game thread, and a player cannot rate
--     somebody they never played. Those are enforced by constraints, triggers
--     and SECURITY DEFINER functions, because a rule enforced only in React is
--     a rule that holds until somebody POSTs directly to the API.
--
--  2. READS GO THROUGH RLS, WRITES GO THROUGH FUNCTIONS. Every table has Row
--     Level Security. Mutations that have to hold an invariant across more than
--     one row (joining a game, which touches game_players, games.taken and
--     notifications) are exposed only as functions that take a row lock. Direct
--     INSERT on those tables is revoked, so the invariant cannot be sidestepped.
--
--  3. NOTHING NEEDS A CRON JOB TO BE CORRECT. "Has this game happened yet" is
--     derived from starts_at, never from a status column a scheduler has to
--     remember to update. A deployment with no scheduler configured is still
--     correct, which is the difference between a product that works and one
--     that works on Tuesdays.
-- ============================================================================

create extension if not exists "pgcrypto" with schema extensions;
create extension if not exists "citext" with schema extensions;

-- ============================================================================
-- 1. ENUMS
-- ============================================================================

-- The two sports, and nothing else. Deuce is not a general sports app; the
-- vocabulary of the product ("surface", "level", "spots") only makes sense for
-- racquet sports on a booked court.
create type public.sport as enum ('tennis', 'padel');

-- The surface is information, not decoration: it changes how the ball behaves,
-- what shoes you need, and whether rain cancels the game. 'padel' here is the
-- artificial turf inside glass walls.
create type public.surface as enum ('clay', 'hard', 'padel', 'grass');

-- Deliberately NOT a lifecycle. There is no 'played' or 'expired' state,
-- because that would need a scheduler to be true. Whether a game has happened
-- is a question about starts_at. This column only records states a human sets
-- or that follow directly from the seat count.
create type public.game_status as enum ('open', 'full', 'cancelled');

-- Set by the host after the game. 'unknown' is the honest default: most games
-- are never marked, and absence of a mark must never read as a no-show.
create type public.attendance as enum ('unknown', 'played', 'no_show');

-- What a player thought of the level they were matched into. Feeds nothing
-- automatic yet; it is collected so the level scale can be calibrated against
-- reality rather than against opinion.
create type public.level_signal as enum ('too_low', 'about_right', 'too_high');

create type public.report_reason as enum ('no_show', 'conduct', 'safety', 'spam', 'other');

-- 'open' reports are invisible to everyone but moderators and the reporter.
-- Only 'actioned' ones ever surface on a public record — see player_stats.
create type public.report_status as enum ('open', 'actioned', 'dismissed');

create type public.notification_kind as enum (
  'game_joined',     -- somebody joined a game you host
  'game_left',       -- somebody dropped out of a game you host
  'game_cancelled',  -- a game you were in was called off
  'game_message',    -- a new message in a game thread you are in
  'game_full',       -- your game filled up
  'rating_received'  -- somebody rated you
);

-- ============================================================================
-- 2. WHO COUNTS AS A BOCCONI STUDENT
-- ============================================================================

/**
 * The eligible mailboxes.
 *
 * Students get @studbocconi.it; faculty, PhD and staff get @unibocconi.it.
 * Both are Bocconi, so both are in.
 *
 * This is the ENTIRE trust model of the product. Every safety claim Deuce makes
 * reduces to "the person on the other side of this game controls a mailbox only
 * a Bocconi member can open", so the check is enforced in the database, on the
 * trigger that creates a profile, and not only in the form that submits it.
 * A signup that reaches the API directly is rejected by the same rule.
 */
create or replace function public.is_eligible_email(addr text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select lower(trim(addr)) ~ '^[^@[:space:]]+@(studbocconi\.it|unibocconi\.it)$';
$$;

comment on function public.is_eligible_email(text) is
  'True for the Bocconi mailboxes Deuce admits. The product''s whole trust model.';

-- ============================================================================
-- 3. PROFILES
-- ============================================================================

/**
 * A profile is what another player sees before deciding to share a court with a
 * stranger for ninety minutes.
 *
 * WHAT IS NOT HERE, ON PURPOSE: no surname, no photograph, no phone number, no
 * course code, no timetable. Deuce holds a real identity (it verified a
 * university mailbox) and the correct amount of it to publish is the amount
 * needed to decide about one game. The email address itself lives in auth.users
 * and is never exposed to another player by any policy in this file.
 *
 * onboarded_at is the gate. A row exists from the moment the account is created,
 * but it carries no name or level until the person has completed onboarding, and
 * every membership check in this schema tests onboarded_at rather than mere
 * existence of a row.
 */
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,

  -- Shown as "Mara V." — a first name and one initial. Enough to greet somebody
  -- at a court, not enough to look them up.
  first_name text check (char_length(trim(first_name)) between 1 and 40),
  last_initial text check (last_initial ~ '^[A-Za-z]$'),

  -- Kept coarse deliberately. "MSc Finance" is common ground; a course code and
  -- a year of study together identify one person in a cohort of thirty.
  programme text check (char_length(programme) <= 60),
  study_year text check (char_length(study_year) <= 30),

  -- Half this audience arrived in Milan weeks ago. "Speaks English, Spanish" is
  -- the detail that decides whether an exchange student presses join.
  languages text[] not null default '{}',

  sports public.sport[] not null default '{}',

  -- 1..5, described in words in the application. A scale a player can place
  -- themselves on is the single biggest lever on the confidence problem.
  level smallint check (level between 1 and 5),

  bio text check (char_length(bio) <= 280),

  -- Avatar tint index. Stable per person so an avatar does not change colour
  -- between sessions. There are no photographs anywhere in Deuce.
  tint smallint not null default 0 check (tint between 0 and 7),

  is_moderator boolean not null default false,

  onboarded_at timestamptz,
  terms_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- An onboarded profile is a complete one. This is why the application can
  -- render a game card without null-checking every field on it.
  constraint profiles_onboarded_is_complete check (
    onboarded_at is null
    or (
      first_name is not null
      and last_initial is not null
      and level is not null
      and array_length(sports, 1) >= 1
      and terms_accepted_at is not null
    )
  ),

  -- Two languages is plenty; an unbounded array is a free-text field with extra
  -- steps, and it renders on a card.
  constraint profiles_languages_bounded check (coalesce(array_length(languages, 1), 0) <= 6),
  constraint profiles_sports_bounded check (coalesce(array_length(sports, 1), 0) <= 2)
);

comment on table public.profiles is
  'The public half of a member. No surname, photo, phone number or timetable, ever.';

create index profiles_onboarded_idx on public.profiles (onboarded_at) where onboarded_at is not null;

/**
 * Membership test, used by nearly every policy below.
 *
 * SECURITY DEFINER because it reads public.profiles from inside policies that
 * are themselves defined ON public.profiles. Without it, a policy that calls
 * this function would re-enter its own RLS check and recurse.
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
    where p.id = auth.uid() and p.onboarded_at is not null
  );
$$;

create or replace function public.is_moderator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_moderator
  );
$$;

/**
 * Creates the profile row when an account is created, and refuses accounts that
 * are not Bocconi.
 *
 * The domain check is here as well as in the application because this trigger is
 * the one place every route to account creation passes through — the web form,
 * a direct API call, and an admin creating a user by hand.
 */
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_eligible_email(new.email) then
    raise exception 'Deuce is open to Bocconi mailboxes only (@studbocconi.it or @unibocconi.it).'
      using errcode = 'check_violation';
  end if;

  insert into public.profiles (id, tint)
  values (
    new.id,
    -- Deterministic from the uuid, so a person keeps their colour for ever
    -- without storing a preference or consuming a sequence.
    abs(hashtext(new.id::text)) % 8
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ============================================================================
-- 4. VENUES
-- ============================================================================

/**
 * The courts themselves.
 *
 * `travel` is the field that does the real work: "12 min by tram 24 from
 * Bocconi" is the answer to the question that actually stops somebody joining a
 * game across town, and no map embed communicates it as fast.
 *
 * Members may add a court, because the curated list will never be complete and
 * a host who cannot name their court cannot post their game. An added court is
 * `is_verified = false` and the application says so on the card, which is the
 * honest version of the trade-off.
 */
create table public.venues (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 80),
  area text not null check (char_length(trim(area)) between 2 and 60),
  travel text check (char_length(travel) <= 120),
  city text not null default 'Milan',
  surface public.surface not null,
  indoor boolean not null default false,
  is_verified boolean not null default false,
  is_active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index venues_active_idx on public.venues (is_active, name) where is_active;

-- ============================================================================
-- 5. GAMES
-- ============================================================================

/**
 * A game. This is the product.
 *
 * `taken` is denormalised on purpose. It is maintained by trigger from
 * game_players and it is what makes "3 spots left" a single-row read on a feed
 * of games, and what lets the capacity check in join_game() be a cheap test
 * against a locked row rather than a count over another table.
 *
 * There is no 'played' status. A game is in the past when
 * starts_at + minutes < now(), which is true without anybody running anything.
 */
create table public.games (
  id uuid primary key default extensions.gen_random_uuid(),
  host_id uuid not null references public.profiles (id) on delete cascade,
  venue_id uuid not null references public.venues (id) on delete restrict,

  sport public.sport not null,
  surface public.surface not null,
  indoor boolean not null default false,

  starts_at timestamptz not null,
  minutes smallint not null check (minutes between 30 and 240),

  -- The range of levels the host wants. Shown on the card in numbers AND words,
  -- because "Level 2" is a number a beginner cannot calibrate and "Improving"
  -- is a description they can recognise themselves in.
  level_min smallint not null check (level_min between 1 and 5),
  level_max smallint not null check (level_max between 1 and 5),

  spots smallint not null,
  taken smallint not null default 0 check (taken >= 0),

  -- Euro cents per player, the court fee split evenly. Deuce takes no cut, so
  -- there is no fee column and never will be one.
  price_cents integer not null check (price_cents between 0 and 20000),

  -- The host's own words, and the only free text on a card. "Genuinely no
  -- pressure on level" converts better than anything the interface can say.
  note text check (char_length(note) <= 280),

  -- Kit the host has already sorted, so nobody has to ask.
  provides text[] not null default '{}',

  status public.game_status not null default 'open',
  cancelled_at timestamptz,
  cancelled_reason text check (char_length(cancelled_reason) <= 200),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint games_level_range check (level_min <= level_max),
  constraint games_taken_within_spots check (taken <= spots),

  -- Padel is always doubles — the court has four players on it and no singles
  -- variant is played socially. Tennis is singles or doubles.
  constraint games_spots_match_sport check (
    (sport = 'padel' and spots = 4)
    or (sport = 'tennis' and spots in (2, 4))
  ),

  -- Padel is played on turf inside glass walls; a padel game on clay is a
  -- data-entry error, not a variant.
  constraint games_surface_match_sport check (
    (sport = 'padel' and surface = 'padel')
    or (sport = 'tennis' and surface in ('clay', 'hard', 'grass'))
  ),

  constraint games_cancelled_has_timestamp check (
    (status = 'cancelled') = (cancelled_at is not null)
  ),

  constraint games_provides_bounded check (coalesce(array_length(provides, 1), 0) <= 6)
);

comment on table public.games is
  'One posted game. Answers level, surface, court, time, cost and who is going.';

-- The feed's query: upcoming, not cancelled, soonest first.
create index games_upcoming_idx on public.games (starts_at)
  where status <> 'cancelled';
create index games_host_idx on public.games (host_id, starts_at desc);
create index games_sport_idx on public.games (sport, starts_at);

create trigger games_touch_updated_at
  before update on public.games
  for each row execute function public.touch_updated_at();

-- ============================================================================
-- 6. WHO IS PLAYING
-- ============================================================================

create table public.game_players (
  game_id uuid not null references public.games (id) on delete cascade,
  player_id uuid not null references public.profiles (id) on delete cascade,
  is_host boolean not null default false,
  joined_at timestamptz not null default now(),
  attendance public.attendance not null default 'unknown',
  primary key (game_id, player_id)
);

create index game_players_player_idx on public.game_players (player_id, joined_at desc);

/**
 * Keeps games.taken and games.status true to the seat list.
 *
 * status is derived here rather than set by callers, so 'full' can never
 * disagree with the number of people in the game. A cancelled game stays
 * cancelled: emptying a seat must not quietly reopen a game the host called off.
 */
create or replace function public.sync_game_seat_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid := coalesce(new.game_id, old.game_id);
  seats smallint;
  filled smallint;
begin
  select count(*) into filled from public.game_players where game_id = target;
  select spots into seats from public.games where id = target;

  -- The cast is required: a CASE over string literals is `text`, and assigning
  -- text to an enum column is an error rather than an implicit coercion.
  update public.games g
  set taken = filled,
      status = (case
                  when g.status = 'cancelled' then 'cancelled'
                  when filled >= seats then 'full'
                  else 'open'
                end)::public.game_status
  where g.id = target;

  return null;
end;
$$;

create trigger game_players_sync_count
  after insert or delete on public.game_players
  for each row execute function public.sync_game_seat_count();

/**
 * The host is a player in their own game.
 *
 * Done in the database rather than in the create-game action so that a game can
 * never exist with an empty seat list — which would render as "0/4 going" next
 * to the name of the person who posted it.
 */
create or replace function public.seat_the_host()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.game_players (game_id, player_id, is_host)
  values (new.id, new.host_id, true);
  return new;
end;
$$;

create trigger games_seat_the_host
  after insert on public.games
  for each row execute function public.seat_the_host();

-- ============================================================================
-- 7. THE GAME THREAD
-- ============================================================================

/**
 * Messages belong to a GAME, not to a pair of people.
 *
 * Deuce has no direct messages, and that is a safety feature rather than a
 * missing one. A thread opens when you join, everyone in it is a verified
 * student going to the same court, and nobody can open a private channel to a
 * stranger they saw in a feed. No phone number ever changes hands.
 *
 * sender_id null means the line was written by the system ("Tomás cancelled
 * this game"), which is why it is nullable rather than pointing at a robot row.
 */
create table public.messages (
  id uuid primary key default extensions.gen_random_uuid(),
  game_id uuid not null references public.games (id) on delete cascade,
  sender_id uuid references public.profiles (id) on delete set null,
  body text not null check (char_length(trim(body)) between 1 and 1000),
  is_system boolean not null default false,
  created_at timestamptz not null default now(),

  constraint messages_system_has_no_sender check (
    (is_system and sender_id is null) or (not is_system and sender_id is not null)
  )
);

create index messages_game_idx on public.messages (game_id, created_at);

/** Participation test, used by the message policies and the RPCs. */
create or replace function public.is_in_game(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.game_players gp
    where gp.game_id = target and gp.player_id = auth.uid()
  );
$$;

-- ============================================================================
-- 8. THE RECORD
-- ============================================================================

/**
 * Peer ratings, one per pair per game.
 *
 * Only players who were in the same game can rate each other, and only after it
 * has been played. Both halves are enforced in rate_player(); the table just
 * refuses a duplicate.
 */
create table public.ratings (
  game_id uuid not null references public.games (id) on delete cascade,
  rater_id uuid not null references public.profiles (id) on delete cascade,
  ratee_id uuid not null references public.profiles (id) on delete cascade,
  stars smallint not null check (stars between 1 and 5),
  signal public.level_signal not null default 'about_right',
  created_at timestamptz not null default now(),
  primary key (game_id, rater_id, ratee_id),
  constraint ratings_no_self check (rater_id <> ratee_id)
);

create index ratings_ratee_idx on public.ratings (ratee_id);

create table public.reports (
  id uuid primary key default extensions.gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  subject_id uuid not null references public.profiles (id) on delete cascade,
  game_id uuid references public.games (id) on delete set null,
  reason public.report_reason not null,
  detail text check (char_length(detail) <= 1000),
  status public.report_status not null default 'open',
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  constraint reports_no_self check (reporter_id <> subject_id)
);

create index reports_subject_idx on public.reports (subject_id, status);
create index reports_open_idx on public.reports (created_at desc) where status = 'open';

create table public.notifications (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind public.notification_kind not null,
  game_id uuid references public.games (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  body text not null check (char_length(body) <= 300),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

-- ============================================================================
-- 9. THE RECORD, AGGREGATED
-- ============================================================================

/**
 * player_stats — the five numbers on every profile.
 *
 * TWO OF THEM ARE UNFLATTERING BY DESIGN. A profile that can only go up is a
 * profile nobody believes; the no-show count and the report count are what make
 * the rating mean anything. This is the answer to the only question that
 * matters to somebody deciding whether to turn up alone, at 21:00, in a part of
 * Milan they do not know, to meet a person they have never met.
 *
 * WHY `security_invoker = false`. The view is owned by the schema owner, so it
 * reads the underlying tables with the owner's rights rather than the caller's.
 * That is exactly what is wanted here: aggregate reputation is public to members,
 * while the rows behind it are not. RLS on `ratings` lets you see only the
 * ratings you GAVE, so nobody can work out who marked them three stars — but the
 * average is still computable. `where public.is_member()` puts the membership
 * gate back on, since the owner's rights would otherwise skip it.
 *
 * ONLY ACTIONED REPORTS ARE COUNTED. An open report is an allegation. Publishing
 * raw report counts would hand every user a one-click way to stain a rival's
 * profile, so the number here moves only after a moderator agrees.
 *
 * reliability is NULL rather than 100 for somebody with no history. "New" and
 * "perfect" are different facts, and a product that renders them identically is
 * lying about the one that matters.
 */
create view public.player_stats
with (security_invoker = false)
as
select
  p.id as player_id,
  (
    select count(*) from public.game_players gp
    where gp.player_id = p.id and gp.attendance = 'played'
  )::int as games_played,
  (
    select count(*) from public.game_players gp
    where gp.player_id = p.id and gp.attendance = 'no_show'
  )::int as no_shows,
  (
    select round(avg(r.stars)::numeric, 1) from public.ratings r where r.ratee_id = p.id
  ) as rating,
  (
    select count(*) from public.ratings r where r.ratee_id = p.id
  )::int as rating_count,
  (
    select case
      when count(*) filter (where gp.attendance in ('played', 'no_show')) = 0 then null
      else round(
        100.0 * count(*) filter (where gp.attendance = 'played')
        / count(*) filter (where gp.attendance in ('played', 'no_show'))
      )::int
    end
    from public.game_players gp
    where gp.player_id = p.id
  ) as reliability,
  (
    select count(*) from public.reports rp
    where rp.subject_id = p.id and rp.status = 'actioned'
  )::int as reports
from public.profiles p
where public.is_member();

comment on view public.player_stats is
  'Public reputation: games, rating, reliability, no-shows and actioned reports.';

-- ============================================================================
-- 10. RULES THAT NEED MORE THAN A CONSTRAINT
-- ============================================================================

/**
 * A game must be posted in the future.
 *
 * This cannot be a CHECK constraint: now() is not immutable, and PostgreSQL
 * refuses non-immutable expressions in CHECK. A BEFORE trigger is the correct
 * home for a rule that depends on the clock.
 *
 * Five minutes of slack absorbs clock skew and the time it takes to fill in the
 * form, without allowing somebody to post a game that already happened.
 */
create or replace function public.games_must_start_in_future()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.starts_at < now() - interval '5 minutes' then
    raise exception 'A game has to start in the future.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger games_future_only
  before insert on public.games
  for each row execute function public.games_must_start_in_future();

/** True once a game is over, which is the moment ratings and attendance open. */
create or replace function public.game_has_ended(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.games g
    where g.id = target
      and g.starts_at + make_interval(mins => g.minutes) < now()
  );
$$;

/**
 * JOIN A GAME.
 *
 * Exposed as a function, and direct INSERT on game_players is revoked, because
 * capacity is a cross-row invariant. Two people pressing join on the last seat
 * at the same moment is not a hypothetical — it is the single most likely
 * concurrent write this product will ever see. `for update` on the game row
 * serialises them, so the second one gets a clear "this game just filled up"
 * rather than a fifth player in a doubles match.
 *
 * Every refusal is a sentence a person can act on. "new row violates
 * row-level security policy" is not.
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

  select level, first_name into my_level, my_name from public.profiles where id = me;

  -- The host named a level range so that nobody arrives to a mismatch. Honouring
  -- it protects both sides: the beginner who would have had a miserable hour,
  -- and the host who would stop posting open games after it happened twice.
  if my_level < g.level_min or my_level > g.level_max then
    raise exception 'This game is for levels % to %, and your level is %.', g.level_min, g.level_max, my_level
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

/**
 * LEAVE A GAME.
 *
 * A host cannot leave their own game — there would be nobody responsible for a
 * booked court. They cancel it instead, which tells everyone.
 *
 * Dropping out inside twelve hours posts a line in the thread. Not a punishment:
 * the other three people have already arranged their evening around this, and
 * they find out from the thread rather than from an empty court.
 */
create or replace function public.leave_game(p_game_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  g public.games;
  me uuid := auth.uid();
  my_name text;
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
  late := g.starts_at - now() < interval '12 hours';

  delete from public.game_players where game_id = p_game_id and player_id = me;

  insert into public.notifications (user_id, kind, game_id, actor_id, body)
  values (
    g.host_id,
    'game_left',
    p_game_id,
    me,
    coalesce(my_name, 'Somebody') || ' dropped out of your game.'
      || case when late then ' Less than 12 hours before it starts.' else '' end
  );

  if late then
    insert into public.messages (game_id, sender_id, body, is_system)
    values (
      p_game_id,
      null,
      coalesce(my_name, 'A player') || ' dropped out, and there is now a free spot.',
      true
    );
  end if;
end;
$$;

/**
 * CANCEL A GAME. Host only, and everybody else is told in both places they
 * might look: the thread and their notifications.
 */
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

  insert into public.messages (game_id, sender_id, body, is_system)
  values (p_game_id, null, 'This game was cancelled by the host.', true);
end;
$$;

/**
 * MARK WHO TURNED UP. Host only, and only once the game is over.
 *
 * This is where reliability comes from, so it is deliberately a deliberate act:
 * nothing is inferred, nothing decays, and an unmarked game counts for and
 * against nobody.
 */
create or replace function public.mark_attendance(
  p_game_id uuid,
  p_player_id uuid,
  p_state public.attendance
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  g public.games;
begin
  select * into g from public.games where id = p_game_id;
  if g.id is null then
    raise exception 'That game no longer exists.' using errcode = 'no_data_found';
  end if;
  if g.host_id <> auth.uid() then
    raise exception 'Only the host can mark who turned up.' using errcode = 'insufficient_privilege';
  end if;
  if not public.game_has_ended(p_game_id) then
    raise exception 'You can mark attendance once the game has finished.' using errcode = 'check_violation';
  end if;
  if p_player_id = g.host_id then
    raise exception 'You cannot mark yourself.' using errcode = 'check_violation';
  end if;

  update public.game_players
  set attendance = p_state
  where game_id = p_game_id and player_id = p_player_id;

  if not found then
    raise exception 'That player was not in this game.' using errcode = 'no_data_found';
  end if;
end;
$$;

/**
 * RATE SOMEBODY YOU PLAYED WITH.
 *
 * Both people must have been in the same game, and the game must be over. That
 * is what makes a rating on Deuce mean something: it cannot be bought, farmed,
 * or left by a stranger who did not turn up.
 */
create or replace function public.rate_player(
  p_game_id uuid,
  p_ratee_id uuid,
  p_stars smallint,
  p_signal public.level_signal default 'about_right'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  my_name text;
begin
  if p_stars < 1 or p_stars > 5 then
    raise exception 'A rating is between 1 and 5.' using errcode = 'check_violation';
  end if;
  if p_ratee_id = me then
    raise exception 'You cannot rate yourself.' using errcode = 'check_violation';
  end if;
  if not public.is_in_game(p_game_id) then
    raise exception 'You were not in that game.' using errcode = 'insufficient_privilege';
  end if;
  if not exists (
    select 1 from public.game_players where game_id = p_game_id and player_id = p_ratee_id
  ) then
    raise exception 'That player was not in that game.' using errcode = 'no_data_found';
  end if;
  if not public.game_has_ended(p_game_id) then
    raise exception 'You can rate the other players once the game has finished.'
      using errcode = 'check_violation';
  end if;

  insert into public.ratings (game_id, rater_id, ratee_id, stars, signal)
  values (p_game_id, me, p_ratee_id, p_stars, p_signal)
  on conflict (game_id, rater_id, ratee_id)
  do update set stars = excluded.stars, signal = excluded.signal, created_at = now();

  select first_name into my_name from public.profiles where id = me;

  insert into public.notifications (user_id, kind, game_id, actor_id, body)
  values (p_ratee_id, 'rating_received', p_game_id, me,
          coalesce(my_name, 'A player') || ' rated you after your game.');
end;
$$;

/**
 * Fans a new message out to the rest of the thread.
 *
 * A trigger rather than an RPC, so that posting a message stays an ordinary
 * INSERT the Realtime publication can broadcast. The sender is excluded — being
 * notified of your own message is the oldest bug in chat.
 */
create or replace function public.notify_thread_of_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  sender_name text;
begin
  if new.is_system then
    return new;
  end if;

  select first_name into sender_name from public.profiles where id = new.sender_id;

  insert into public.notifications (user_id, kind, game_id, actor_id, body)
  select gp.player_id, 'game_message', new.game_id, new.sender_id,
         coalesce(sender_name, 'Somebody') || ': ' || left(new.body, 140)
  from public.game_players gp
  where gp.game_id = new.game_id and gp.player_id <> new.sender_id;

  return new;
end;
$$;

create trigger messages_notify_thread
  after insert on public.messages
  for each row execute function public.notify_thread_of_message();

-- ============================================================================
-- 11. ROW LEVEL SECURITY
--
-- Every table, no exceptions. The shape of the policy set is:
--
--   READ   is for onboarded members. There is nothing for the public to see:
--          "Anything at all before you have an account" is on the list of things
--          the privacy page promises nobody sees, and that promise is kept here
--          rather than by not linking to a page.
--   WRITE  is your own row, or nothing. Every cross-row write goes through the
--          SECURITY DEFINER functions above, and the direct grants that would
--          let a caller skip them are revoked at the end of this section.
-- ============================================================================

alter table public.profiles       enable row level security;
alter table public.venues         enable row level security;
alter table public.games          enable row level security;
alter table public.game_players   enable row level security;
alter table public.messages       enable row level security;
alter table public.ratings        enable row level security;
alter table public.reports        enable row level security;
alter table public.notifications  enable row level security;

-- ── profiles ────────────────────────────────────────────────────────────────

-- You can always read your own row, which is what makes the onboarding screen
-- work: at that moment you are signed in but not yet a member.
create policy profiles_select_self on public.profiles
  for select using (id = auth.uid());

create policy profiles_select_members on public.profiles
  for select using (public.is_member() and onboarded_at is not null);

create policy profiles_update_self on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- No insert policy and no delete policy, deliberately. Profiles are created by
-- the handle_new_user() trigger and removed by the cascade from auth.users, so
-- there is no legitimate path for a client to create or drop one.

-- ── venues ──────────────────────────────────────────────────────────────────

create policy venues_select_members on public.venues
  for select using (public.is_member() and is_active);

-- A host who cannot name their court cannot post their game, so members may add
-- one. It lands unverified, and the card says so.
create policy venues_insert_members on public.venues
  for insert with check (
    public.is_member()
    and created_by = auth.uid()
    and is_verified = false
  );

create policy venues_update_moderator on public.venues
  for update using (public.is_moderator()) with check (public.is_moderator());

-- ── games ───────────────────────────────────────────────────────────────────

create policy games_select_members on public.games
  for select using (public.is_member());

create policy games_insert_own on public.games
  for insert with check (
    public.is_member()
    and host_id = auth.uid()
    and status = 'open'
    and cancelled_at is null
  );

-- The host may edit their own game. Cancelling goes through cancel_game(),
-- which also tells everybody; this policy exists so a host can fix a typo in
-- the note or move the time.
create policy games_update_host on public.games
  for update using (host_id = auth.uid()) with check (host_id = auth.uid());

-- ── game_players ────────────────────────────────────────────────────────────

-- Who is going is visible to members: a stack of three names and one empty seat
-- is the difference between a feed you read and a feed you join.
create policy game_players_select_members on public.game_players
  for select using (public.is_member());

-- No insert policy. Joining is join_game() only — see the capacity race in that
-- function's comment.

-- Leaving goes through leave_game() so the thread and the host are told, but a
-- self-delete policy is kept as the floor: a member must always be able to
-- remove themselves from a game, even if that function is unavailable.
create policy game_players_delete_self on public.game_players
  for delete using (player_id = auth.uid() and not is_host);

-- ── messages ────────────────────────────────────────────────────────────────

-- The whole of Deuce's messaging privacy, in one clause: a thread is readable by
-- the people in that game and by nobody else. There is no direct-message table
-- for this policy to have to protect, because there are no direct messages.
create policy messages_select_participants on public.messages
  for select using (public.is_in_game(game_id));

/**
 * Writing to a thread: you are in the game, you are not the system, and the
 * thread is still open.
 *
 * The thread closes 24 hours after the game ends. That is not tidiness — it is
 * the reason a game thread is not a back channel to a stranger. It exists for
 * the game, and then it stops.
 */
create policy messages_insert_participants on public.messages
  for insert with check (
    public.is_in_game(game_id)
    and sender_id = auth.uid()
    and is_system = false
    and exists (
      select 1 from public.games g
      where g.id = game_id
        and g.starts_at + make_interval(mins => g.minutes) > now() - interval '24 hours'
    )
  );

-- Messages are not editable or deletable by their author. A thread that can be
-- rewritten after the fact is no use to a moderator reading a report about it.

-- ── ratings ─────────────────────────────────────────────────────────────────

-- You can see what you gave. You cannot see what you were given, by anyone —
-- only the average, through player_stats. This is what stops a rating becoming
-- a conversation, and it is why the average can be trusted.
create policy ratings_select_own on public.ratings
  for select using (rater_id = auth.uid());

-- Insert is rate_player() only: it is the thing that checks you were actually
-- in the game and that the game is over.

-- ── reports ─────────────────────────────────────────────────────────────────

create policy reports_select_own on public.reports
  for select using (reporter_id = auth.uid());

create policy reports_select_moderator on public.reports
  for select using (public.is_moderator());

create policy reports_insert_own on public.reports
  for insert with check (
    public.is_member()
    and reporter_id = auth.uid()
    and subject_id <> auth.uid()
    and status = 'open'
    and resolved_by is null
    and resolved_at is null
  );

create policy reports_update_moderator on public.reports
  for update using (public.is_moderator()) with check (public.is_moderator());

-- ── notifications ───────────────────────────────────────────────────────────

create policy notifications_select_own on public.notifications
  for select using (user_id = auth.uid());

-- Marking as read is the only change a recipient can make.
create policy notifications_update_own on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy notifications_delete_own on public.notifications
  for delete using (user_id = auth.uid());

-- Inserts come from triggers and SECURITY DEFINER functions only. Without this
-- omission, any member could write a notification into anybody's list.

-- ============================================================================
-- 12. GRANTS
--
-- RLS decides which ROWS a caller sees. Grants decide which TABLES and VERBS
-- they can name at all. Both are needed: a permissive grant with no policy is
-- an empty result, and a policy with no grant is a permission error.
-- ============================================================================

-- Nothing in Deuce is public. The anon role is used for exactly one thing:
-- reaching the auth endpoints to request a sign-in link.
revoke all on all tables in schema public from anon;
revoke all on all functions in schema public from anon;
revoke all on all sequences in schema public from anon;

grant select on public.profiles      to authenticated;
grant update on public.profiles      to authenticated;
grant select, insert on public.venues to authenticated;
grant update on public.venues        to authenticated;
grant select, insert, update on public.games to authenticated;
grant select, delete on public.game_players  to authenticated;
grant select, insert on public.messages      to authenticated;
grant select on public.ratings               to authenticated;
grant select, insert, update on public.reports to authenticated;
grant select, update, delete on public.notifications to authenticated;
grant select on public.player_stats   to authenticated;

-- INSERT on these two is never granted to a client: both are written only by the
-- functions and triggers that hold their invariants.
revoke insert on public.game_players from authenticated;
revoke insert on public.ratings      from authenticated;
revoke insert on public.notifications from authenticated;

grant execute on function public.join_game(uuid)                      to authenticated;
grant execute on function public.leave_game(uuid)                     to authenticated;
grant execute on function public.cancel_game(uuid, text)              to authenticated;
grant execute on function public.mark_attendance(uuid, uuid, public.attendance) to authenticated;
grant execute on function public.rate_player(uuid, uuid, smallint, public.level_signal) to authenticated;
grant execute on function public.is_member()                          to authenticated;
grant execute on function public.is_moderator()                       to authenticated;
grant execute on function public.is_in_game(uuid)                     to authenticated;
grant execute on function public.game_has_ended(uuid)                 to authenticated;
grant execute on function public.is_eligible_email(text)              to anon, authenticated;

-- ============================================================================
-- 13. REALTIME
--
-- Only messages. A reply appearing in an open thread without a refresh is worth
-- a subscription; a game card's seat count is not, and publishing every table
-- would leak row changes to clients whose RLS would have hidden the rows.
-- Realtime respects RLS on the publication, so a subscriber still only receives
-- messages for games they are in.
-- ============================================================================

alter publication supabase_realtime add table public.messages;
