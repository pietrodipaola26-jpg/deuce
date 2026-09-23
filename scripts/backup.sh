#!/usr/bin/env bash
#
# THE ONLY COPY OF DEUCE THAT IS NOT THE LIVE DATABASE.
#
# Supabase's Free plan takes no backups. Not short retention: none. Drop a table
# and there is no restore button anywhere in the dashboard. So this script is not
# a belt-and-braces nicety, it is the only thing standing between a bad afternoon
# and losing every member, game and report permanently.
#
# THREE FILES, because that is what a restore needs and in this order:
#
#   roles.sql    cluster roles. Restores FIRST, or every grant in the schema has
#                nothing to grant to.
#   schema.sql   tables, functions, RLS policies, triggers, constraints.
#   data.sql     the rows.
#
# THE -s auth,public ON THE DATA DUMP IS THE WHOLE POINT. `supabase db dump`
# excludes the auth schema by default, and auth.users is where the accounts live.
# profiles.id is a foreign key to it. A dump without it restores every game and
# profile pointing at users who do not exist, which fails on restore or, worse,
# looks fine until somebody tries to sign in. The script checks for it below and
# refuses to call the backup good without it.
#
# WHY IT WRITES OUTSIDE THE REPO. data.sql contains real email addresses and the
# contents of auth.users. That must never sit in a directory git is watching, and
# the surest way to guarantee that is to never put it there. Default destination
# is ~/Deuce-backups, which is not a repository and never will be.
#
# Usage:  ./scripts/backup.sh  [destination directory]

set -euo pipefail

DEST="${1:-$HOME/Deuce-backups}"
STAMP="$(date +%Y-%m-%d-%H%M)"
OUT="$DEST/$STAMP"

# ── Refuse to run in the wrong place ───────────────────────────────────────

if ! command -v supabase >/dev/null 2>&1; then
  echo "supabase CLI not found on PATH." >&2
  exit 1
fi

if [ ! -f "supabase/config.toml" ]; then
  echo "Run this from the root of the Deuce repository." >&2
  exit 1
fi

# A backup inside a git repo is a leak waiting to be committed.
if [ -d "$DEST/.git" ] || git -C "$DEST" rev-parse --git-dir >/dev/null 2>&1; then
  echo "Refusing to write backups into a git repository: $DEST" >&2
  echo "data.sql contains real email addresses. Choose a directory outside git." >&2
  exit 1
fi

mkdir -p "$OUT"
echo "Backing up to $OUT"
echo

# ── The three dumps ────────────────────────────────────────────────────────
#
# The CLI may ask for the database password the first time after a reset. That
# is expected; type it and it will remember.

echo "1/3  roles"
supabase db dump --linked --role-only -f "$OUT/roles.sql"

echo "2/3  schema"
supabase db dump --linked -f "$OUT/schema.sql"

echo "3/3  data, including the accounts"
supabase db dump --linked --data-only --use-copy -s auth,public -f "$OUT/data.sql"

echo

# ── Now prove it is worth keeping ──────────────────────────────────────────
#
# An unchecked backup is a guess. These are cheap and they catch the two ways
# this silently breaks: an empty dump, and a dump missing the accounts.

fail=0

for f in roles.sql schema.sql data.sql; do
  if [ ! -s "$OUT/$f" ]; then
    echo "EMPTY: $f" >&2
    fail=1
  fi
done

if ! grep -q "CREATE TABLE" "$OUT/schema.sql" 2>/dev/null; then
  echo "schema.sql has no CREATE TABLE in it." >&2
  fail=1
fi

# Count the rows in every COPY block. The CLI writes quoted identifiers,
# COPY "auth"."users" (...) FROM stdin; and a block ends at a lone backslash-dot.
# Counting beats grepping for a name: a COPY header with nothing under it is an
# empty table, and looking only for the header would call that a good backup.
ROWS="$(awk '
  /^COPY /   { t=$2; gsub(/"/,"",t); n=0; blk=1; next }
  blk && /^\\\.$/ { if (n>0) printf "%s %d\n", t, n; blk=0; next }
  blk        { n++ }
' "$OUT/data.sql")"

users="$(printf '%s\n' "$ROWS" | awk '$1=="auth.users"   {print $2}')"
venues="$(printf '%s\n' "$ROWS" | awk '$1=="public.venues" {print $2}')"

# The check this script exists for. auth.users is where the accounts live and
# profiles.id is a foreign key to it: a dump without it restores every game and
# profile pointing at people who do not exist.
if [ -z "${users:-}" ]; then
  echo "data.sql contains no rows in auth.users. The accounts are missing." >&2
  echo "Do not trust this backup: the -s auth,public flag is not working." >&2
  fail=1
fi

if [ -z "${venues:-}" ]; then
  echo "data.sql contains no venues. Expected eighteen clubs." >&2
  fail=1
fi

echo "── what is in it ──────────────────────────────────────────────"
for f in roles.sql schema.sql data.sql; do
  printf '%-12s %8s lines  %6s\n' "$f" \
    "$(wc -l < "$OUT/$f" | tr -d ' ')" \
    "$(du -h "$OUT/$f" | cut -f1)"
done

echo
echo "rows, by table:"
if [ -n "$ROWS" ]; then
  printf '%s\n' "$ROWS" | awk '{ printf "  %-28s %6d\n", $1, $2 }'
else
  echo "  (none)"
fi

echo
if [ "$fail" -ne 0 ]; then
  echo "BACKUP IS NOT TRUSTWORTHY. See the errors above." >&2
  exit 1
fi

echo "Backup complete and checked: $OUT"
echo "  accounts: ${users:-0}   venues: ${venues:-0}"

# ── Seal it, so it can safely leave this machine ───────────────────────────
#
# data.sql holds every member's email address and the whole of auth.users. Drag
# that into iCloud or Drive as it stands and Apple or Google is now processing
# your members' personal data, which is a processor you would have to name in the
# privacy policy. Encrypt it here and the cloud holds ciphertext instead: the
# plaintext never leaves this disk and nothing in the legal pages changes.
#
# AES-256 with PBKDF2 at 600k iterations. LibreSSL, which ships with macOS. Not
# `zip -e`, whose legacy ZipCrypto has been broken for decades.
#
# Aborting here is fine. The loose files above are already complete and checked.

echo
ARCHIVE="$DEST/deuce-$STAMP.tar.gz.enc"
echo "Sealing an encrypted copy you can put in iCloud, Drive or on a USB stick."
echo "Choose a passphrase and keep it in your password manager. Lose it and the"
echo "archive is gone: there is no recovery, which is the point."
echo

if tar -czf - -C "$OUT" roles.sql schema.sql data.sql \
   | openssl enc -aes-256-cbc -pbkdf2 -iter 600000 -salt -out "$ARCHIVE" 2>/dev/null
then
  echo "Sealed: $ARCHIVE  ($(du -h "$ARCHIVE" | cut -f1))"
  echo
  echo "To open it again:"
  echo "  openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -in <file> | tar -xzf - -C <dir>"
else
  echo "No encrypted archive was made. The plain files in $OUT are still complete."
  echo "Do not copy them anywhere shared without encrypting them first."
fi
