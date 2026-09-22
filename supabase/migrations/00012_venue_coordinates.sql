-- ============================================================================
-- DISTANCE FROM CAMPUS, AS A NUMBER RATHER THAN A SENTENCE.
--
-- travel already said "2.8 km from campus, about 12 min by bike along the
-- Naviglio". That is the right thing to read and the wrong thing to store: prose
-- cannot be sorted, filtered or compared, so the court list could only ever be
-- alphabetical, which put Aspria at 7.4 km above Tennis Porta Romana at 1.4 km.
--
-- For a Bocconi student, how far a court is IS the decision. Almost everything
-- else is negotiable after a six o'clock lecture, and distance is not. So it
-- becomes data.
--
-- WHY A COORDINATE PAIR AND NOT A STORED DISTANCE. A stored metres_from_campus
-- is one number and answers one question. A coordinate answers every distance
-- question we have not thought of yet, including "near me" rather than "near
-- Bocconi", which matters because a student living in Lambrate does not start
-- their evening on via Sarfatti. It is the same amount of typing.
--
-- Nullable, because a member adding their own club will not know them, and a
-- court with no coordinate is still a court. The list sorts those last rather
-- than refusing them.
--
-- Every pair below is the geocode of the club's own published street address
-- through OpenStreetMap Nominatim, data © OpenStreetMap contributors, ODbL.
-- Distances quoted in travel are great circle from Edificio Sarfatti at
-- 45.448915, 9.189394, so a real walk is a little longer than the number.
-- ============================================================================

alter table public.venues
  add column if not exists lat numeric(9, 6) check (lat between -90 and 90),
  add column if not exists lon numeric(9, 6) check (lon between -180 and 180);

comment on column public.venues.lat is
  'Geocoded from the club''s own published address. Nullable: a member adding a club will not know it, and the list sorts coordinate-less clubs last rather than hiding them.';

update public.venues v set lat = c.lat, lon = c.lon
from (values
  ('Tennis Porta Romana',                  45.4535841,  9.2060014),
  ('S.G.M. Forza e Coraggio',              45.4375600,  9.1991525),
  ('Padel Club Ripamonti',                 45.4310692,  9.1961053),
  ('Getfit Via Vico',                      45.4622715,  9.1677060),
  ('IL LOPE',                              45.4391526,  9.1625263),
  ('BEAT PADEL',                           45.4338640,  9.1651729),
  ('Canottieri Olona 1894',                45.4474862,  9.1534380),
  ('SPH Milano Barona',                    45.4358297,  9.1577513),
  ('Centro Tennis Washington',             45.4620483,  9.1562779),
  ('Ausonia Padel',                        45.4486154,  9.2282231),
  ('Tennis Club Lombardo',                 45.4655665,  9.2253347),
  ('Centro Sportivo Bonacossa',            45.4532379,  9.2472313),
  ('Crespi Sport Village',                 45.4792735,  9.2367319),
  ('MUP Milano Urban Padel',               45.4953500,  9.2040080),
  ('Padel Arena Quintosole',               45.4019437,  9.2030910),
  ('Tennis Club Milano Alberto Bonacossa', 45.4905018,  9.1553999),
  ('Aspria Harbour Club Milano',           45.4808636,  9.1055051),
  ('Quanta Club',                          45.5180940,  9.1634447)
) as c (name, lat, lon)
where lower(trim(v.name)) = lower(trim(c.name))
  and v.is_active;
