-- ============================================================================
-- ACCOUNT DELETION HAS TO ACTUALLY WORK.
--
-- `messages.sender_id` was ON DELETE SET NULL, while the check constraint
-- `messages_system_has_no_sender` requires that a non-system message HAS a
-- sender. Those two rules contradict each other the moment somebody who has
-- written in a thread deletes their account: the cascade tries to null the
-- column, the constraint refuses, and the whole deletion is rolled back.
--
-- So "Delete my account" failed for exactly the people most likely to use it,
-- and it failed with a constraint error rather than a message. The privacy page
-- promises deletion is immediate and complete and names the messages you wrote
-- as part of it, so the fix is to honour that: the messages go with the account.
--
-- The trade-off is deliberate and worth naming. Deleting somebody's lines leaves
-- gaps in a thread other players were part of, and removes context a moderator
-- might have wanted. Erasure wins: a promise made on the privacy page is not
-- something to quietly qualify later, and a thread closes a day after the game
-- anyway. System lines, which have no author, are unaffected and still record
-- that a game was cancelled.
-- ============================================================================

alter table public.messages
  drop constraint messages_sender_id_fkey;

alter table public.messages
  add constraint messages_sender_id_fkey
  foreign key (sender_id) references public.profiles (id) on delete cascade;
