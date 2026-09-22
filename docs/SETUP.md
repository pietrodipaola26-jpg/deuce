# Connecting the stack

Everything in this repository works. What it does not yet have is a Supabase
project, a Vercel project, a GitHub repository and an Upstash database of your
own. This is the order to do them in, and why each step is where it is.

Budget about an hour. Nothing here needs a credit card: every service has a free
tier that comfortably covers one campus.

---

## Before you start

- **Node 22.16** — `nvm use` picks it up from `.nvmrc`.
- **A GitHub account.**
- **Docker Desktop**, only if you want to keep running the app locally.

---

## 1. GitHub — put the code somewhere

Do this first. Vercel deploys *from* a repository, so everything downstream is
easier once this exists.

```bash
cd Deuce
git init
git add .
git commit -m "Deuce"
```

Create an empty repository on GitHub — **private** — then:

```bash
git remote add origin git@github.com:YOUR-NAME/deuce.git
git branch -M main
git push -u origin main
```

> **Check `.env.local` is not in that commit.** `git status` should not list it;
> `.gitignore` already excludes it. If it ever gets committed, treat every key in
> it as public and rotate them.

---

## 2. Supabase — the database and the accounts

### 2.1 Create the project

1. [database.new](https://database.new) → new project.
2. Name it `deuce`. Choose a **strong** database password and save it in a
   password manager — you will need it in a moment and it cannot be recovered.
3. Region: **Frankfurt (eu-central-1)**. Nearest to Milan, and it keeps personal
   data inside the EU, which is what the privacy page says you do.
4. Wait for it to finish provisioning.

### 2.2 Push the schema

The whole schema is one migration in this repository. Do not paste it into the
SQL editor by hand — pushing it keeps the project and the code in step.

```bash
npm install -g supabase          # or: brew install supabase/tap/supabase
supabase login
supabase link --project-ref YOUR-PROJECT-REF
supabase db push
```

The project ref is in your project's URL: `supabase.com/dashboard/project/<ref>`.
`db push` asks for the database password from step 2.1.

Then seed the courts. `supabase/seed.sql` is local-only by design, so run its
contents once against production — open **SQL Editor** in the dashboard, paste
the `insert into public.venues …` statement from that file, and run it. **Check
the list against reality first**: those are real Milan clubs, but confirm the
travel notes and add the ones your friends actually play at. Members can also add
a court from the create-game form; it lands marked as unverified.

### 2.3 Turn off the sign-ups you do not want

**Authentication → Sign In / Providers**:

- **Email** — enabled.
- **Confirm email** — on.
- **Secure email change** — on.
- Everything else (Google, phone, anonymous) — **off**. Deuce's entire trust model
  is that every account controls a Bocconi mailbox. A second sign-in route
  quietly removes it.

There is no password anywhere in this product, so nothing about password policy
applies.

### 2.4 URLs — the step that breaks sign-in if you skip it

**Authentication → URL Configuration**:

- **Site URL**: `https://your-domain.com`
- **Redirect URLs**: `https://your-domain.com/auth/callback`

Add the Vercel preview pattern too if you want sign-in to work on previews:
`https://*-your-team.vercel.app/auth/callback`.

These must match `NEXT_PUBLIC_SITE_URL` exactly — scheme, host and port. A
mismatch produces a sign-in link that lands somewhere the session cookie cannot
follow, and it fails **silently**, with no error to read.

### 2.5 Email, before you have real users

Supabase's built-in mailer is rate-limited to a handful of messages an hour and is
meant for testing. Deuce sends one email per sign-in, so you will hit that on day
one.

Set up **Project Settings → Authentication → SMTP** with any transactional
provider (Resend, Postmark and Brevo all have free tiers). Use a sender on a
domain you control, and verify SPF and DKIM — a sign-in link that lands in spam
is indistinguishable from a broken product.

While you are there, edit the **Magic Link** template so it sounds like Deuce
rather than like Supabase.

### 2.6 Collect the keys

**Project Settings → API**:

| Dashboard | Environment variable |
|---|---|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| Publishable key (`sb_publishable_…`) | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| Secret key (`sb_secret_…`) | `SUPABASE_SECRET_KEY` |

The publishable key is *meant* to be public — it identifies the project and
authorises nothing, because row-level security decides access. The secret key
bypasses RLS entirely: server-side only, never in a `NEXT_PUBLIC_` name.

---

## 3. Upstash — rate limiting

This is not optional in production, and the app refuses to boot without it.

Deuce admits exactly two email domains, which makes an address guessable from a
name. Without a limit, the sign-in form is a way to send mail to any Bocconi
student, from you, at whatever rate somebody likes. A counter in process memory
does not limit anything once Vercel runs more than one instance.

1. [console.upstash.com](https://console.upstash.com) → **Create Database**.
2. Type **Redis**, region **eu-central-1** (next to Supabase and Vercel).
3. Copy from the **REST API** section:

| Upstash | Environment variable |
|---|---|
| `UPSTASH_REDIS_REST_URL` | `UPSTASH_REDIS_REST_URL` |
| `UPSTASH_REDIS_REST_TOKEN` | `UPSTASH_REDIS_REST_TOKEN` |

The budgets are in `src/lib/rate-limit.ts`, one per action rather than one global
number. Reporting a player is deliberately the loosest: never make somebody wait
to report a safety problem.

---

## 4. Vercel — hosting

1. [vercel.com/new](https://vercel.com/new) → import the GitHub repository.
2. Framework preset: **Next.js** (detected). Leave the build settings alone.
3. Add every environment variable from `.env.example` — **Production, Preview and
   Development**:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_SITE_URL
SUPABASE_SECRET_KEY
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
APP_OPERATOR_NAME
APP_OPERATOR_ADDRESS
APP_CONTACT_EMAIL
```

4. Deploy.
5. Add your domain under **Settings → Domains**, then set `NEXT_PUBLIC_SITE_URL`
   to it and **redeploy**. `NEXT_PUBLIC_*` values are compiled into the browser
   bundle at build time, so changing one without redeploying changes nothing.
6. Go back to Supabase §2.4 and put the real domain in the URL configuration.

`vercel.json` already pins the region to `fra1`, next to the database. Every page
in Deuce is a server render that talks to Postgres, so a function in Washington
and a database in Frankfurt would add a round trip to every request.

---

## 5. Before you tell anybody about it

**Read the cookie notice's own comment before adding anything.**
`src/components/site/cookie-notice.tsx` explains why Deuce shows a notice rather
than an Accept/Reject pair: the one cookie it sets is strictly necessary, and a
Reject button that cannot reject is a dark pattern. The day you add analytics or
anything else non-essential, that component becomes a real gate, the cookie page
gains an entry, and `docs/THIRD-PARTY.md` gains a row — before it ships.

**Fill in the operator fields.** `APP_OPERATOR_NAME`, `APP_OPERATOR_ADDRESS` and
`APP_CONTACT_EMAIL` are printed on the privacy and terms pages. GDPR art. 13
requires you to say who is responsible for people's data and how to reach them.
Unset, those pages say so plainly — honest, but not something to publish.

**Have somebody read the legal pages.** `src/content/legal.ts` describes what this
code actually does, and it is a genuine starting point rather than filler. It is
not legal advice, and you are processing personal data about students.

**Make yourself a moderator.** Sign up through the app first, then in the SQL
editor:

```sql
update public.profiles set is_moderator = true
where id = (select id from auth.users where email = 'you@studbocconi.it');
```

Moderators can read reports and confirm player-added courts. A report only
appears on a public profile once one of them agrees with it, which is what stops
reporting being used as a weapon — so somebody has to actually be doing it.

**Check a sign-in end to end on the real domain**, from a phone, on mobile data.
That is the path every single user takes, and it is the one that breaks on a
redirect URL mismatch.

**Re-run the third party audit.** `docs/THIRD-PARTY.md` has the commands. The
one that matters is check 3, which reads what the browser actually fetched on
your real deployment: every origin it prints should be yours.

**Post three or four real games before you invite anybody.** An empty feed is the
only way this product fails on first contact. Arrange them with people you
already play with, then send the link.

---

## Day-to-day

### Changing the schema

Never edit `00001_deuce.sql` after it has been pushed — it has already run, and a
changed file will not re-run. Add a new migration:

```bash
supabase migration new what_you_are_changing
# edit the new file
supabase db reset        # locally: replays every migration from scratch
npm run test:schema      # prove the rules still hold
npm run db:types         # regenerate src/types/database.types.ts
supabase db push         # send it to production
```

### Backups

Supabase's free tier keeps daily backups for seven days. Before anything
irreversible, take your own:

```bash
supabase db dump --linked -f backup.sql
```

### Watching it

- **Vercel → Logs** for server errors.
- **Supabase → Logs → Postgres** for anything raising from a database function.
- **Supabase → Reports** for connection count and slow queries.
- The `reports` table is your moderation queue:

```sql
select r.created_at, p.first_name as reporter, s.first_name as subject,
       r.reason, r.detail
from public.reports r
join public.profiles p on p.id = r.reporter_id
join public.profiles s on s.id = r.subject_id
where r.status = 'open'
order by r.created_at;
```

---

## When something is wrong

**Sign-in link does nothing, no error.** Almost always §2.4: the redirect URL in
Supabase does not exactly match `NEXT_PUBLIC_SITE_URL`. Compare scheme, host,
port and path character by character. Locally, check you are on `localhost` and
not `127.0.0.1` — they are different cookie origins, and PKCE keeps its verifier
in a cookie.

**"Deuce is Bocconi only…" for an address that is Bocconi.** The allowed domains
are in two places that must agree: `public.is_eligible_email()` in the migration,
and `ELIGIBLE_DOMAINS` in `src/lib/auth/domains.ts`. The database is the
authority. Add a domain with a new migration.

**Build fails with "missing environment variables".** `src/env.ts` refuses
placeholder text as well as empty values, so `your-project.supabase.co` fails on
purpose. Check the variable is set for the environment being built.

**"UPSTASH_REDIS_REST_URL … required in production".** §3. It is deliberate.

**Everything returns nothing once deployed.** Confirm `supabase db push`
succeeded: with no tables, row-level security has nothing to allow.
