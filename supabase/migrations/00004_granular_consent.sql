-- ============================================================================
-- ONE TICK BOX WAS DOING TWO JOBS.
--
-- Onboarding asked people to agree to a single sentence that bundled together
-- "I am 18 or over" and "I agree to the community rules". That is convenient and
-- it is not consent: GDPR art. 4(11) requires consent to be specific, and a
-- person who ticks a bundled box has not told you which half they were agreeing
-- to. It also left the age claim unrecorded, so there was nothing to point at if
-- it were ever questioned.
--
-- Two separate confirmations now, each with its own timestamp, each a positive
-- act. Both are shown back to the member in Settings, because a consent you
-- cannot go and look at is a consent you cannot meaningfully withdraw.
--
-- WHY AGE MATTERS HERE. Deuce sends adults to meet strangers at courts at night.
-- It is also the threshold under Italian law (GDPR art. 8 as implemented by
-- d.lgs. 196/2003 art. 2-quinquies sets digital consent at 14, but this product
-- is for over-18s by its own rules) and the university's population is adult.
-- ============================================================================

alter table public.profiles
  add column age_confirmed_at timestamptz;

comment on column public.profiles.age_confirmed_at is
  'When the member confirmed they are 18 or over. Separate from terms_accepted_at on purpose: bundled consent is not consent.';

-- Everybody who onboarded under the old bundled box did confirm their age, since
-- the single sentence said so. Carrying the timestamp across records what they
-- actually agreed to rather than silently dropping it.
update public.profiles
set age_confirmed_at = terms_accepted_at
where onboarded_at is not null and terms_accepted_at is not null;

alter table public.profiles drop constraint profiles_onboarded_is_complete;

alter table public.profiles add constraint profiles_onboarded_is_complete check (
  onboarded_at is null
  or (
    first_name is not null
    and last_initial is not null
    and terms_accepted_at is not null
    and age_confirmed_at is not null
    and (tennis_level is not null or padel_level is not null)
  )
);
