\set ON_ERROR_STOP on
\timing off

-- ── Fixtures: five accounts, created the way GoTrue creates them. ───────────
create or replace function pg_temp.mkuser(addr text) returns uuid
language plpgsql as $$
declare uid uuid := gen_random_uuid();
begin
  -- The token columns are written as empty strings, NOT left NULL.
  --
  -- GoTrue scans them into a Go `string`, and a NULL makes every later call to
  -- its admin API fail with "converting NULL to string is unsupported" — which
  -- looks like a broken sign-up, on rows this test file created. Leaving them
  -- unset poisons the whole local stack for anything run afterwards.
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

create or replace function pg_temp.become(uid uuid) returns void
language plpgsql as $$
begin
  perform set_config('role', 'authenticated', false);
  perform set_config('request.jwt.claims',
    json_build_object('sub', uid, 'role', 'authenticated')::text, false);
end $$;

create or replace function pg_temp.godmode() returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '', false);
  reset role;
end $$;

\echo '── TEST 1: a non-Bocconi address is refused at the database ──'
do $$
begin
  perform pg_temp.mkuser('someone@gmail.com');
  raise exception 'FAIL: gmail.com was admitted';
exception
  when check_violation then raise notice 'PASS: gmail.com rejected';
end $$;

\echo '── TEST 2: profiles are created automatically, unonboarded ──'
select pg_temp.mkuser('mara.v@studbocconi.it')   as mara \gset
select pg_temp.mkuser('tomas.r@studbocconi.it')  as tomas \gset
select pg_temp.mkuser('yuki.t@studbocconi.it')   as yuki \gset
select pg_temp.mkuser('luca.p@studbocconi.it')   as luca \gset
select pg_temp.mkuser('prof.k@unibocconi.it')    as prof \gset

select case when count(*) = 5 and count(*) filter (where onboarded_at is null) = 5
  then 'PASS: 5 profiles, none onboarded' else 'FAIL' end from public.profiles;

\echo '── TEST 3: an incomplete profile cannot be marked onboarded ──'
do $$
begin
  update public.profiles set onboarded_at = now() where id = (select id from public.profiles limit 1);
  raise exception 'FAIL: onboarded without a name or level';
exception
  when check_violation then raise notice 'PASS: incomplete onboarding refused';
end $$;

\echo '── TEST 3b: a name but no level in EITHER sport is still incomplete ──'
do $$
declare victim uuid := (select id from public.profiles limit 1);
begin
  update public.profiles
  set first_name='X', last_initial='Y', terms_accepted_at=now(), age_confirmed_at=now(), onboarded_at=now()
  where id = victim;
  raise exception 'FAIL: onboarded with no sport at all';
exception
  when check_violation then raise notice 'PASS: at least one sport is required';
end $$;

\echo '── TEST 3c: ONE sport is enough ──'
do $$
declare victim uuid := (select id from public.profiles limit 1);
begin
  update public.profiles
  set first_name='X', last_initial='Y', padel_level=3, terms_accepted_at=now(), age_confirmed_at=now(), onboarded_at=now()
  where id = victim;
  raise notice 'PASS: one sport is enough';
  -- Put it back, so the rest of the file starts from where it expected to.
  update public.profiles
  set first_name=null, last_initial=null, padel_level=null,
      terms_accepted_at=null, age_confirmed_at=null, onboarded_at=null
  where id = victim;
end $$;

\echo '── TEST 3d: accepting the rules without confirming your age is not enough ──'
do $$
declare victim uuid := (select id from public.profiles where onboarded_at is null limit 1);
begin
  update public.profiles
  set first_name='X', last_initial='Y', padel_level=3,
      terms_accepted_at=now(), onboarded_at=now()   -- no age_confirmed_at
  where id = victim;
  raise exception 'FAIL: onboarded without confirming age';
exception
  when check_violation then raise notice 'PASS: age confirmation is required separately';
end $$;


-- Onboard everyone properly (as the service role, standing in for the action).
-- A level PER SPORT. Mara is deliberately uneven across the two, which is the
-- case a single level column could not represent. Kay plays only tennis, which
-- is what TEST 6b needs.
update public.profiles set first_name='Mara',  last_initial='V', tennis_level=4, padel_level=2,
  languages='{Italian,English}', programme='MSc Finance', study_year='2nd year',
  terms_accepted_at=now(), age_confirmed_at=now(), onboarded_at=now() where id = :'mara';
update public.profiles set first_name='Tomás', last_initial='R', padel_level=3,
  languages='{Spanish,English}', programme='Exchange · BIEM', study_year='1st semester',
  terms_accepted_at=now(), age_confirmed_at=now(), onboarded_at=now() where id = :'tomas';
update public.profiles set first_name='Yuki',  last_initial='T', tennis_level=2,
  languages='{Japanese,English}', terms_accepted_at=now(), age_confirmed_at=now(), onboarded_at=now() where id = :'yuki';
update public.profiles set first_name='Luca',  last_initial='P', padel_level=2,
  languages='{Italian}', terms_accepted_at=now(), age_confirmed_at=now(), onboarded_at=now() where id = :'luca';
update public.profiles set first_name='Kay',   last_initial='K', tennis_level=5, padel_level=5,
  languages='{English}', terms_accepted_at=now(), age_confirmed_at=now(), onboarded_at=now() where id = :'prof';

\echo '── TEST 4: an unonboarded member sees nothing; the trigger seats the host ──'
select id as padel_court from public.venues where surface='padel' and indoor limit 1 \gset
select id as hard_court  from public.venues where surface='hard' limit 1 \gset
select set_config('deuce.hard', :'hard_court', false), set_config('deuce.mara', :'mara', false),
       set_config('deuce.tomas', :'tomas', false), set_config('deuce.padel', :'padel_court', false);

select pg_temp.become(:'tomas');
insert into public.games (host_id, venue_id, sport, surface, indoor, starts_at, minutes,
                          level_min, level_max, spots, price_cents, note, provides)
values (:'tomas', :'padel_court', 'padel', 'padel', true, now() + interval '3 days', 90,
        2, 3, 4, 900, 'Relaxed game. Two of us started this term.', '{Balls,"Two spare racquets"}')
returning id as g1 \gset
select set_config('deuce.g1', :'g1', false);

select case when taken = 1 and status = 'open' then 'PASS: host seated, 1/4, open'
            else 'FAIL: taken=' || taken || ' status=' || status end
from public.games where id = :'g1';

\echo '── TEST 5: joining works, and the host is notified ──'
select pg_temp.become(:'luca');
select public.join_game(:'g1');
select pg_temp.godmode();
select case when (select taken from public.games where id=:'g1') = 2
             and exists (select 1 from public.notifications
                         where user_id=:'tomas' and kind='game_joined')
  then 'PASS: 2/4 and host notified' else 'FAIL' end;

\echo '── TEST 6: the level range is enforced, per sport ──'
select pg_temp.become(:'prof');   -- padel 5, the game wants padel 2-3
do $$
begin
  perform public.join_game(current_setting('deuce.g1')::uuid);
  raise exception 'FAIL: padel 5 joined a padel 2-3 game';
exception
  when check_violation then raise notice 'PASS: level gate held';
end $$;

\echo '── TEST 6b: the level checked is the one for THAT sport ──'
-- Yuki is tennis 2 and does not play padel at all. The padel game wants 2-3, so
-- a single-level model would have let her in on her tennis number. This is the
-- whole reason the levels are separate.
select pg_temp.become(:'yuki');
do $$
begin
  perform public.join_game(current_setting('deuce.g1')::uuid);
  raise exception 'FAIL: a tennis level got somebody into a padel game';
exception
  when check_violation then raise notice 'PASS: a tennis level does not open padel games';
end $$;

\echo '── TEST 6c: you cannot host a sport you do not play ──'
do $$
begin
  insert into public.games (host_id, venue_id, sport, surface, indoor, starts_at, minutes,
                            level_min, level_max, spots, price_cents)
  values (auth.uid(), current_setting('deuce.padel')::uuid, 'padel', 'padel', true,
          now() + interval '2 days', 90, 1, 5, 4, 900);
  raise exception 'FAIL: hosted a padel game with no padel level';
exception
  when check_violation then raise notice 'PASS: host must play the sport';
end $$;

\echo '── TEST 7: a non-participant cannot read the thread ──'
select pg_temp.become(:'tomas');
insert into public.messages (game_id, sender_id, body)
values (:'g1', :'tomas', 'Court 3 is booked. Entrance on the left, not the big gate.');

select pg_temp.become(:'prof');
select case when count(*) = 0 then 'PASS: outsider sees no messages' else 'FAIL: leaked ' || count(*) end
from public.messages where game_id = :'g1';

select pg_temp.become(:'luca');
select case when count(*) = 1 then 'PASS: participant sees the thread' else 'FAIL' end
from public.messages where game_id = :'g1';

\echo '── TEST 8: the message fanned out to the other players only ──'
select pg_temp.godmode();
select case when count(*) = 1 and min(user_id::text) = :'luca'
  then 'PASS: only Luca notified, not the sender' else 'FAIL: ' || count(*) end
from public.notifications where kind = 'game_message';

\echo '── TEST 9: capacity cannot be exceeded ──'
select pg_temp.become(:'yuki');
insert into public.games (host_id, venue_id, sport, surface, indoor, starts_at, minutes,
                          level_min, level_max, spots, price_cents)
values (:'yuki', :'hard_court', 'tennis', 'hard', false, now() + interval '2 days', 60,
        1, 5, 2, 800)
returning id as g2 \gset
select set_config('deuce.g2', :'g2', false);

select pg_temp.become(:'mara');
select public.join_game(:'g2');          -- 2/2, now full
select pg_temp.godmode();
select case when status='full' then 'PASS: status went full' else 'FAIL: ' || status end
from public.games where id=:'g2';

select pg_temp.become(:'prof');
do $$
begin
  perform public.join_game(current_setting('deuce.g2')::uuid);
  raise exception 'FAIL: a third player joined a 2-spot game';
exception
  when check_violation then raise notice 'PASS: full game refused';
end $$;

\echo '── TEST 10: direct INSERT on game_players is revoked ──'
do $$
begin
  insert into public.game_players (game_id, player_id)
  values (current_setting('deuce.g2')::uuid, auth.uid());
  raise exception 'FAIL: bypassed join_game()';
exception
  when insufficient_privilege then raise notice 'PASS: direct seat insert denied';
end $$;

\echo '── TEST 11: a host cannot leave, and cannot rate before the game ──'
select pg_temp.become(:'yuki');
do $$
begin
  perform public.leave_game(current_setting('deuce.g2')::uuid);
  raise exception 'FAIL: host left their own game';
exception
  when check_violation then raise notice 'PASS: host told to cancel instead';
end $$;

do $$
begin
  perform public.rate_player(current_setting('deuce.g2')::uuid,
                             current_setting('deuce.mara')::uuid, 5::smallint);
  raise exception 'FAIL: rated before the game happened';
exception
  when check_violation then raise notice 'PASS: rating blocked until the game ends';
end $$;

\echo '── TEST 12: after the game, attendance and ratings work and feed the record ──'
select pg_temp.godmode();
update public.games set starts_at = now() - interval '3 hours' where id = :'g2';

select pg_temp.become(:'yuki');   -- host of g2
select public.mark_attendance(:'g2', :'mara', 'played');
select public.rate_player(:'g2', :'mara', 5::smallint, 'about_right');

select pg_temp.become(:'mara');
select case when rating = 5.0 and rating_count = 1 and games_played = 1 and reliability = 100
  then 'PASS: record reads 5.0 / 1 game / 100%'
  else 'FAIL: rating=' || coalesce(rating::text,'null') || ' played=' || games_played
       || ' reliability=' || coalesce(reliability::text,'null') end
from public.player_stats where player_id = :'mara';

\echo '── TEST 13: you cannot see who rated you, only the average ──'
select case when count(*) = 0 then 'PASS: raw ratings hidden from the ratee' else 'FAIL' end
from public.ratings where ratee_id = :'mara';

\echo '── TEST 14: reliability is NULL for somebody with no history ──'
select case when reliability is null and games_played = 0
  then 'PASS: new player reads as new, not as perfect' else 'FAIL' end
from public.player_stats where player_id = :'luca';

\echo '── TEST 15: a game cannot be posted in the past ──'
select pg_temp.become(:'mara');
do $$
begin
  insert into public.games (host_id, venue_id, sport, surface, indoor, starts_at, minutes,
                            level_min, level_max, spots, price_cents)
  values (auth.uid(), current_setting('deuce.hard')::uuid, 'tennis', 'hard', false,
          now() - interval '2 days', 60, 1, 5, 2, 800);
  raise exception 'FAIL: posted a game in the past';
exception
  when check_violation then raise notice 'PASS: past-dated game refused';
end $$;

\echo '── TEST 16: cancelling tells everyone, and stays cancelled ──'
select pg_temp.become(:'tomas');
select public.cancel_game(:'g1', 'Court flooded');
select pg_temp.godmode();
select case when (select status from public.games where id=:'g1') = 'cancelled'
             and (select count(*) from public.notifications
                  where kind='game_cancelled' and game_id=:'g1') = 1
             and (select count(*) from public.messages
                  where game_id=:'g1' and is_system) = 1
  then 'PASS: cancelled, 1 notice, 1 system line' else 'FAIL' end;

-- Emptying a seat must not reopen a cancelled game.
delete from public.game_players where game_id=:'g1' and player_id=:'luca';
select case when (select status from public.games where id=:'g1') = 'cancelled'
  then 'PASS: cancelled game stayed cancelled' else 'FAIL: reopened' end;

\echo '── TEST 17: nothing is visible to the anonymous role ──'
-- Stronger than "no rows": the SELECT grant is revoked, so anon cannot even
-- name the table. Both outcomes are a pass; this asserts the one we built.
set role anon;
do $$
begin
  perform count(*) from public.games;
  raise exception 'FAIL: anon could read games';
exception
  when insufficient_privilege then raise notice 'PASS: anon denied at the grant';
end $$;
reset role;

\echo '── TEST 18: deleting an account actually succeeds, and takes its traces ──'
-- This is a regression test. `messages.sender_id` was ON DELETE SET NULL while a
-- check constraint required non-system messages to HAVE a sender, so deleting
-- anybody who had written in a thread failed with a constraint error. The privacy
-- page promises erasure is immediate and complete, so it has to work for exactly
-- those people.
select pg_temp.godmode();
select count(*) as msgs_before from public.messages where sender_id = :'tomas' \gset
delete from auth.users where id = :'tomas';
delete from auth.users where id = :'mara';

select case
  when (select count(*) from public.profiles where id = :'tomas') = 0
   and (select count(*) from public.messages where sender_id = :'tomas') = 0
  then 'PASS: the account and its messages are gone'
  else 'FAIL: something survived the delete' end;

-- Deleting a PARTICIPANT must not take somebody else's game with them. Only a
-- host's own games go, which is why Settings tells a host to cancel first.
select case
  when (select count(*) from public.games where id = :'g2') = 1
   and (select count(*) from public.game_players where game_id = :'g2' and player_id = :'mara') = 0
   and (select count(*) from public.ratings where rater_id = :'mara') = 0
  then 'PASS: the game survived, the leaver''s seat and ratings did not'
  else 'FAIL: deleting a participant damaged somebody else''s game' end
from (select 1) _ 
where (select count(*) from public.profiles where id = :'mara') = 0;

\echo '── TEST 19: only a moderator can resolve a report ──'
select pg_temp.godmode();
update public.profiles set is_moderator = true where id = :'yuki';
select set_config('deuce.yuki', :'yuki', false), set_config('deuce.luca', :'luca', false);

select pg_temp.become(:'luca');
insert into public.reports (reporter_id, subject_id, reason, detail)
values (:'luca', :'prof', 'conduct', 'Rude for the whole hour.')
returning id as rep \gset
select set_config('deuce.rep', :'rep', false);

-- The reporter is told it arrived; the subject is told nothing yet.
select pg_temp.godmode();
select case
  when (select count(*) from public.notifications where user_id=:'luca' and kind='report_filed') = 1
   and (select count(*) from public.notifications where user_id=:'prof') = 0
  then 'PASS: reporter confirmed, subject kept in the dark'
  else 'FAIL' end;

-- A non-moderator cannot resolve it.
select pg_temp.become(:'mara');
do $$
begin
  perform public.resolve_report(current_setting('deuce.rep')::uuid, 'ban', 'because');
  raise exception 'FAIL: a member resolved a report';
exception
  when insufficient_privilege then raise notice 'PASS: only a moderator may resolve';
end $$;

\echo '── TEST 20: a dismissal tells the reporter and nobody else ──'
select pg_temp.become(:'yuki');   -- the moderator
select public.resolve_report(:'rep', 'dismissed', 'Nothing here breaks a rule.');
select pg_temp.godmode();
select case
  when (select status from public.reports where id=:'rep') = 'dismissed'
   and (select outcome from public.reports where id=:'rep') is null
   and (select count(*) from public.notifications where user_id=:'luca' and kind='report_resolved') = 1
   and (select count(*) from public.notifications where user_id=:'prof') = 0
  then 'PASS: dismissed quietly, reporter told'
  else 'FAIL' end;

\echo '── TEST 21: a ban is total, and the account keeps its record ──'
select pg_temp.become(:'luca');
insert into public.reports (reporter_id, subject_id, reason, detail)
values (:'luca', :'prof', 'safety', 'Followed me to the tram.')
returning id as rep2 \gset
select set_config('deuce.rep2', :'rep2', false);

select pg_temp.become(:'yuki');
select public.resolve_report(:'rep2', 'ban', 'Following another player after a game.');

select pg_temp.godmode();
select case
  when (select banned_at from public.profiles where id=:'prof') is not null
   and (select count(*) from public.notifications where user_id=:'prof' and kind='moderation_decision') = 1
   and (select count(*) from public.profiles where id=:'prof') = 1
  then 'PASS: banned, told, and the row survives'
  else 'FAIL' end;

-- The banned account can now see nothing and do nothing.
select pg_temp.become(:'prof');
select case
  when (select count(*) from public.games) = 0
   and (select count(*) from public.profiles where id <> auth.uid()) = 0
   and public.is_member() = false
  then 'PASS: a ban closes the whole product'
  else 'FAIL: a banned account can still read' end;

do $$
begin
  perform public.join_game(current_setting('deuce.g2')::uuid);
  raise exception 'FAIL: a banned account joined a game';
exception
  when others then raise notice 'PASS: a banned account cannot join';
end $$;

\echo '── TEST 22: a report cannot be resolved twice ──'
select pg_temp.become(:'yuki');
do $$
begin
  perform public.resolve_report(current_setting('deuce.rep2')::uuid, 'warning', 'again');
  raise exception 'FAIL: resolved the same report twice';
exception
  when check_violation then raise notice 'PASS: a resolved report stays resolved';
end $$;

\echo '── TEST 23: a reason is required, and a moderator may judge a report about themselves ──'
-- Deliberately a report ABOUT the moderator. With a single moderator the only
-- alternative is a report nobody can ever close, so it is allowed and recorded
-- under their name; the page says so on the card.
select pg_temp.become(:'luca');
insert into public.reports (reporter_id, subject_id, reason)
values (:'luca', :'yuki', 'spam')
returning id as rep3 \gset
select set_config('deuce.rep3', :'rep3', false);

select pg_temp.become(:'yuki');
do $$
begin
  perform public.resolve_report(current_setting('deuce.rep3')::uuid, 'warning', '   ');
  raise exception 'FAIL: resolved with no reason';
exception
  when check_violation then raise notice 'PASS: a reason is required';
end $$;

select public.resolve_report(:'rep3', 'dismissed', 'Reviewed by the person it names.');
select pg_temp.godmode();
select case when (select status from public.reports where id=:'rep3') = 'dismissed'
  then 'PASS: a moderator may resolve a report about themselves' else 'FAIL' end;

\echo '── TEST 24: every court the pickers can offer has a street address ──'
-- The seed used to name six clubs that do not exist, two of them courts at a
-- sports centre with no courts. An address is the cheapest check against that
-- happening again: nobody invents a house number by accident. Member added
-- courts are exempt, because address is nullable on purpose for them.
select pg_temp.godmode();
select case when not exists (
    select 1 from public.venues
    where is_active and is_verified and address is null
  ) then 'PASS: every verified active court has an address'
  else 'FAIL: a verified court is active with no address' end;

\echo '── TEST 25: the retired courts stay out of the pickers ──'
select case when not exists (
    select 1 from public.venues
    where is_active and name in (
      'Centro Sportivo Bocconi', 'Padel Milano Sud',
      'Circolo Tennis Navigli', 'Quanta Sport Village'
    )
  ) then 'PASS: no fabricated court is active'
  else 'FAIL: a fabricated court is still active' end;

\echo 'ALL TESTS COMPLETE'
