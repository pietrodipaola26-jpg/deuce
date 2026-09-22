import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { env, serverEnv } from "@/env";
import type { Database } from "@/types/database.types";

/**
 * ⚠️ THIS CLIENT BYPASSES ROW LEVEL SECURITY ENTIRELY. ⚠️
 *
 * It authenticates with the secret key, which carries the service_role grant.
 * Every policy in the schema — member-only reads, participant-only threads,
 * host-only cancellation — is inert for queries made through it.
 *
 * WHEN TO USE IT: work that genuinely cannot be expressed as one person's own
 * authority. Account erasure, where the account being deleted can no longer
 * authenticate, is the only caller today.
 *
 * WHEN NOT TO USE IT: ordinary profile, game, join or thread queries. Reaching
 * for this client because "it runs on the server" or because a policy is in the
 * way turns a policy violation into a silent data leak: RLS stops being the
 * boundary, and the boundary becomes whoever last edited the query.
 *
 * `import "server-only"` makes importing this from a Client Component a build
 * error rather than a runtime surprise.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv().SUPABASE_SECRET_KEY,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  );
}
