#!/usr/bin/env bash
#
# LOAD THE DEVELOPMENT FIXTURES. LOCAL ONLY.
#
# supabase/seed-dev.sql invents eight people and their games. That is fine on a
# laptop and unacceptable anywhere a real student can see it: somebody would join
# a game that is not happening and ride across Milan at night to an empty court.
#
# So this script talks to the local Docker container and nothing else. There is
# no flag to point it at a remote project, and adding one would be a mistake.
#
#   ./scripts/seed-dev.sh
#
# Re-runnable. It clears the invented people first, which cascades to their
# games, seats, messages, ratings and reports. The eighteen real courts from
# seed.sql are left alone.

set -euo pipefail

if [ ! -f "supabase/seed-dev.sql" ]; then
  echo "Run this from the root of the Deuce repository." >&2
  exit 1
fi

DB_CONTAINER="$(docker ps --format '{{.Names}}' | grep '^supabase_db_' | head -1)"
if [ -z "$DB_CONTAINER" ]; then
  echo "No local Supabase container is running. Start it with: supabase start" >&2
  exit 1
fi

echo "Loading fixtures into $DB_CONTAINER"
echo

if ! docker exec -i "$DB_CONTAINER" psql -U postgres -v ON_ERROR_STOP=1 -q \
      < supabase/seed-dev.sql; then
  echo >&2
  echo "Fixtures failed to load. Nothing was left half applied: the file runs in" >&2
  echo "one transaction, so the database is as it was." >&2
  exit 1
fi

echo "── loaded ─────────────────────────────────────────────────────"
docker exec -i "$DB_CONTAINER" psql -U postgres -tA -F '  ' -c "
  select 'people',   count(*)::text from public.profiles
  union all select 'games',    count(*)::text from public.games
  union all select 'seats',    count(*)::text from public.game_players
  union all select 'waiting',  count(*)::text from public.waitlist
  union all select 'messages', count(*)::text from public.messages
  union all select 'ratings',  count(*)::text from public.ratings
  union all select 'reports',  count(*)::text from public.reports
  union all select 'errors',   count(*)::text from public.error_log;
"

cat <<'TXT'

Sign in as any of them. Moderator is the first:

  node scripts/signin-link.mjs pietro.d@studbocconi.it     moderator
  node scripts/signin-link.mjs mara.v@studbocconi.it       hosts three games
  node scripts/signin-link.mjs luca.b@studbocconi.it       level 2, first year
  node scripts/signin-link.mjs sofia.r@studbocconi.it      tennis only, level 5
  node scripts/signin-link.mjs yuki.t@studbocconi.it       padel only
TXT
