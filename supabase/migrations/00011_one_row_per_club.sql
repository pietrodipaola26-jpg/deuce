-- ============================================================================
-- A CLUB IS A PLACE, NOT A COURT TYPE.
--
-- venues stored one row per surface per roof, so Centro Sportivo Bonacossa was
-- four rows and Crespi Sport Village was four more. That was defensible when the
-- table held eight rows. With thirty it produced a court picker that offered
-- "Crespi Sport Village" three separate times under tennis, which reads as a bug
-- because it is one: the same place cannot be three places.
--
-- The mistake was putting the court's properties on the venue. A venue answers
-- WHERE. A game answers what was played, on what, and under what. games already
-- carries its own sport, surface and indoor columns, and no constraint in this
-- schema ever tied them to the venue's, so nothing depended on the duplication.
--
-- ONE ROW PER CLUB NOW, and the club says what it offers rather than being
-- decomposed into it:
--
--   surfaces      every surface the club has. Drives which sports it is offered
--                 for: padel needs 'padel', tennis needs anything else.
--   has_indoor    the club has permanently roofed courts.
--   has_outdoor   the club has open air courts.
--   covered_in_winter  those open air courts go under a dome October to April,
--                 which is how most Milan clay clubs work. See 00010.
--
-- The host picks the surface and the roof for their game from what the club has.
-- That is one extra tap and it is the honest place for the question, because the
-- host is the one who booked the court and knows which one they got.
--
-- WHY THE UNIQUE INDEX MATTERS MORE THAN THE MERGE. There has never been a
-- unique constraint on this table. That is why the old seed's `on conflict do
-- nothing` was decorative, why 00009 and 00010 each needed a hand written
-- `not exists` guard, and ultimately why a club could appear three times without
-- anything objecting. One partial unique index on the name ends that class of
-- bug. It is partial because retired rows keep their names: a game played at a
-- court that was later withdrawn should still say where it was.
-- ============================================================================

-- ── 1. The new shape ───────────────────────────────────────────────────────
--
-- venues_roof_is_not_both, from 00010, says a row cannot be both permanently
-- indoors and domed for the winter. That was right when a row was one court type.
-- It is wrong the moment a row is a club, because a club can have both: Aspria
-- has indoor padel AND clay courts under a winter dome, and its surviving row is
-- the indoor padel one. So the constraint has to go before the merge writes, not
-- after. Dropping it here rather than letting `drop column indoor` take it later
-- is the whole fix for the error this migration threw on its first run.
--
-- Everything in this file is written to be safe to run twice, because that first
-- run may have added the columns before it failed.

alter table public.venues drop constraint if exists venues_roof_is_not_both;

alter table public.venues
  add column if not exists surfaces public.surface[] not null default '{}',
  add column if not exists has_indoor boolean not null default false,
  add column if not exists has_outdoor boolean not null default false;

-- ── 2. Merge the active rows, one survivor per club ─────────────────────────
--
-- The survivor is the oldest row, so the id a member may already have bookmarked
-- keeps working. array_agg(distinct ...) collapses the four Bonacossa rows into
-- one club with three surfaces and a roof in both senses.

drop table if exists venue_merge;
create temporary table venue_merge as
select
  lower(trim(name))                            as key,
  (array_agg(id order by created_at, id))[1]   as keep_id,
  array_agg(distinct surface)                  as surfaces,
  bool_or(indoor)                              as has_indoor,
  bool_or(not indoor)                          as has_outdoor,
  bool_or(covered_in_winter)                   as covered
from public.venues
where is_active
group by lower(trim(name));

update public.venues v set
  surfaces          = m.surfaces,
  has_indoor        = m.has_indoor,
  has_outdoor       = m.has_outdoor,
  covered_in_winter = m.covered
from venue_merge m
where v.id = m.keep_id;

-- Any game sitting on a row about to be deleted moves to the survivor first.
-- games.venue_id is "on delete restrict", so skipping this would abort the
-- migration rather than lose a game, but the game would still be wrong.
update public.games g set venue_id = m.keep_id
from public.venues v
join venue_merge m on m.key = lower(trim(v.name))
where g.venue_id = v.id
  and v.is_active
  and v.id <> m.keep_id;

delete from public.venues v
using venue_merge m
where m.key = lower(trim(v.name))
  and v.is_active
  and v.id <> m.keep_id;

-- Retired rows are not merged: they exist to keep an old game's history honest,
-- and merging two withdrawn courts into one would invent a place. They still
-- need the new columns filled so the constraints below hold.
update public.venues set
  surfaces    = array[surface],
  has_indoor  = indoor,
  has_outdoor = not indoor
where not is_active;

-- ── 3. Retire the old columns ──────────────────────────────────────────────
--
-- Everything above still needed surface and indoor to read from. Nothing below
-- does. venues_roof_is_not_both, which used to hang off indoor, was already
-- dropped in step 1; its replacements are in step 4.

alter table public.venues
  drop column if exists surface,
  drop column if exists indoor;

-- ── 4. The constraints the old shape could not express ─────────────────────

alter table public.venues
  drop constraint if exists venues_has_a_surface,
  drop constraint if exists venues_has_a_roof,
  drop constraint if exists venues_winter_cover_is_outdoor;

alter table public.venues
  add constraint venues_has_a_surface check (cardinality(surfaces) between 1 and 4),
  add constraint venues_has_a_roof check (has_indoor or has_outdoor),
  add constraint venues_winter_cover_is_outdoor check (
    not covered_in_winter or has_outdoor
  );

-- The index this table should have had since 00001.
create unique index if not exists venues_one_row_per_active_club
  on public.venues (lower(trim(name)))
  where is_active;

drop table if exists venue_merge;

comment on column public.venues.surfaces is
  'Every surface the club has. Decides which sports the club is offered for: padel needs padel, tennis needs anything else. The host picks one of these for the game.';
comment on column public.venues.has_indoor is
  'The club has permanently roofed courts. Not exclusive with has_outdoor: most big clubs have both.';
comment on column public.venues.has_outdoor is
  'The club has open air courts. See covered_in_winter for whether they are domed from October to April.';
