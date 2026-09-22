-- ============================================================================
-- LOCAL SEED — courts only.
--
-- This file is run by `supabase db reset` against the LOCAL stack (and in CI).
-- The Supabase CLI never applies it to a hosted project, so nothing here reaches
-- production: `supabase db push` sends migrations, not seeds.
--
-- WHY ONLY COURTS. Deuce ships with no people and no games in it, on purpose. A
-- product with nobody on it yet is better served by an empty feed and an honest
-- "post the first game" than by invented members: the first thing a student
-- checks is whether anyone they know is on it, and a platform caught inflating
-- that number never gets a second look.
--
-- Courts are different. They are public infrastructure that exists whether or
-- not Deuce does, and a host who cannot name their court cannot post their game.
-- The rows below are the clubs Bocconi students actually play at, with the
-- travel note from campus that is the detail people really ask for. Confirm the
-- list against reality before launch, and add to it in Studio or with SQL —
-- members can also add a court from the create-game form, which lands unverified
-- until a moderator confirms it.
-- ============================================================================

insert into public.venues (name, area, travel, surface, indoor, is_verified)
values
  ('Centro Sportivo Bocconi', 'On campus',    'Inside the sports centre on via Bocconi',  'hard',  true,  true),
  ('Centro Sportivo Bocconi', 'On campus',    'Inside the sports centre on via Bocconi',  'clay',  false, true),
  ('Tennis Club Lombardo',    'Porta Romana', '9 min walk from campus',                   'clay',  false, true),
  ('Padel Club Ripamonti',    'Ripamonti',    '12 min by tram 24 from Bocconi',           'padel', true,  true),
  ('Padel Club Ripamonti',    'Ripamonti',    '12 min by tram 24 from Bocconi',           'padel', false, true),
  ('Padel Milano Sud',        'Famagosta',    '15 min on M2 from Romolo',                 'padel', true,  true),
  ('Quanta Sport Village',    'Barona',       '20 min on the 74 bus',                     'padel', true,  true),
  ('Circolo Tennis Navigli',  'Navigli',      '14 min by tram 3',                         'hard',  false, true)
on conflict do nothing;
