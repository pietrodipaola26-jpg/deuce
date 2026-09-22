-- ============================================================================
-- SIX OF THE EIGHT COURTS DID NOT EXIST.
--
-- The venue list this product launched with was written to make the interface
-- look populated, and it was never checked. Going through it against the clubs'
-- own sites, Playtomic and the university:
--
--   Centro Sportivo Bocconi          The Bocconi Sport Center has two pools, a
--                                    gym, an arena and an indoor running track.
--                                    It has no tennis and no padel courts.
--                                    Bocconi Sport sends its tennis members to
--                                    Forza e Coraggio in via Gallura instead,
--                                    which is why that club is added below.
--   Padel Club Ripamonti, outdoor    The club is indoor only. Two courts.
--   Padel Milano Sud                 No club of this name exists in Milan.
--   Circolo Tennis Navigli           No club of this name exists in Milan.
--   Tennis Club Lombardo             Real, and nowhere near Porta Romana. It is
--                                    in via Sismondi, 3.4 km away, not a nine
--                                    minute walk.
--   Quanta Sport Village             Real, and called Quanta Club, and in the
--                                    far north of the city, not in Barona.
--
-- This matters more than a data error normally would. Deuce asks a student to
-- travel across Milan at night to meet people they have never met, on the
-- strength of what this table says. A court that is not there is the single
-- fastest way to lose that trust, and "is_verified" was set to true on every one
-- of those rows.
--
-- WHY DEACTIVATE RATHER THAN DELETE. games.venue_id is "on delete restrict", so
-- deleting a venue that any real game has ever pointed at would fail, and the
-- correct behaviour is not to force it. A past game should keep saying where it
-- was even once the row is retired. listVenues() already filters on is_active,
-- so a deactivated court disappears from every picker without touching history.
--
-- WHAT REPLACES THEM. Eighteen clubs, gathered two ways: the ten nearest to
-- Edificio Sarfatti, and the ten largest or longest established, which overlap
-- by two. Every address comes from the club's own booking page or website.
-- Distances are great circle from 45.44891, 9.18939 to each geocoded address, so
-- the real walk is a little longer. Bike times assume 14 km/h.
--
-- A row is one surface under one roof, so a club offering clay indoors, hard
-- outdoors and padel is three rows. Centro Sportivo Bonacossa is four. That is
-- the shape the table already had, and it is the reason the court picker needs
-- rebuilding, which is a separate job.
--
-- WHAT IS DELIBERATELY NOT HERE. Five clubs have tennis courts whose surface or
-- roof I could not confirm from a first party source: IL LOPE (3 courts),
-- Padel Arena Quintosole (2), Crespi Sport Village, Aspria Harbour Club (18) and
-- Quanta Club (16, clay confirmed, coverage not). Their padel sides are loaded
-- and their tennis sides are not. Guessing a surface here would repeat exactly
-- the mistake this migration exists to undo. A phone call fixes each one.
--
-- Synthetic surfaces (play it, green set, clay tech, concrete) are recorded as
-- 'hard'. The enum has four values and that is the honest bucket for all of them.
-- ============================================================================

-- ── 1. Retire the fabrications ─────────────────────────────────────────────
--
-- Matched on the three columns that identify a row here, since these were seeded
-- without stable ids. is_verified goes false as well: it was never true.

update public.venues set is_active = false, is_verified = false
where (name, surface, indoor) in (
  ('Centro Sportivo Bocconi',  'hard'::public.surface,  true),
  ('Centro Sportivo Bocconi',  'clay'::public.surface,  false),
  ('Padel Club Ripamonti',     'padel'::public.surface, false),
  ('Padel Milano Sud',         'padel'::public.surface, true),
  ('Circolo Tennis Navigli',   'hard'::public.surface,  false)
);

-- ── 2. Correct the three that are real ─────────────────────────────────────

update public.venues set
  area    = 'Corsica',
  address = 'Via Giancarlo Sismondi 8, 20133',
  travel  = '3.4 km from campus, about 14 min by bike'
where name = 'Tennis Club Lombardo' and surface = 'clay' and not indoor;

update public.venues set
  address = 'Via Cascina Belcasule 15, 20141',
  travel  = '2.1 km from campus, about 9 min by bike'
where name = 'Padel Club Ripamonti' and surface = 'padel' and indoor;

update public.venues set
  name    = 'Quanta Club',
  area    = 'Milano Nord',
  address = 'Via Assietta 19, 20161',
  travel  = '8.0 km from campus, on the northern edge of the city'
where name = 'Quanta Sport Village' and surface = 'padel' and indoor;

-- ── 3. Load the verified clubs ─────────────────────────────────────────────
--
-- Guarded by "not exists" on the same three columns, so running this against a
-- database that already has the seed applied does not duplicate anything. The
-- surface literals are cast explicitly: an untyped literal in a VALUES list is
-- 'unknown' to the planner, which is the same trap that broke
-- sync_game_seat_count() in 00001.

insert into public.venues (name, area, address, travel, surface, indoor, is_verified)
select v.name, v.area, v.address, v.travel, v.surface::public.surface, v.indoor, true
from (values
  -- Nearest first. The first two are the ones a student will actually reach
  -- after a six o'clock lecture.
  ('Tennis Porta Romana', 'Porta Romana', 'Largo Franco Parenti 2, 20135',
   '1.4 km from campus, about 17 min on foot or 6 by bike', 'clay', false),

  ('S.G.M. Forza e Coraggio', 'Morivione', 'Via Gallura 8, 20141',
   '1.5 km from campus, 18 min on foot. Bocconi Sport members get a rate here', 'hard', true),

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

  -- Centro Sportivo Bonacossa is one club with four distinct court types. Four
  -- rows, because a game is played on one of them and not the others.
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

  -- The indoor Quanta row is the corrected Quanta Sport Village above. These are
  -- the six outdoor courts.
  ('Quanta Club', 'Milano Nord', 'Via Assietta 19, 20161',
   '8.0 km from campus, on the northern edge of the city', 'padel', false)
) as v (name, area, address, travel, surface, indoor)
where not exists (
  select 1 from public.venues x
  where x.name = v.name
    and x.surface = v.surface::public.surface
    and x.indoor = v.indoor
);
