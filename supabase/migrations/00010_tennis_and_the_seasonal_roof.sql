-- ============================================================================
-- "INDOOR" IS NOT A PROPERTY OF A MILAN TENNIS COURT. IT IS A SEASON.
--
-- Checking every surface and roof in 00009 against the clubs' own booking pages
-- turned up one wrong row and one wrong idea. The wrong row first:
--
--   Centro Tennis Washington was loaded as outdoor clay. Its booking page says
--   "Dal 07.09.2026 campi coperti". Those three courts are under a dome today.
--
-- That is not an isolated mistake, it is the whole model being wrong. Milan
-- clay clubs put a pressurised dome over their courts for the winter and take it
-- off in spring, and the clubs say so plainly:
--
--   Quanta Club        15 of 16 courts covered October to April. Only the
--                      central court with the bleachers stays open all year.
--   TC Milano Bonacossa 13 of its 16 courts are covered in winter.
--   Tennis Porta Romana "scoperto, illuminato, con copertura invernale".
--   Aspria Harbour Club 18 courts, 12 of them indoor during winter.
--   Centro Tennis Washington covered from September 2026.
--
-- A boolean cannot hold that. Whichever value you pick is wrong for half the
-- year, and the half it is wrong for is the half when a student most needs to
-- know, because an uncovered clay court in January is not a court at all.
--
-- covered_in_winter separates the two facts that `indoor` was confusing:
--
--   indoor = true                 permanently under a roof. A padel box, a
--                                 sports hall. True in August.
--   covered_in_winter = true      open air, and under a dome from roughly
--                                 October to April.
--   both false                    open air all year.
--
-- They cannot both be true, and a check constraint says so.
--
-- WHY NOT JUST RECORD WHAT IS TRUE TODAY. Because it would be false by November
-- and nothing in this system would notice. The rule in 00001 still holds: nothing
-- should need a cron job to be correct. A game happens on a date, so the roof
-- over a game is knowable from `games.indoor`, which the host sets when they post
-- and which the form now defaults from the court plus the date they chose.
--
-- THE TENNIS SIDES THAT WERE MISSING. 00009 loaded five clubs' padel courts and
-- left their tennis out because the surface was unconfirmed. Four are confirmed
-- now, so those clubs appear under both sports, which is what the create form
-- already does once the rows exist: it filters courts by whether the surface can
-- host the chosen sport, so a club with a padel row and a clay row is offered for
-- padel and for tennis without a line of code changing.
--
-- STILL NOT LOADED, and it is one phone call. Padel Arena Quintosole has two
-- indoor tennis courts, confirmed by its booking page and its own site. Neither
-- publishes the surface, and the club's site renders the court count as a
-- placeholder. Guessing it would put the wrong shoes on somebody's feet.
--
-- Also deliberately left out: the four non clay courts at TC Milano Bonacossa
-- (1 PVC, 1 play it, 2 mateco). The club already appears for tennis on its
-- twelve courts of terra rossa, which is what it is known for, and a fifth row
-- for four courts buys nothing but clutter in a picker that is already too long.
--
-- Synthetic keeps mapping to 'hard': play it, play flex, play turf, clay tech,
-- concrete, cement and synthetic grass all land there. The enum has four values
-- and 'grass' has to keep meaning natural grass, of which Milan has none.
-- ============================================================================

-- ── 1. The column ──────────────────────────────────────────────────────────

alter table public.venues
  add column covered_in_winter boolean not null default false;

alter table public.venues add constraint venues_roof_is_not_both check (
  not (indoor and covered_in_winter)
);

comment on column public.venues.covered_in_winter is
  'Open air, and under a pressurised dome from roughly October to April, which is how most Milan clay clubs work. Distinct from indoor, which means permanently roofed. Never both.';

-- ── 2. The roof corrections ────────────────────────────────────────────────
--
-- Washington is the fix. The other two were right to be outdoor and were missing
-- the winter half of the truth.

update public.venues set covered_in_winter = true
where not indoor
  and (name, surface) in (
    ('Centro Tennis Washington',             'clay'::public.surface),
    ('Tennis Porta Romana',                  'clay'::public.surface),
    ('Tennis Club Milano Alberto Bonacossa', 'clay'::public.surface)
  );

-- ── 3. The tennis sides ────────────────────────────────────────────────────
--
-- IL LOPE                      3 courts, synthetic grass, outdoor. Its booking
--                              page lists all three as "outdoor, synthetic_grass",
--                              and unlike its padel they are not covered.
-- Crespi Sport Village         5 courts: 2 indoor concrete, 1 indoor clay,
--                              2 outdoor clay. Two independent sources agree.
-- Quanta Club                  16 courts: 6 terra rossa, 4 clay tech, 6 play it.
--                              Covered October to April.
-- Aspria Harbour Club Milano   18 courts on four surfaces: 8 clay, and 10 across
--                              play turf, play flex and play it. 12 covered in
--                              winter.

insert into public.venues
  (name, area, address, travel, surface, indoor, covered_in_winter, is_verified)
select v.name, v.area, v.address, v.travel,
       v.surface::public.surface, v.indoor, v.covered, true
from (values
  ('IL LOPE', 'San Cristoforo', 'Via Felice Lope de Vega 35, 20143',
   '2.4 km from campus, about 10 min by bike', 'hard', false, false),

  ('Crespi Sport Village', 'Città Studi', 'Via Carlo Valvassori Peroni 48, 20133',
   '5.0 km from campus, about 21 min by bike, near the Politecnico', 'hard', true, false),
  ('Crespi Sport Village', 'Città Studi', 'Via Carlo Valvassori Peroni 48, 20133',
   '5.0 km from campus, about 21 min by bike, near the Politecnico', 'clay', true, false),
  ('Crespi Sport Village', 'Città Studi', 'Via Carlo Valvassori Peroni 48, 20133',
   '5.0 km from campus, about 21 min by bike, near the Politecnico', 'clay', false, false),

  ('Quanta Club', 'Milano Nord', 'Via Assietta 19, 20161',
   '8.0 km from campus, on the northern edge of the city', 'clay', false, true),
  ('Quanta Club', 'Milano Nord', 'Via Assietta 19, 20161',
   '8.0 km from campus, on the northern edge of the city', 'hard', false, true),

  ('Aspria Harbour Club Milano', 'Bosco in Città', 'Via Cascina Bellaria 19, 20153',
   '7.4 km from campus, on the western edge of the city', 'clay', false, true),
  ('Aspria Harbour Club Milano', 'Bosco in Città', 'Via Cascina Bellaria 19, 20153',
   '7.4 km from campus, on the western edge of the city', 'hard', false, true)
) as v (name, area, address, travel, surface, indoor, covered)
where not exists (
  select 1 from public.venues x
  where x.name = v.name
    and x.surface = v.surface::public.surface
    and x.indoor = v.indoor
);
