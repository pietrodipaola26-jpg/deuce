# Third party audit

What Deuce depends on, what each thing is allowed to see, and what reaches the
browser. Re-run the checks at the bottom before each release.

Last audited: 22 September 2026.

## The short version

**No analytics. No advertising. No tracking of any kind. No third party
JavaScript in the browser, at all.** A page load fetches 17 resources and every
one of them comes from Deuce's own origin, fonts included.

## Runtime dependencies

| Package | What it does | What it can see |
|---|---|---|
| `next`, `react`, `react-dom` | The framework. No network calls of its own. | Nothing external |
| `@supabase/ssr`, `@supabase/supabase-js` | Talks to **your own** Supabase project: auth and database | Everything the signed in member is allowed to see, by row level security |
| `@upstash/ratelimit`, `@upstash/redis` | Counts sign in attempts, server side only | A **hashed** identifier and a counter. No email, no name, no content |
| `zod` | Validates form input. Pure computation | Nothing |
| `server-only` | A build time guard that makes importing server code from a client component fail | Nothing |

Nothing else is in `dependencies`, and nothing in that list phones home.

## What runs in the browser

Exactly one third party runtime reaches the client: `@supabase/ssr`, in
`src/lib/supabase/client.ts`, used for a single purpose — subscribing to a game
thread so a reply appears without a refresh. It connects only to your Supabase
project, and Realtime enforces row level security, so the socket cannot deliver a
message the reader would not have been allowed to fetch.

Everything else is Server Components and Server Actions.

## Fonts

Archivo and Figtree are pulled from Google Fonts **at build time** by
`next/font`, and served from Deuce's own origin. No request reaches Google from a
visitor's browser, and no visitor IP is exposed to Google. This is why
`Content-Security-Policy` names no external font host.

## The processors that do see data

These are the three services in `docs/SETUP.md`, and they are named on the
privacy page because GDPR art. 28 requires it.

| Processor | Data | Where |
|---|---|---|
| **Supabase** | Everything: accounts, profiles, games, threads, ratings, reports | EU (Frankfurt, if set up as documented) |
| **Vercel** | Request logs, and it serves the app | EU region `fra1`, pinned in `vercel.json` |
| **Upstash** | A rate limit counter against a hashed identifier | EU, if created as documented |

If you add a fourth, it goes in this table, on the privacy page, and — if it sets
anything in the browser — in the cookie policy and the cookie notice, **before**
it ships.

## Cookies

One, and it is strictly necessary: the Supabase Auth session cookie. HttpOnly,
SameSite, unreadable by script. Nothing is set before sign in.

`src/components/site/cookie-notice.tsx` explains it rather than staging a consent
choice, because a strictly necessary cookie does not require consent under the
ePrivacy Directive and a Reject button that cannot reject is a dark pattern. The
comment at the top of that file says what has to change the day Deuce adds
anything non-essential.

## Content Security Policy

`src/proxy.ts` sends a CSP that permits `'self'` and the Supabase origin, and
nothing else. `frame-ancestors 'none'`, `object-src 'none'`. So even a dependency
that tried to call out would be blocked by the browser.

## Re-running this audit

```bash
# 1. Anything in the source pointing at a host that is not ours?
grep -rnoE "https?://[a-zA-Z0-9./_-]+" src | grep -viE "studbocconi|unibocconi|localhost|127.0.0.1|w3.org"

# 2. Any third party runtime reaching a client component?
for f in $(grep -rln '"use client"' src); do
  grep -oE 'from "(@?[a-z0-9@/._-]+)"' "$f" | grep -vE '"@/|"react"|"react-dom|"next/'
done | sort -u

# 3. What the browser actually fetched. Run in the console on a loaded page;
#    every origin printed should be your own.
#    [...new Set(performance.getEntriesByType('resource').map(e => new URL(e.name).origin))]

# 4. The dependency tree itself
npm ls --all --omit=dev
```

Check 3 is the one that matters: it is the only one that cannot be fooled by a
dependency loading something at runtime.
