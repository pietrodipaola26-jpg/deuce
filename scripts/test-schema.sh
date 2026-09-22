#!/usr/bin/env bash
# Runs tests/schema.test.sql against the local stack.
#
# These are the rules the product cannot be wrong about: who may join a game, who
# may read a thread, who may rate whom, and what a stranger can see. They are
# tested in SQL rather than through the UI because they are enforced in SQL — a
# test that drives a form only proves the form asks nicely.
set -euo pipefail

CONTAINER="supabase_db_deuce"

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "The local stack is not running. Start it with: npm run db:start" >&2
  exit 1
fi

echo "Resetting the local database…"
supabase db reset >/dev/null

echo "Running schema tests…"
output=$(docker exec -i "$CONTAINER" psql -U postgres -d postgres -q < tests/schema.test.sql 2>&1)

echo "$output" | grep -E 'TEST|PASS|FAIL|ERROR|COMPLETE' || true

if echo "$output" | grep -q 'FAIL'; then
  echo; echo "Schema tests FAILED." >&2
  exit 1
fi
if ! echo "$output" | grep -q 'ALL TESTS COMPLETE'; then
  echo; echo "Schema tests did not run to completion." >&2
  exit 1
fi
echo; echo "Schema tests passed."
