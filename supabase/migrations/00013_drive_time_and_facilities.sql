-- ============================================================================
-- WHAT A STUDENT ASKS BEFORE THEY AGREE TO GO.
--
-- The club panel answered where and what surface. It did not answer the two
-- questions people actually ask each other in the group chat before saying yes:
-- how long does it take to get there, and is there anywhere to leave my bag and
-- get a drink afterwards. Both are now data rather than something the host has to
-- type into the note.
--
-- drive_minutes is a real route, not a guess from the straight line distance. It
-- comes from OSRM over the OpenStreetMap road network, campus to club, and it is
-- FREE FLOW: no traffic model, no time of day. Milan at 18:30 is slower than this
-- and the interface says so rather than pretending otherwise. It is still far
-- better than dividing kilometres by an invented average speed, because it
-- follows actual roads: Quanta is 8.0 km away in a straight line and 13.0 km of
-- driving.
--
-- facilities is the club's own published amenity list, normalised to a short
-- vocabulary so the panel reads as a set of chips rather than as fifteen
-- different ways of writing "bar". Playtomic's Cafeteria and Snack Bar both
-- become Bar, Equipment Rental becomes Racquet hire, Disabled Access becomes
-- Step-free access, Free Parking and Private Parking both become Parking.
--
-- TWO CLUBS HAVE NO FACILITIES LISTED and that is deliberate, not an oversight.
-- Tennis Porta Romana is a single court and publishes nothing beyond its
-- floodlights. Tennis Club Milano Alberto Bonacossa does not publish an amenity
-- list anywhere I could find. An empty array renders as no line at all, which is
-- the honest outcome. Inventing a bar for a club because clubs usually have one
-- is exactly the habit that put six courts that do not exist into this table.
-- ============================================================================

alter table public.venues
  add column if not exists drive_minutes smallint
    check (drive_minutes between 1 and 240),
  add column if not exists facilities text[] not null default '{}';

comment on column public.venues.drive_minutes is
  'Driving minutes from campus over the real road network, free flow. No traffic model, so the interface says "without traffic" rather than implying a promise.';
comment on column public.venues.facilities is
  'The club''s own published amenities, normalised to a short vocabulary. Empty means the club publishes none, never that we assumed.';

-- The casts are required and this is the third time this schema has been bitten
-- by it. A literal inside a VALUES list is 'unknown' to the planner, which
-- resolves to text, and text does not implicitly become text[] or smallint on
-- assignment. Same trap as the enum cast in 00001 and in 00009.
update public.venues v set
  drive_minutes = c.mins::smallint,
  facilities    = c.facs::text[]
from (values
  ('Tennis Porta Romana', 5, '{"Floodlit"}'),
  ('S.G.M. Forza e Coraggio', 5, '{"Racquet hire","Bar","Changing rooms"}'),
  ('Padel Club Ripamonti', 6, '{"Parking","Bar","Changing rooms","Lockers","Racquet hire","Wi-Fi","Step-free access","Gym","Shop"}'),
  ('Getfit Via Vico', 6, '{"Restaurant","Bar","Changing rooms","Lockers","Racquet hire"}'),
  ('IL LOPE', 7, '{"Parking","Restaurant","Bar","Changing rooms","Racquet hire","Step-free access"}'),
  ('BEAT PADEL', 8, '{"Parking","Restaurant","Bar","Changing rooms","Lockers","Racquet hire","Wi-Fi"}'),
  ('Canottieri Olona 1894', 8, '{"Parking","Restaurant","Bar","Changing rooms","Lockers","Wi-Fi","Step-free access","Pool","Gym"}'),
  ('SPH Milano Barona', 8, '{"Parking","Bar","Changing rooms","Racquet hire","Wi-Fi","Step-free access","Shop"}'),
  ('Centro Tennis Washington', 7, '{"Changing rooms"}'),
  ('Ausonia Padel', 8, '{"Parking","Restaurant","Bar","Changing rooms","Racquet hire"}'),
  ('Tennis Club Lombardo', 9, '{"Restaurant","Bar","Pool","Gym"}'),
  ('Centro Sportivo Bonacossa', 10, '{"Parking","Restaurant","Bar","Changing rooms","Lockers","Racquet hire","Wi-Fi"}'),
  ('Crespi Sport Village', 12, '{"Bar","Changing rooms","Step-free access"}'),
  ('MUP Milano Urban Padel', 13, '{"Bar","Changing rooms","Lockers","Racquet hire","Wi-Fi","Step-free access"}'),
  ('Padel Arena Quintosole', 10, '{"Parking","Bar","Changing rooms","Racquet hire","Wi-Fi","Step-free access","Shop"}'),
  ('Tennis Club Milano Alberto Bonacossa', 13, '{}'),
  ('Aspria Harbour Club Milano', 14, '{"Parking","Restaurant","Bar","Changing rooms","Lockers","Wi-Fi"}'),
  ('Quanta Club', 22, '{"Restaurant","Bar","Changing rooms","Lockers","Wi-Fi","Step-free access","Shop"}')
) as c (name, mins, facs)
where lower(trim(v.name)) = lower(trim(c.name))
  and v.is_active;
