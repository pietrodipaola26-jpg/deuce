# Deuce

Tennis and padel for Bocconi students in Milan.

Deuce exists because the obstacle is not finding a court. It is that nobody wants
to be the one who asks. A message saying "anyone for padel thursday?" leaves six
questions unanswered, and asking six follow-ups in front of four hundred people is
exactly the thing a student will not do. So Deuce makes a game a row that already
answers all six — level, surface, court, time, cost, and who is going — and turns
joining into a button.

## What it does

- **Bocconi-only accounts.** Sign-in is a link emailed to `@studbocconi.it` or
  `@unibocconi.it`. There are no passwords: controlling the mailbox *is* the
  verification, and the database refuses any other address outright.
- **A feed of real games**, filtered by sport, level, surface and availability,
  defaulting to the levels you could actually join.
- **A level scale a beginner can place themselves on**, enforced on join so
  nobody arrives to a mismatch.
- **A record on every profile** — games played, rating, reliability, no-shows and
  upheld reports. Two of the five can only go the wrong way, which is what makes
  the other three worth anything.
- **A thread per game.** No direct messages anywhere in the product. A thread
  opens when you join and closes a day after you play.
- **Reporting and moderation**, with reports only reaching a public profile once a
  moderator agrees.

## Stack

| | |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack, React 19) |
| Database | Supabase — PostgreSQL, row-level security, Realtime |
| Auth | Supabase Auth, email OTP / magic link |
| Rate limiting | Upstash Redis |
| Hosting | Vercel |
| Styling | Tailwind CSS v4, design tokens in `src/app/globals.css` |

## Running it locally

Requires Node 22.16 (`.nvmrc`), Docker, and the Supabase CLI.

```bash
npm install
npm run db:start                  # local Postgres, Auth and mail catcher
cp .env.example .env.local        # then fill in from `supabase status -o env`
npm run dev
```

The app is at **http://localhost:3000**. Use `localhost`, not `127.0.0.1` — see
the note on PKCE cookie origins in `.env.example`.

The local stack runs on ports **553xx** rather than the CLI's usual 543xx, so it
cannot collide with another Supabase project on the same machine:

| Service | URL |
|---|---|
| API | http://127.0.0.1:55321 |
| Database | postgresql://postgres:postgres@127.0.0.1:55322/postgres |
| Studio | http://127.0.0.1:55323 |
| Mail catcher | http://127.0.0.1:55324 |

Sign-in emails never leave your machine in development — they land in the mail
catcher above.

### There is no demo data, on purpose

Deuce ships with **no accounts, no games and no ratings** — only the list of
courts in `supabase/seed.sql`. There is no seeding script, and there was one
until it was deleted: invented members with invented ratings are fabricated
reviews, and a platform whose whole pitch is "this record is worth trusting"
cannot have them, not even locally where they might be screenshotted.

To see a populated app, create an account at `/signup` with any `@studbocconi.it`
address, collect the link from the mail catcher, and post a game. It takes two
minutes and everything you then see is real.

```bash
npm run signin -- you@studbocconi.it   # prints a sign in link for an existing account
```

## Checks

```bash
npm run check        # lint, typecheck, production build
npm run test:schema  # the rules the product cannot be wrong about
```

See also **[docs/THIRD-PARTY.md](docs/THIRD-PARTY.md)** — what Deuce depends on,
what each processor can see, and the commands to re-audit it. The short version:
no analytics, no advertising, no third party JavaScript in the browser at all,
and fonts self hosted so no visitor IP reaches Google.

`test:schema` is the important one. Who may join a game, who may read a thread,
who may rate whom, and what a stranger can see are enforced in SQL — so they are
tested in SQL, against a real database, rather than through a form that merely
asks nicely.

## Where things are

```
src/app/(site)      the public site: landing page, legal documents
src/app/(auth)      sign in, create account, onboarding
src/app/(app)       the product: feed, a game, hosting, profile, alerts
src/lib/actions     every mutation, as Server Actions
src/lib/data        every read, through row-level security
supabase/migrations the whole schema, in one migration
tests/              the schema tests
```

## Deploying

See **[docs/SETUP.md](docs/SETUP.md)** for the step-by-step: Supabase, Vercel,
GitHub and Upstash, in the order they need doing.

## A note on the data model

Invariants live in the database, not in the UI. Capacity, the level range,
host-only cancellation, participant-only threads and "you cannot rate before the
game" are enforced by constraints, triggers and `SECURITY DEFINER` functions that
take a row lock — because a rule enforced only in React is a rule that holds until
somebody POSTs directly to the API. `supabase/migrations/00001_deuce.sql` explains
each decision where it is made.
