-- ============================================================================
-- THE HOST KNOWS WHAT THE COURT COST. THEY SHOULD NOT HAVE TO DIVIDE IT.
--
-- price_cents held euro cents PER PLAYER, so a host booking a padel court for 40
-- euro had to work out that four people pay 10 each and type that instead. Two
-- things went wrong with it.
--
-- The arithmetic was the host's problem, and it is the kind of arithmetic that
-- gets done wrong at eleven at night. And the number stopped being true the
-- moment the game ran short: three players on a 40 euro court pay 13.34 each,
-- while the card kept insisting on 10, and the gap turned up at the desk as an
-- argument nobody expected.
--
-- The column now holds the WHOLE court fee and Deuce does the division, twice:
--
--   per seat    total / spots   stable, comparable across the feed, and what
--                               everybody pays in the normal case
--   per player  total / taken   what they will actually hand over tonight
--
-- Neither is stored. Both are derived, because a stored copy of a division is a
-- copy that can disagree with its own inputs.
--
-- RENAMED RATHER THAN REDEFINED. Leaving the name price_cents while changing what
-- it means would leave anything I missed wrong by a factor of four, silently and
-- with no error. A rename makes the type checker find every last usage.
--
-- ROUNDING IS ALWAYS UP. 4000 cents across three is 1333.33, so each share is
-- 1334 and the host collects two cents more than the court cost. Rounding down
-- leaves the host out of pocket, which is the one outcome that must never
-- happen, and the interface says so once rather than hiding it.
-- ============================================================================

-- The old check was written inline, so its name was generated. Finding it by
-- what it references rather than by a name I assumed is the difference between a
-- migration that works and the three failures this schema has already had.
do $$
declare c text;
begin
  for c in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public'
      and rel.relname = 'games'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%price_cents%'
  loop
    execute format('alter table public.games drop constraint %I', c);
  end loop;
end $$;

alter table public.games rename column price_cents to total_cents;

-- Every existing game was storing a share. Multiplying by the seats it was
-- divided over recovers the court fee the host actually paid.
update public.games set total_cents = total_cents * spots;

alter table public.games add constraint games_total_cents_sane
  check (total_cents between 0 and 40000);

comment on column public.games.total_cents is
  'The WHOLE court fee in euro cents, not a share. Deuce divides it by spots for the headline price and by taken for what people actually pay, and stores neither. 400 euro ceiling fits a peak padel court with room. Zero is a free game.';
