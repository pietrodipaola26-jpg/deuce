-- ============================================================================
-- LOCAL SEED, courts only.
--
-- Run by `supabase db reset` against the LOCAL stack (and in CI). The Supabase
-- CLI never applies it to a hosted project, so nothing here reaches production:
-- `supabase db push` sends migrations, not seeds.
--
-- WHY ONLY COURTS. Deuce ships with no people and no games in it, on purpose. A
-- product with nobody on it yet is better served by an empty feed and an honest
-- "post the first game" than by invented members: the first thing a student
-- checks is whether anyone they know is on it, and a platform caught inflating
-- that number never gets a second look.
--
-- Courts are different. They are public infrastructure that exists whether or not
-- Deuce does, and a host who cannot name their court cannot post their game.
--
-- ONE ROW PER CLUB. Eighteen real clubs, every address from the club's own
-- booking page or website, every surface and roof checked against the same. A
-- club lists the surfaces it has and whether its courts are roofed, open, or open
-- with a winter dome; the host picks which of those they booked when they post
-- the game. See migration 00011 for why it is shaped this way and not one row
-- per court type, and 00010 for why a winter dome needs its own column.
--
-- WHY THIS DELETES FIRST. `db reset` applies every migration and then runs this
-- file, and migrations 00009 through 00011 populate venues themselves, so a bare
-- insert here would fight them and a guarded one would inherit whichever half of
-- the data the migrations happened to produce. Emptying the table makes this file
-- the single description of the local database. It is safe because venues is
-- referenced only by games.venue_id and a freshly reset database has no games: if
-- it somehow does, the "on delete restrict" makes this fail loudly rather than
-- take a game's history with it.
-- ============================================================================

delete from public.venues;

insert into public.venues
  (name, area, address, travel, surfaces, has_indoor, has_outdoor, covered_in_winter, lat, lon, is_verified)
values
  ('Tennis Porta Romana', 'Porta Romana', 'Largo Franco Parenti 2, 20135',
   '1.4 km from campus, about 17 min on foot or 6 by bike',
   '{clay}', false, true, true, 45.453584, 9.206001, true),

  ('S.G.M. Forza e Coraggio', 'Morivione', 'Via Gallura 8, 20141',
   '1.5 km from campus, 18 min on foot. Bocconi Sport members get a rate here',
   '{hard}', true, false, false, 45.437560, 9.199153, true),

  ('Padel Club Ripamonti', 'Ripamonti', 'Via Cascina Belcasule 15, 20141',
   '2.1 km from campus, about 9 min by bike',
   '{padel}', true, false, false, 45.431069, 9.196105, true),

  ('Getfit Via Vico', 'Magenta', 'Via Gian Battista Vico 38, 20123',
   '2.3 km from campus, about 10 min by bike',
   '{padel}', true, false, false, 45.462271, 9.167706, true),

  ('IL LOPE', 'San Cristoforo', 'Via Felice Lope de Vega 35, 20143',
   '2.4 km from campus, about 10 min by bike',
   '{padel,hard}', true, true, false, 45.439153, 9.162526, true),

  ('BEAT PADEL', 'Barona', 'Via San Paolino 9, 20142',
   '2.5 km from campus, about 11 min by bike',
   '{padel}', true, false, false, 45.433864, 9.165173, true),

  ('Canottieri Olona 1894', 'San Cristoforo', 'Alzaia Naviglio Grande 146, 20144',
   '2.8 km from campus, about 12 min by bike along the Naviglio',
   '{clay}', true, false, false, 45.447486, 9.153438, true),

  ('SPH Milano Barona', 'Barona', 'Via Ovada 22, 20142',
   '2.9 km from campus, about 12 min by bike',
   '{padel}', true, false, false, 45.435830, 9.157751, true),

  ('Centro Tennis Washington', 'Washington', 'Via Sebastiano Caboto 6, 20144',
   '3.0 km from campus, about 13 min by bike',
   '{clay}', false, true, true, 45.462048, 9.156278, true),

  ('Ausonia Padel', 'Ortomercato', 'Via Bonfadini 18, 20137',
   '3.0 km from campus, about 13 min by bike',
   '{padel}', true, false, false, 45.448615, 9.228223, true),

  ('Tennis Club Lombardo', 'Corsica', 'Via Giancarlo Sismondi 8, 20133',
   '3.4 km from campus, about 14 min by bike',
   '{clay}', false, true, false, 45.465567, 9.225335, true),

  ('Centro Sportivo Bonacossa', 'Mecenate', 'Via Mecenate 74, 20138',
   '4.5 km from campus, about 19 min by bike',
   '{clay,hard,padel}', true, true, false, 45.453238, 9.247231, true),

  ('Crespi Sport Village', 'Città Studi', 'Via Carlo Valvassori Peroni 48, 20133',
   '5.0 km from campus, about 21 min by bike, near the Politecnico',
   '{clay,hard,padel}', true, true, false, 45.479273, 9.236732, true),

  ('MUP Milano Urban Padel', 'Maggiolina', 'Via Cardinale Giovanni Cagliero 14/b, 20125',
   '5.3 km from campus, north of the centre',
   '{padel}', true, false, false, 45.495350, 9.204008, true),

  ('Padel Arena Quintosole', 'Quintosole', 'Via Quintosole 42, 20141',
   '5.3 km from campus, straight down Ripamonti',
   '{padel}', true, false, false, 45.401944, 9.203091, true),

  ('Tennis Club Milano Alberto Bonacossa', 'Ghisolfa', 'Via Generale Arimondi 15, 20155',
   '5.3 km from campus, across the city to the north west',
   '{clay}', false, true, true, 45.490502, 9.155400, true),

  ('Aspria Harbour Club Milano', 'Bosco in Città', 'Via Cascina Bellaria 19, 20153',
   '7.4 km from campus, on the western edge of the city',
   '{clay,hard,padel}', true, true, true, 45.480864, 9.105505, true),

  ('Quanta Club', 'Milano Nord', 'Via Assietta 19, 20161',
   '8.0 km from campus, on the northern edge of the city',
   '{clay,hard,padel}', true, true, true, 45.518094, 9.163445, true);
