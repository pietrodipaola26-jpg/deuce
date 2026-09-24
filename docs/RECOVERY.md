# Recovery

What to do if Deuce is gone, and what to keep so that is possible.

**Supabase's Free plan takes no backups.** Not short retention, none. Drop a table
and there is no restore button anywhere in the dashboard. Everything below exists
because of that one fact.

---

## 1. What is at risk, and what is not

| Thing | Copies | Notes |
|---|---|---|
| Database | **Live only, plus whatever `backup.sh` last wrote** | The only irreplaceable thing here |
| Supabase dashboard settings | **Live only** | Section 4. Exists in no file |
| Vercel environment variables | Live only | Section 5. Names recoverable, values re-issued |
| DNS, mail routing | Cloudflare | Rebuildable by hand in about an hour |
| Code, migrations, seed | GitHub **and** the working copy | Already safe |

---

## 2. Taking a backup

```
./scripts/backup.sh
```

Writes three files to `~/Deuce-backups/<date>/` and then checks them. It refuses
to call a backup good unless `auth.users` has rows in it, because
`supabase db dump` excludes the `auth` schema by default and that is where the
accounts live. It also refuses to write anywhere git is watching, since
`data.sql` contains real email addresses.

Weekly is enough at current volume. Do it before any migration that drops or
rewrites a column.

---

## 3. Restoring

**Restore into a Supabase-provisioned database. Never a bare one.** This is not a
style preference and it is the single thing most likely to waste an afternoon
during a real recovery.

A Supabase dump assumes the `extensions`, `auth` and `vault` schemas and the
`supabase_realtime` publication already exist, because the platform creates all
four when you make a project. Restore into an empty PostgreSQL database and
`CREATE TABLE public.venues` fails on its `extensions.gen_random_uuid()` default,
then every table, policy and trigger that depends on venues fails after it. We
proved this: the first rehearsal produced 110 errors and 6 tables. The same files
into a provisioned database produced 0 errors and everything.

Order matters. Roles first or every grant has nothing to grant to.

1. Create a new Supabase project. Do not skip this and use any Postgres
2. `psql "<connection string>" -f roles.sql`
3. `psql "<connection string>" -f schema.sql`
4. `psql "<connection string>" -f data.sql`
5. Redo section 4 by hand, since none of it is in the dump
6. Update `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and
   `SUPABASE_SECRET_KEY` in Vercel to the new project's, then redeploy
7. Sign in. If you cannot, the accounts did not come across and step 4 failed

The connection string is in Supabase under Project Settings, Database.

---

## 4. Supabase settings that live nowhere else

Recreate these by hand after any restore. **None of it is in the dump.**

**Authentication, URL Configuration**

- Site URL: `https://deucematch.uk`
- Redirect URLs: `https://deucematch.uk/**` and `http://localhost:3000/auth/callback`

**Authentication, SMTP Settings**

- Sender: `no-reply@deucematch.uk`, name `Deuce`
- Host `smtp.resend.com`, port `465`, username `resend`
- Password: a Resend API key with sending access. Issue a new one, do not hunt
  for the old one

**Authentication, Email Templates**

**The source of truth is in this repository**, not here and not in the dashboard:

```
supabase/templates/magic-link.html      sign in
supabase/templates/confirmation.html    first sign up
```

Both send a numeric code using `{{ .Token }}`, never `{{ .ConfirmationURL }}`.
`supabase/config.toml` points local development at the same two files, so a local
sign in exercises the real wording rather than a stock template.

**After any restore, paste both files into the dashboard by hand.** Email
templates are GoTrue configuration rather than table rows, so they are not in the
database and not in the backup. A restored project reverts to the stock link
templates and sign in breaks silently in a way that points at the wrong thing:
the email contains a link, the form asks for a code, and the code is nowhere. The
person restoring will not notice, because their own session came back with
everything else. The next person to sign up will.

Worth re-checking once in a while that the dashboard still matches these files.
Nothing enforces it.

**Do NOT run `supabase config push` to do this.** See the warning below.

---

## 4b. Why `supabase config push` is not the answer

The CLI can push `config.toml` to the linked project, and it looks like the
obvious way to keep templates in sync. It is not, because it pushes the **whole**
auth section, and this repository's `config.toml` is deliberately tuned for local
development. Measured against production on 24 September 2026, a push would have
changed:

| Setting | Production | What a push would set |
|---|---|---|
| `auth.site_url` | `https://deucematch.uk` | `http://localhost:3000` |
| `auth.additional_redirect_urls` | `https://deucematch.uk/**` | `127.0.0.1:3000/auth/callback` |
| `db.major_version` | 17 | 15 |

The first two break sign in for everybody. Use `supabase config diff`, which is
read only, to see the current delta before ever considering it.

Making this safe means teaching `config.toml` about environments, with the
production values read from variables rather than hard coded. That is a real
piece of work and has not been done.

**Also noted from that diff:** local Postgres is major version 15 and production
is 17. Every migration so far has applied cleanly to both, but the two are not
the same database and a feature added in 16 or 17 would pass locally and fail on
push, or the reverse.

## 5. Vercel environment variables

Names and where each is issued. **No values. Ever.**

| Name | Issued by | Kind |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | you | config |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase, Project Settings, API | config |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase, same page | config |
| `SUPABASE_SECRET_KEY` | Supabase, same page | **secret** |
| `UPSTASH_REDIS_REST_URL` | Upstash console | config |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash console | **secret** |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` | fixed: `smtp.resend.com`, `465`, `resend` | config |
| `SMTP_PASSWORD` | Resend, API Keys | **secret** |
| `APP_CONTACT_EMAIL` | you: `hello@deucematch.uk` | config |
| `MODERATION_ALERT_EMAIL` | you: `reports@deucematch.uk` | config |
| `APP_OPERATOR_NAME` / `APP_OPERATOR_ADDRESS` | you | config |

Every secret here can be re-issued. None of them needs to be written down, and
none of them should be.

---

## 6. Cloudflare

- DNS: an `A` or `CNAME` for the apex and a `CNAME` for `www`, both pointing at
  Vercel, both **DNS only**, grey cloud. The orange cloud in front of Vercel
  causes certificate and redirect loops
- Resend's DKIM and SPF records, plus a `_dmarc` TXT record
- Email Routing: `hello@` and `reports@` forwarding to the Gmail account.
  Receive only. It cannot send

---

## 7. Rehearsing it

**A backup nobody has restored is a hope.**

```
./scripts/restore-rehearsal.sh
supabase db reset          # afterwards, to put your local dev database back
```

It loads the most recent backup into the running local Supabase, having first
emptied the public schema and auth.users so the target matches a fresh project.
It then counts what arrived and fails loudly if the accounts did not.

It wipes your local dev database, which is safe: that holds only seed data.
It never touches production.

Run it after any migration that changes the shape of the data.

Last rehearsed: 23 September 2026. 11 tables, 23 RLS policies, 12 triggers,
23 venues, 1 account, zero errors.
