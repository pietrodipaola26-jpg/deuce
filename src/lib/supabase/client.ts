"use client";

import { createBrowserClient } from "@supabase/ssr";

import { env } from "@/env";
import type { Database } from "@/types/database.types";

/**
 * The browser client. Publishable key only — see the note in src/env.ts on why
 * that key is safe to ship and the secret key never is.
 *
 * Used for exactly one thing in Deuce: subscribing to a game thread so a reply
 * appears without a refresh. Everything else is a Server Component read or a
 * Server Action write.
 */
export function createClient() {
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
