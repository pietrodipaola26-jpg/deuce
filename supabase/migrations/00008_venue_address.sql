-- ============================================================================
-- A COURT WITHOUT AN ADDRESS IS A RUMOUR.
--
-- venues carried name, area and travel. A club name, a neighbourhood, and one
-- line of free text about getting there. That is enough to recognise a place you
-- already know, and not enough to find one you do not, which is exactly the
-- person this product exists for. A first year who has been in Milan three weeks
-- cannot turn "Ripamonti" into a street, and asking in the game thread costs
-- them the confidence the whole product is supposed to give them.
--
-- address is the street line and nothing else. One column, not four. A postcode
-- column, a province column and a coordinate pair are each a field somebody has
-- to fill in correctly before it is worth anything, and a half filled structured
-- address is worse than a complete unstructured one, because the interface has
-- to render the gaps.
--
-- country is here because the schema should not quietly assume what the product
-- currently happens to be. city already exists and defaults to Milan, but city
-- alone is ambiguous the moment a member adds a court in Monza, Lugano or
-- Segrate, all of which are a shorter trip for some students than half of Italy.
-- It defaults to Italy, so no existing row and no existing insert has to change.
--
-- WHY address IS NULLABLE. Members can add their own courts, and a host who
-- knows the club but not the house number must still be able to post the game.
-- Supply is the constraint on this product. A required field that blocks a real
-- game is a worse outcome than a row with a null address, which the interface
-- can simply not render.
-- ============================================================================

alter table public.venues
  add column address text check (char_length(trim(address)) between 4 and 160),
  add column country text not null default 'Italy'
    check (char_length(trim(country)) between 2 and 56);

comment on column public.venues.address is
  'Street line only, for example "Via Gallura 8, 20141". Nullable on purpose: a member adding their own court may not know it, and blocking the game is worse than a null.';

comment on column public.venues.country is
  'Defaults to Italy. Present so city is unambiguous once anybody adds a court outside Italy, which is nearer than most of it for some students.';
