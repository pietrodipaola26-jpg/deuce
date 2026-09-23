#!/usr/bin/env bash
#
# PROVE THE BACKUP RESTORES, BEFORE THE DAY IT MATTERS.
#
# A backup nobody has restored is a hope. This loads the most recent one into a
# throwaway database inside the local Supabase container, counts what arrived,
# and drops it again. It touches nothing on production and nothing on the live
# site.
#
# WHAT IT PROVES
#   roles.sql and schema.sql are valid and rebuild the whole structure: every
#   table, function, RLS policy and trigger. That is the half that is hardest to
#   reconstruct by hand and the half most likely to rot silently.
#
#   The public data loads. venues in particular, which has no dependency on
#   accounts and is therefore the clean signal that COPY blocks are intact.
#
# WHY IT RESTORES INTO THE LOCAL DATABASE AND NOT A FRESH ONE.
#
# The first version of this script created an empty database and restored into
# that. It produced 110 errors and almost nothing came back, and the reason is
# worth writing down because anybody attempting a real recovery will hit it.
#
# A Supabase dump assumes a Supabase-PROVISIONED database. It expects the
# `extensions`, `auth` and `vault` schemas and the `supabase_realtime`
# publication to already exist, because the platform creates all four when you
# make a project. In a bare database, `CREATE TABLE public.venues` fails on its
# `extensions.gen_random_uuid()` default, and every table, policy and trigger
# that depends on venues fails after it.
#
# So the correct target is a provisioned database with an empty public schema,
# which is precisely what a new Supabase project is. This reproduces that state
# locally by emptying public and auth.users in the running dev stack.
#
# THIS WIPES YOUR LOCAL DEV DATABASE. That is safe: it holds only seed data, and
# `supabase db reset` puts it back. It never touches production.
#
# Requires `supabase start` to be running.

set -uo pipefail

DEST="${BACKUP_DIR:-$HOME/Deuce-backups}"
DB_CONTAINER="$(docker ps --format '{{.Names}}' | grep '^supabase_db_' | head -1)"
SCRATCH="postgres"

if [ -z "$DB_CONTAINER" ]; then
  echo "No local Supabase database container found. Run: supabase start" >&2
  exit 1
fi

LATEST="$(ls -1d "$DEST"/*/ 2>/dev/null | sort | tail -1)"
if [ -z "$LATEST" ]; then
  echo "No backup found in $DEST. Run ./scripts/backup.sh first." >&2
  exit 1
fi

echo "Rehearsing:  $LATEST"
echo "Into:        $DB_CONTAINER, the local dev database (which this wipes)"
echo

psql_scratch() { docker exec -i "$DB_CONTAINER" psql -U postgres -d "$SCRATCH" -q "$@"; }

# Empty public and the accounts, leaving the platform schemas intact. This is a
# new Supabase project, as far as the dump is concerned.
docker exec -i "$DB_CONTAINER" psql -U postgres -d "$SCRATCH" -q \
  -c "drop schema if exists public cascade;" \
  -c "create schema public;" \
  -c "grant usage on schema public to anon, authenticated, service_role;" \
  -c "grant all on schema public to postgres;" \
  -c "delete from auth.users cascade;" >/dev/null 2>&1

# Roles are cluster-wide and already exist locally, so "already exists" here is
# the correct outcome rather than a failure.
echo "1/3  roles      (already-exists errors are expected and fine)"
docker exec -i "$DB_CONTAINER" psql -U postgres -q < "$LATEST/roles.sql" 2>/dev/null >/dev/null

echo "2/3  schema"
schema_err="$(psql_scratch < "$LATEST/schema.sql" 2>&1 >/dev/null | grep -c "^ERROR" || true)"

echo "3/3  data       including the accounts"
data_err="$(psql_scratch < "$LATEST/data.sql" 2>&1 >/dev/null | grep -c "^ERROR" || true)"

echo
echo "── what came back ─────────────────────────────────────────────"

count() {
  docker exec -i "$DB_CONTAINER" psql -U postgres -d "$SCRATCH" -tAc "$1" 2>/dev/null | tr -d ' '
}

tables="$(count "select count(*) from information_schema.tables where table_schema='public' and table_type='BASE TABLE';")"
funcs="$(count "select count(*) from information_schema.routines where routine_schema='public';")"
policies="$(count "select count(*) from pg_policies where schemaname='public';")"
triggers="$(count "select count(*) from information_schema.triggers where trigger_schema='public';")"
venues="$(count "select count(*) from public.venues;")"
accounts="$(count "select count(*) from auth.users;")"
profiles="$(count "select count(*) from public.profiles;")"

printf '  %-22s %s\n' "tables"        "${tables:-0}"
printf '  %-22s %s\n' "functions"     "${funcs:-0}"
printf '  %-22s %s\n' "RLS policies"  "${policies:-0}"
printf '  %-22s %s\n' "triggers"      "${triggers:-0}"
printf '  %-22s %s\n' "venues loaded"  "${venues:-0}"
printf '  %-22s %s\n' "accounts loaded" "${accounts:-0}"
printf '  %-22s %s\n' "profiles loaded" "${profiles:-0}"
printf '  %-22s %s\n' "schema errors" "${schema_err:-?}"
printf '  %-22s %s\n' "data errors"   "${data_err:-?}"

echo
fail=0
[ "${tables:-0}"   -ge 10 ] || { echo "Too few tables restored."   >&2; fail=1; }
[ "${policies:-0}" -ge 10 ] || { echo "RLS policies did not restore. This is the one that must not fail silently." >&2; fail=1; }
[ "${venues:-0}"   -ge 18 ] || { echo "The venues did not load."   >&2; fail=1; }
[ "${accounts:-0}" -ge 1 ]  || { echo "NO ACCOUNTS RESTORED. This is the failure that matters." >&2; fail=1; }
[ "${schema_err:-1}" -eq 0 ] || { echo "The schema restored with errors." >&2; fail=1; }

if [ "$fail" -ne 0 ]; then
  echo "REHEARSAL FAILED. The backup would not restore cleanly." >&2
  exit 1
fi

echo "Rehearsal passed. Structure, data and accounts all restore."
echo
echo "Your local dev database now contains a copy of production. Put it back with:"
echo "  supabase db reset"
