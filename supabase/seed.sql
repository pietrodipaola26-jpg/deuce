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
-- WHY THIS FILE WAS REWRITTEN. It used to hold eight rows, six of which named
-- places that do not exist, including two courts at a Bocconi sports centre that
-- has no courts. Migration 00009 retires those in production. This file has to
-- agree with it, because `db reset` applies migrations and then runs the seed, so
-- a seed still holding the old rows would put every fabrication straight back
-- into the local database and quietly disagree with production forever.
--
-- These twenty two rows are the same eighteen clubs 00009 loads. Every address
-- comes from the club's own booking page or website. Distances are great circle
-- from Edificio Sarfatti, so the real walk is a little longer.
--
-- A row is one surface under one roof. Centro Sportivo Bonacossa has four court
-- types and therefore four rows, and Quanta has covered and open padel courts.
-- Ordered by distance from campus, which is the order a student cares about.
--
-- WHY EVERY ROW IS GUARDED BY `not exists`. `db reset` applies the migrations
-- first and runs this file second, and 00009 inserts most of these same clubs.
-- An unguarded insert here would therefore double every one of them locally
-- while production stayed correct, which is the worst kind of divergence: the
-- environment you test in is the broken one. Guarded, the two files compose. On a
-- fresh local database 00009 loads nineteen rows and this file adds the three it
-- does not, because 00009 reaches those three by correcting rows that only ever
-- existed in a database this seed had already run against.
--
-- The old `on conflict do nothing` was not doing this job. There is no unique
-- constraint on venues for it to act on, so it never did anything at all.
-- ============================================================================

insert into public.venues (name, area, address, travel, surface, indoor, is_verified)
select v.name, v.area, v.address, v.travel, v.surface::public.surface, v.indoor, true
from (values
  ('Tennis Porta Romana', 'Porta Romana', 'Largo Franco Parenti 2, 20135',
   '1.4 km from campus, about 17 min on foot or 6 by bike', 'clay', false),

  ('S.G.M. Forza e Coraggio', 'Morivione', 'Via Gallura 8, 20141',
   '1.5 km from campus, 18 min on foot. Bocconi Sport members get a rate here', 'hard', true),

  ('Padel Club Ripamonti', 'Ripamonti', 'Via Cascina Belcasule 15, 20141',
   '2.1 km from campus, about 9 min by bike', 'padel', true),

  ('Getfit Via Vico', 'Magenta', 'Via Gian Battista Vico 38, 20123',
   '2.3 km from campus, about 10 min by bike', 'padel', true),

  ('IL LOPE', 'San Cristoforo', 'Via Felice Lope de Vega 35, 20143',
   '2.4 km from campus, about 10 min by bike', 'padel', true),

  ('BEAT PADEL', 'Barona', 'Via San Paolino 9, 20142',
   '2.5 km from campus, about 11 min by bike', 'padel', true),

  ('Canottieri Olona 1894', 'San Cristoforo', 'Alzaia Naviglio Grande 146, 20144',
   '2.8 km from campus, about 12 min by bike along the Naviglio', 'clay', true),

  ('SPH Milano Barona', 'Barona', 'Via Ovada 22, 20142',
   '2.9 km from campus, about 12 min by bike', 'padel', true),

  ('Centro Tennis Washington', 'Washington', 'Via Sebastiano Caboto 6, 20144',
   '3.0 km from campus, about 13 min by bike', 'clay', false),

  ('Ausonia Padel', 'Ortomercato', 'Via Bonfadini 18, 20137',
   '3.0 km from campus, about 13 min by bike', 'padel', true),

  ('Tennis Club Lombardo', 'Corsica', 'Via Giancarlo Sismondi 8, 20133',
   '3.4 km from campus, about 14 min by bike', 'clay', false),

  ('Centro Sportivo Bonacossa', 'Mecenate', 'Via Mecenate 74, 20138',
   '4.5 km from campus, about 19 min by bike', 'clay', true),
  ('Centro Sportivo Bonacossa', 'Mecenate', 'Via Mecenate 74, 20138',
   '4.5 km from campus, about 19 min by bike', 'hard', true),
  ('Centro Sportivo Bonacossa', 'Mecenate', 'Via Mecenate 74, 20138',
   '4.5 km from campus, about 19 min by bike', 'hard', false),
  ('Centro Sportivo Bonacossa', 'Mecenate', 'Via Mecenate 74, 20138',
   '4.5 km from campus, about 19 min by bike', 'padel', true),

  ('Crespi Sport Village', 'Città Studi', 'Via Carlo Valvassori Peroni 48, 20133',
   '5.0 km from campus, about 21 min by bike, near the Politecnico', 'padel', true),

  ('MUP Milano Urban Padel', 'Maggiolina', 'Via Cardinale Giovanni Cagliero 14/b, 20125',
   '5.3 km from campus, north of the centre', 'padel', true),

  ('Padel Arena Quintosole', 'Quintosole', 'Via Quintosole 42, 20141',
   '5.3 km from campus, straight down Ripamonti', 'padel', true),

  ('Tennis Club Milano Alberto Bonacossa', 'Ghisolfa', 'Via Generale Arimondi 15, 20155',
   '5.3 km from campus, across the city to the north west', 'clay', false),

  ('Aspria Harbour Club Milano', 'Bosco in Città', 'Via Cascina Bellaria 19, 20153',
   '7.4 km from campus, on the western edge of the city', 'padel', true),

  ('Quanta Club', 'Milano Nord', 'Via Assietta 19, 20161',
   '8.0 km from campus, on the northern edge of the city', 'padel', true),
  ('Quanta Club', 'Milano Nord', 'Via Assietta 19, 20161',
   '8.0 km from campus, on the northern edge of the city', 'padel', false)
) as v (name, area, address, travel, surface, indoor)
where not exists (
  select 1 from public.venues x
  where x.name = v.name
    and x.surface = v.surface::public.surface
    and x.indoor = v.indoor
);
