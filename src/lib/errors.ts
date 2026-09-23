import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendErrorDigest } from "@/lib/mail";

/**
 * REPORTING A FAILURE, WITHOUT REPORTING A PERSON.
 *
 * Everything that reaches the error log comes through here, so there is exactly
 * one place where the rules about what may be stored are enforced.
 *
 * THE MESSAGE IS REDACTED BEFORE IT LEAVES THIS FILE. Error messages quote
 * values: a unique-violation from Postgres says which email address collided, a
 * failed lookup says which id was missing. Storing them raw would put members'
 * addresses into a table that is otherwise free of personal data, and the whole
 * reason that table stays out of the privacy policy is that it holds none.
 *
 * ROUTES ARE PATTERNS, NEVER PATHS. The caller passes context.routePath, which
 * is "/games/[id]". request.path, which is "/games/3f9a...", identifies a game
 * and therefore the people in it, and is never passed in.
 *
 * NOTHING HERE THROWS. This runs while something has already gone wrong. An
 * error reporter that can itself fail loudly turns one broken page into two.
 */

/** Anything that looks like a person, replaced before storage. */
function redact(input: string): string {
  return input
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email]")
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "[id]")
    // Long hex or base64ish runs are tokens often enough to be worth losing.
    .replace(/\b[A-Za-z0-9_-]{32,}\b/g, "[token]");
}

export function messageOf(error: unknown): string {
  if (error instanceof Error) return redact(error.message);
  if (typeof error === "string") return redact(error);
  return "Unknown error";
}

export async function reportError(input: {
  message: string;
  /** context.routePath, a pattern such as /games/[id]. Never a real path. */
  route: string;
  routeType?: string;
  method?: string;
  source?: "server" | "client";
}): Promise<void> {
  try {
    const supabase = createAdminClient();

    const { error } = await supabase.rpc("record_error", {
      p_message: redact(input.message),
      p_route: input.route,
      p_route_type: input.routeType ?? null,
      p_method: input.method ?? null,
      p_source: input.source ?? "server",
    });
    if (error) return;

    // Only ever sends when an hour has passed since the last one, and the
    // database decides that, not this code. A crash loop sends one email.
    const { data } = await supabase.rpc("claim_error_digest");
    if (data && data.length > 0) {
      await sendErrorDigest(data);
    }
  } catch {
    // Deliberately silent. See the note above about two broken pages.
  }
}
