-- ============================================================================
-- LOCAL SEED, courts only.
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
-- Courts are different. They are public infrastructure that exists whether or not
-- Deuce does, and a host who cannot name their court cannot post their game.
--
-- WHAT THIS FILE IS NOW. Thirty rows over eighteen real clubs, every address from
-- the club's own booking page or website, every surface and roof checked against
-- the same. It replaced eight rows, six of which named places that do not exist,
-- including two courts at a Bocconi sports centre that has no courts. Migrations
-- 00009 and 00010 make production agree with this.
--
-- A ROW IS ONE SURFACE UNDER ONE ROOF, and that is why a club appears more than
-- once. Centro Sportivo Bonacossa has four kinds of court and therefore four
-- rows. Five clubs have both sports and so appear under both in the create form,
-- which needs no code to do it: the form offers courts whose surface can host the
-- chosen sport, so a padel row and a clay row at one club is all it takes.
--
-- indoor MEANS PERMANENTLY ROOFED. covered_in_winter means open air with a dome
-- over it from roughly October to April, which is how most Milan clay clubs work
-- and what a boolean alone could not say. See 00010. Never both.
--
-- Ordered by distance from campus, which is the order a student cares about.
-- Distances are great circle from Edificio Sarfatti, so the real walk is longer.
--
-- WHY EVERY ROW IS GUARDED BY `not exists`. `db reset` applies the migrations
-- first and runs this file second, and 00009 and 00010 insert most of these same
-- clubs. An unguarded insert here would double every one of them locally while
-- production stayed correct, which is the worst kind of divergence: the
-- environment you test in is the broken one. Guarded, the files compose. The old
-- `on conflict do nothing` was not doing this job. There is no unique constraint
-- on venues for it to act on, so it never did anything at all.
-- ============================================================================

insert into public.venues
  (name, area, address, travel, surface, indoor, covered_in_winter, is_verified)
select v.name, v.area, v.address, v.travel,
       v.surface::public.surface, v.indoor, v.covered, true
from (values
  ('Tennis Porta Romana', 'Porta Romana', 'Largo Franco Parenti 2, 20135',
   '1.4 km from campus, about 17 min on foot or 6 by bike', 'clay', false, true),

  ('S.G.M. Forza e Coraggio', 'Morivione', 'Via Gallura 8, 20141',
   '1.5 km from campus, 18 min on foot. Bocconi Sport members get a rate here', 'hard', true, false),

  ('Padel Club Ripamonti', 'Ripamonti', 'Via Cascina Belcasule 15, 20141',
   '2.1 km from campus, about 9 min by bike', 'padel', true, false),

  ('Getfit Via Vico', 'Magenta', 'Via Gian Battista Vico 38, 20123',
   '2.3 km from campus, about 10 min by bike', 'padel', true, false),

  ('IL LOPE', 'San Cristoforo', 'Via Felice Lope de Vega 35, 20143',
   '2.4 km from campus, about 10 min by bike', 'padel', true, false),
  ('IL LOPE', 'San Cristoforo', 'Via Felice Lope de Vega 35, 20143',
   '2.4 km from campus, about 10 min by bike', 'hard', false, false),

  ('BEAT PADEL', 'Barona', 'Via San Paolino 9, 20142',
   '2.5 km from campus, about 11 min by bike', 'padel', true, false),

  ('Canottieri Olona 1894', 'San Cristoforo', 'Alzaia Naviglio Grande 146, 20144',
   '2.8 km from campus, about 12 min by bike along the Naviglio', 'clay', true, false),

  ('SPH Milano Barona', 'Barona', 'Via Ovada 22, 20142',
   '2.9 km from campus, about 12 min by bike', 'padel', true, false),

  ('Centro Tennis Washington', 'Washington', 'Via Sebastiano Caboto 6, 20144',
   '3.0 km from campus, about 13 min by bike', 'clay', false, true),

  ('Ausonia Padel', 'Ortomercato', 'Via Bonfadini 18, 20137',
   '3.0 km from campus, about 13 min by bike', 'padel', true, false),

  ('Tennis Club Lombardo', 'Corsica', 'Via Giancarlo Sismondi 8, 20133',
   '3.4 km from campus, about 14 min by bike', 'clay', false, false),

  ('Centro Sportivo Bonacossa', 'Mecenate', 'Via Mecenate 74, 20138',
   '4.5 km from campus, about 19 min by bike', 'clay', true, false),
  ('Centro Sportivo Bonacossa', 'Mecenate', 'Via Mecenate 74, 20138',
   '4.5 km from campus, about 19 min by bike', 'hard', true, false),
  ('Centro Sportivo Bonacossa', 'Mecenate', 'Via Mecenate 74, 20138',
   '4.5 km from campus, about 19 min by bike', 'hard', false, false),
  ('Centro Sportivo Bonacossa', 'Mecenate', 'Via Mecenate 74, 20138',
   '4.5 km from campus, about 19 min by bike', 'padel', true, false),

  ('Crespi Sport Village', 'Città Studi', 'Via Carlo Valvassori Peroni 48, 20133',
   '5.0 km from campus, about 21 min by bike, near the Politecnico', 'padel', true, false),
  ('Crespi Sport Village', 'Città Studi', 'Via Carlo Valvassori Peroni 48, 20133',
   '5.0 km from campus, about 21 min by bike, near the Politecnico', 'clay', true, false),
  ('Crespi Sport Village', 'Città Studi', 'Via Carlo Valvassori Peroni 48, 20133',
   '5.0 km from campus, about 21 min by bike, near the Politecnico', 'hard', true, false),
  ('Crespi Sport Village', 'Città Studi', 'Via Carlo Valvassori Peroni 48, 20133',
   '5.0 km from campus, about 21 min by bike, near the Politecnico', 'clay', false, false),

  ('MUP Milano Urban Padel', 'Maggiolina', 'Via Cardinale Giovanni Cagliero 14/b, 20125',
   '5.3 km from campus, north of the centre', 'padel', true, false),

  ('Padel Arena Quintosole', 'Quintosole', 'Via Quintosole 42, 20141',
   '5.3 km from campus, straight down Ripamonti', 'padel', true, false),

  ('Tennis Club Milano Alberto Bonacossa', 'Ghisolfa', 'Via Generale Arimondi 15, 20155',
   '5.3 km from campus, across the city to the north west', 'clay', false, true),

  ('Aspria Harbour Club Milano', 'Bosco in Città', 'Via Cascina Bellaria 19, 20153',
   '7.4 km from campus, on the western edge of the city', 'padel', true, false),
  ('Aspria Harbour Club Milano', 'Bosco in Città', 'Via Cascina Bellaria 19, 20153',
   '7.4 km from campus, on the western edge of the city', 'clay', false, true),
  ('Aspria Harbour Club Milano', 'Bosco in Città', 'Via Cascina Bellaria 19, 20153',
   '7.4 km from campus, on the western edge of the city', 'hard', false, true),

  ('Quanta Club', 'Milano Nord', 'Via Assietta 19, 20161',
   '8.0 km from campus, on the northern edge of the city', 'padel', true, false),
  ('Quanta Club', 'Milano Nord', 'Via Assietta 19, 20161',
   '8.0 km from campus, on the northern edge of the city', 'padel', false, false),
  ('Quanta Club', 'Milano Nord', 'Via Assietta 19, 20161',
   '8.0 km from campus, on the northern edge of the city', 'clay', false, true),
  ('Quanta Club', 'Milano Nord', 'Via Assietta 19, 20161',
   '8.0 km from campus, on the northern edge of the city', 'hard', false, true)
) as v (name, area, address, travel, surface, indoor, covered)
where not exists (
  select 1 from public.venues x
  where x.name = v.name
    and x.surface = v.surface::public.surface
    and x.indoor = v.indoor
);
