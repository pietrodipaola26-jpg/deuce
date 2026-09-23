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

Order matters. Roles first or every grant has nothing to grant to.

1. Create a new Supabase project, or reset the existing one
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

Both **Magic Link** and **Confirm signup** were edited to send a numeric code
rather than a link. They use `{{ .Token }}`, not `{{ .ConfirmationURL }}`. A
restored project reverts to the stock link templates and sign-in silently breaks:
the form asks for a code and the email contains a link. Paste the current bodies
in below so this is recoverable.

> TO FILL IN: copy both template bodies here after any edit.

---

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

## 7. The thing people skip

**A backup nobody has restored is a hope.** Rehearse it into a local Supabase at
least once, and again after any migration that changes the shape of the data.
The rehearsal is the only step that proves any of the rest of this works.
