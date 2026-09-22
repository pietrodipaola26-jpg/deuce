/**
 * Prints a working sign-in link for a local account.
 *
 * In development every sign-in email is caught by the local mail catcher instead
 * of being delivered, so signing in means opening http://127.0.0.1:55324 and
 * clicking through. This does the same thing in one command.
 *
 *   node scripts/signin-link.mjs mara.v@studbocconi.it
 *
 * Local only: it uses the secret key, and refuses to run against anything else.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = /^\s*([A-Z_]+)\s*=\s*"?([^"]*)"?\s*$/.exec(line);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const site = process.env.NEXT_PUBLIC_SITE_URL;

if (!/^http:\/\/(127\.0\.0\.1|localhost):/.test(url ?? "")) {
  console.error(`Refusing to run: ${url} is not a local Supabase stack.`);
  process.exit(1);
}

const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/signin-link.mjs you@studbocconi.it");
  process.exit(1);
}

const db = createClient(url, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

const { data, error } = await db.auth.admin.generateLink({
  type: "magiclink",
  email,
  options: { redirectTo: `${site}/auth/callback` },
});

if (error) {
  console.error(`Could not generate a link for ${email}: ${error.message}`);
  console.error("If the account does not exist yet, create it at /signup first.");
  process.exit(1);
}

/**
 * Built from `hashed_token` rather than handed back as `action_link`.
 *
 * The action_link goes to GoTrue's own verify endpoint, which — for a link the
 * browser did not initiate — completes the implicit flow and returns the session
 * in the URL FRAGMENT. A fragment is never sent to a server, so the callback in
 * this app cannot see it and no session is ever established.
 *
 * Pointing straight at /auth/callback with the token hash takes the same route a
 * real emailed link takes: the callback verifies it server-side and sets the
 * session cookie on its response.
 */
const link = `${site}/auth/callback?token_hash=${data.properties.hashed_token}&type=magiclink`;

console.log(`\nSign in as ${email}:\n\n${link}\n`);
console.log("Paste that into your browser. It can only be used once.\n");
