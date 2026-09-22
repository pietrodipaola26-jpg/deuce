import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { env } from "@/env";
import type { Database } from "@/types/database.types";

/**
 * The Supabase client for Server Components, Server Actions and Route Handlers.
 *
 * Uses the PUBLISHABLE key plus the caller's auth cookies, so every query runs
 * as that person and Row Level Security still applies. Running on the server is
 * not a reason to escalate: swapping in the secret key here would silently
 * disable every policy in the schema for the whole application.
 *
 * Created per request, never hoisted to a module-level singleton — one shared
 * client would serve one user's session to every concurrent request.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Components cannot write cookies. Token refresh happens in
            // src/proxy.ts on every request, so swallowing this is safe —
            // rethrowing would break every read-only page render.
          }
        },
      },
    },
  );
}
