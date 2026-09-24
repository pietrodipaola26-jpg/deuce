-- ============================================================================
-- A POPULATED DEUCE, FOR LOOKING AT. LOCAL ONLY, AND NEVER ANYWHERE ELSE.
--
-- WHY THIS IS A SEPARATE FILE FROM seed.sql. That one runs on every `db reset`
-- and holds courts, which are public infrastructure that exists whether or not
-- Deuce does. This one holds invented people, and its own header explains why
-- those must never reach a real database: a student's first question is whether
-- anyone they know is on it, and a platform caught inflating that number never
-- gets a second look. Worse, somebody would join a game that is not happening
-- and ride across Milan at night to an empty court.
--
-- So it is not wired into `db reset`. It is run deliberately, by a script that
-- refuses to talk to anything but the local container.
--
-- WHAT IT IS FOR. Testing the things real usage will not produce for weeks: a
-- full game with nine people waiting, a thread long enough to find out what a
-- phone keyboard does to it, a game that went off three-handed so the price
-- split changes, somebody with a reliability score rather than "New", an open
-- report so the moderator badge has a number on it, and errors on the numbers
-- page so that section is not an empty box.
--
-- ACCOUNTS. Eight, all @studbocconi.it. pietro.d is the moderator. Sign in as
-- any of them with:
--
--     node scripts/signin-link.mjs mara.v@studbocconi.it
--
-- Re-runnable: it clears every invented person first, which cascades to their
-- games, messages, ratings and reports. Courts are left alone.
-- ============================================================================

-- ── Wipe whatever a previous run left ──────────────────────────────────────
delete from public.error_log;
delete from auth.users;   -- cascades: profiles, games, seats, messages, reports

-- ── The people ─────────────────────────────────────────────────────────────

create or replace function pg_temp.mkuser(addr text) returns uuid
language plpgsql as $$
declare uid uuid := gen_random_uuid();
begin
  -- Token columns are empty strings, NOT null. GoTrue reads them into a Go
  -- string and a null makes every later admin API call fail with "converting
  -- NULL to string is unsupported", which looks like a broken sign-up on rows
  -- this file created and poisons the whole local stack.
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
                          email_confirmed_at, created_at, updated_at,
                          raw_app_meta_data, raw_user_meta_data,
                          confirmation_token, recovery_token,
                          email_change_token_new, email_change_token_current, email_change)
  values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
          addr, '', now(), now(), now(), '{"provider":"email"}', '{}',
          '', '', '', '', '');
  return uid;
end $$;

do $$
declare
  pietro uuid; mara uuid; luca uuid; yuki uuid;
  sofia uuid; tomas uuid; ines uuid; adam uuid;
  padel_in uuid; padel_out uuid; clay_out uuid; clay_in uuid; hard_in uuid;
  g_open uuid; g_full uuid; g_singles uuid; g_high uuid; g_tonight uuid;
  g_cancelled uuid; g_past_full uuid; g_past_short uuid; g_noshow uuid; g_chat uuid;
  i int;
begin
  pietro := pg_temp.mkuser('pietro.d@studbocconi.it');
  mara   := pg_temp.mkuser('mara.v@studbocconi.it');
  luca   := pg_temp.mkuser('luca.b@studbocconi.it');
  yuki   := pg_temp.mkuser('yuki.t@studbocconi.it');
  sofia  := pg_temp.mkuser('sofia.r@studbocconi.it');
  tomas  := pg_temp.mkuser('tomas.k@studbocconi.it');
  ines   := pg_temp.mkuser('ines.m@studbocconi.it');
  adam   := pg_temp.mkuser('adam.o@studbocconi.it');

  -- handle_new_user() already made the profile rows. Fill them in.
  update public.profiles set
    first_name = v.fn, last_initial = v.li,
    tennis_level = v.tl, padel_level = v.pl,
    programme = v.prog, study_year = v.yr, bio = v.bio,
    onboarded_at = now() - (v.age || ' days')::interval,
    terms_accepted_at = now() - (v.age || ' days')::interval,
    age_confirmed_at  = now() - (v.age || ' days')::interval,
    created_at = now() - (v.age || ' days')::interval,
    is_moderator = v.mod
  from (values
    (pietro, 'Pietro', 'D', 3, 4, 'BIEF',  'Second year',  'Happy to play anyone. Ask me about courts.', 40, true),
    (mara,   'Mara',   'V', 4, 3, 'BIEM',  'Third year',   'Played at club level, still competitive.',   32, false),
    (luca,   'Luca',   'B', 2, 2, 'BESS',  'First year',   'Just arrived in Milan, keen to meet people.', 21, false),
    (yuki,   'Yuki',   'T', null, 4, 'BIG', 'Exchange',    'Padel only. Four months here.',               18, false),
    (sofia,  'Sofia',  'R', 5, null, 'BAI', 'Second year', 'Tennis. Mornings are best for me.',           14, false),
    (tomas,  'Tomas',  'K', 3, 3, 'BEMACS','Exchange',     'Both, either, whenever.',                      9, false),
    (ines,   'Ines',   'M', 2, 3, 'CLEAM', 'First year',   null,                                           5, false),
    (adam,   'Adam',   'O', 4, 2, 'WBB',   'Third year',   'Looking for doubles partners.',                2, false)
  ) as v (id, fn, li, tl, pl, prog, yr, bio, age, mod)
  where public.profiles.id = v.id;

  -- Courts, picked from the eighteen real ones in seed.sql.
  select id into padel_in  from public.venues where name = 'Padel Club Ripamonti' limit 1;
  select id into padel_out from public.venues where name = 'Quanta Club' and not has_indoor limit 1;
  select id into clay_out  from public.venues where name = 'Tennis Porta Romana' limit 1;
  select id into clay_in   from public.venues where name = 'Canottieri Olona 1894' limit 1;
  select id into hard_in   from public.venues where name = 'S.G.M. Forza e Coraggio' limit 1;
  if padel_out is null then select id into padel_out from public.venues where 'padel' = any(surfaces) limit 1; end if;

  -- ── Games ────────────────────────────────────────────────────────────────
  -- seat_the_host seats the host, so `taken` starts at 1 on every one of these.

  -- 1. The everyday case: one seat left.
  insert into public.games (host_id, venue_id, sport, surface, indoor, starts_at, minutes,
                            level_min, level_max, spots, total_cents, note, provides)
  values (mara, padel_in, 'padel', 'padel', true, now() + interval '1 day' + interval '7 hours', 90,
          2, 4, 4, 4400, 'Genuinely no pressure on level. We are there to rally, not to win.',
          array['Balls','A spare racquet'])
  returning id into g_open;
  insert into public.game_players (game_id, player_id) values (g_open, luca), (g_open, tomas);

  -- 2. Full, with a queue. The waitlist, position display and promotion.
  insert into public.games (host_id, venue_id, sport, surface, indoor, starts_at, minutes,
                            level_min, level_max, spots, total_cents, note)
  values (yuki, padel_in, 'padel', 'padel', true, now() + interval '3 days' + interval '8 hours', 90,
          1, 5, 4, 4000, 'Regular Thursday game. List moves quickly, worth waiting.')
  returning id into g_full;
  insert into public.game_players (game_id, player_id) values (g_full, mara), (g_full, tomas), (g_full, adam);
  insert into public.waitlist (game_id, player_id, joined_at) values
    (g_full, luca,   now() - interval '3 days'),
    (g_full, ines,   now() - interval '2 days'),
    (g_full, sofia,  now() - interval '1 day'),
    (g_full, pietro, now() - interval '4 hours');

  -- 3. Tennis singles, outdoors, one seat.
  insert into public.games (host_id, venue_id, sport, surface, indoor, starts_at, minutes,
                            level_min, level_max, spots, total_cents, note, provides)
  values (sofia, clay_out, 'tennis', 'clay', false, now() + interval '2 days' + interval '2 hours', 60,
          4, 5, 2, 2800, 'Early start. Coffee after if you are not in a rush.', array['Balls'])
  returning id into g_singles;

  -- 4. Deliberately out of reach for the low level accounts, to see the refusal.
  insert into public.games (host_id, venue_id, sport, surface, indoor, starts_at, minutes,
                            level_min, level_max, spots, total_cents)
  values (mara, clay_in, 'tennis', 'clay', true, now() + interval '4 days' + interval '6 hours', 90,
          4, 5, 4, 6000)
  returning id into g_high;
  insert into public.game_players (game_id, player_id) values (g_high, sofia), (g_high, adam);

  -- 5. Starting in three hours: the late-withdrawal warning and the safety exit.
  insert into public.games (host_id, venue_id, sport, surface, indoor, starts_at, minutes,
                            level_min, level_max, spots, total_cents, note)
  values (tomas, padel_in, 'padel', 'padel', true, now() + interval '3 hours', 90,
          1, 4, 4, 4800, 'Court is booked and paid. Please only join if you are sure.')
  returning id into g_tonight;
  insert into public.game_players (game_id, player_id) values (g_tonight, luca), (g_tonight, ines), (g_tonight, pietro);

  -- 6. Cancelled.
  insert into public.games (host_id, venue_id, sport, surface, indoor, starts_at, minutes,
                            level_min, level_max, spots, total_cents)
  values (adam, hard_in, 'tennis', 'hard', true, now() + interval '5 days', 60, 2, 5, 2, 3000)
  returning id into g_cancelled;
  update public.games set status = 'cancelled', cancelled_at = now() - interval '2 hours',
         cancelled_reason = 'Court double booked by the club.' where id = g_cancelled;

  -- 7 to 9. Past games, so reliability, ratings and the numbers page say things.
  --    The future-only trigger is BEFORE INSERT, so these go in ahead and move back.
  insert into public.games (host_id, venue_id, sport, surface, indoor, starts_at, minutes,
                            level_min, level_max, spots, total_cents)
  values (mara, padel_in, 'padel', 'padel', true, now() + interval '1 hour', 90, 1, 5, 4, 4000)
  returning id into g_past_full;
  insert into public.game_players (game_id, player_id) values (g_past_full, luca), (g_past_full, yuki), (g_past_full, tomas);
  update public.games set starts_at = now() - interval '6 days' where id = g_past_full;

  insert into public.games (host_id, venue_id, sport, surface, indoor, starts_at, minutes,
                            level_min, level_max, spots, total_cents)
  values (sofia, clay_out, 'tennis', 'clay', false, now() + interval '1 hour', 60, 3, 5, 4, 4800)
  returning id into g_past_short;
  insert into public.game_players (game_id, player_id) values (g_past_short, mara), (g_past_short, adam);
  update public.games set starts_at = now() - interval '9 days' where id = g_past_short;

  insert into public.games (host_id, venue_id, sport, surface, indoor, starts_at, minutes,
                            level_min, level_max, spots, total_cents)
  values (tomas, padel_in, 'padel', 'padel', true, now() + interval '1 hour', 90, 1, 5, 4, 4400)
  returning id into g_noshow;
  insert into public.game_players (game_id, player_id) values (g_noshow, ines), (g_noshow, luca), (g_noshow, adam);
  update public.games set starts_at = now() - interval '12 days' where id = g_noshow;

  update public.game_players set attendance = 'played'
   where game_id in (g_past_full, g_past_short, g_noshow);
  update public.game_players set attendance = 'no_show' where game_id = g_noshow and player_id = adam;

  -- 10. A long thread, which is the phone keyboard test.
  insert into public.games (host_id, venue_id, sport, surface, indoor, starts_at, minutes,
                            level_min, level_max, spots, total_cents, note)
  values (pietro, padel_out, 'padel', 'padel', false, now() + interval '6 days' + interval '9 hours', 90,
          1, 5, 4, 5200, 'Outdoor court, so weather dependent. I will post here by midday.')
  returning id into g_chat;
  insert into public.game_players (game_id, player_id) values (g_chat, mara), (g_chat, yuki), (g_chat, ines);

  for i in 1..40 loop
    insert into public.messages (game_id, sender_id, body, created_at)
    values (
      g_chat,
      (array[pietro, mara, yuki, ines])[1 + (i % 4)],
      (array[
        'Works for me.',
        'Can we make it half an hour later? I have a lecture until six.',
        'Fine by me, I will tell the club.',
        'Does anyone have a spare racquet I could borrow?',
        'I have two, bring shoes with a flat sole.',
        'Parking is free there but it fills up, come by bike if you can.',
        'What is the score if it rains?',
        'Covered from October so we are fine either way.'
      ])[1 + (i % 8)],
      now() - interval '2 days' + (i * interval '11 minutes')
    );
  end loop;

  -- ── Reputation ───────────────────────────────────────────────────────────
  insert into public.ratings (game_id, rater_id, ratee_id, stars, signal) values
    (g_past_full, mara, luca,  5, 'about_right'),
    (g_past_full, mara, yuki,  4, 'too_low'),
    (g_past_full, luca, mara,  5, 'about_right'),
    (g_past_full, yuki, mara,  5, 'about_right'),
    (g_past_short, sofia, mara, 4, 'about_right'),
    (g_noshow, tomas, ines,   5, 'about_right')
  on conflict do nothing;

  -- A late withdrawal that counts, and a safety exit that must not.
  insert into public.withdrawals (game_id, player_id, hours_before, is_safety, left_at) values
    (g_past_short, ines,  4.5,  false, now() - interval '9 days'),
    (g_past_full,  adam,  2.0,  false, now() - interval '6 days'),
    (g_noshow,     sofia, 1.25, true,  now() - interval '12 days');

  -- An open report, so the moderator badge has a number on it.
  insert into public.reports (reporter_id, subject_id, game_id, reason, detail, created_at)
  values (ines, adam, g_noshow, 'no_show',
          'Said he was coming in the thread and then did not turn up. We played three handed.',
          now() - interval '11 days');

  -- Views, so the demand column on the numbers page is not all zeroes. No
  -- identity is attached to these, which is the whole point of that table.
  insert into public.game_views (game_id, day, views) values
    (g_open,    current_date,                  23),
    (g_open,    current_date - 1,              11),
    (g_full,    current_date,                  41),
    (g_full,    current_date - 1,              28),
    (g_singles, current_date,                   6),
    (g_chat,    current_date - 2,              14)
  on conflict do nothing;
end $$;

-- Errors, so "what is broken" on the numbers page is not an empty box. Route
-- patterns and redacted messages, exactly as the real reporter writes them.
insert into public.error_log (fingerprint, message, route, route_type, method, source, occurrences, first_seen, last_seen)
values
  (md5('a'), 'Could not load the courts: connection terminated unexpectedly',
   '/games/new', 'render', 'GET', 'server', 3, now() - interval '5 hours', now() - interval '2 hours'),
  (md5('b'), 'Cannot read properties of undefined (reading ''map'')',
   'client', 'render', null, 'client', 11, now() - interval '2 days', now() - interval '20 minutes'),
  (md5('c'), 'duplicate key value violates unique constraint "waitlist_pkey" Key (player_id)=([id])',
   '/games/[id]', 'action', 'POST', 'server', 1, now() - interval '1 day', now() - interval '1 day')
on conflict (fingerprint) do nothing;
