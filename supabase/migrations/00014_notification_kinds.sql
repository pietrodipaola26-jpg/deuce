-- ============================================================================
-- THREE NEW KINDS OF NOTICE, ON THEIR OWN, FOR A REASON.
--
-- This migration does nothing but widen an enum, which looks wasteful until you
-- try to do it any other way. PostgreSQL lets `alter type ... add value` run
-- inside a transaction, but it will not let the new value be USED in that same
-- transaction, and the Supabase CLI wraps each migration in one. That is why
-- 00005 added the three report kinds and 00006 was the migration that inserted
-- them. Same shape here: these are declared now and used by 00016 and 00017.
--
--   waitlist_promoted  a seat came free and you are in the game
--   waitlist_joined    somebody is waiting for a seat in a game you host
--   safety_exit        a member left a game for a safety reason, moderators only
-- ============================================================================

alter type public.notification_kind add value if not exists 'waitlist_promoted';
alter type public.notification_kind add value if not exists 'waitlist_joined';
alter type public.notification_kind add value if not exists 'safety_exit';
