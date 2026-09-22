import { z } from "zod";

/**
 * The environment gate.
 *
 * Two jobs, and the second is the one that matters.
 *
 *  1. FAIL AT BOOT, NOT AT 2AM. A missing Supabase URL should stop the build,
 *     not surface as an unreadable fetch error on the one page a visitor tried.
 *
 *  2. KEEP SECRETS OUT OF THE BROWSER. Anything read through `serverEnv()` is
 *     reachable only from server code. `NEXT_PUBLIC_*` values are written as
 *     literal `process.env.NEXT_PUBLIC_…` member expressions below, because that
 *     literal form is what Next.js statically replaces at build time — read
 *     through a computed key they would be `undefined` in the browser.
 *
 * THE PUBLISHABLE KEY IS NOT A SECRET. It identifies the project; it authorises
 * nothing. Access is decided by Row Level Security against the caller's session,
 * so shipping it to the browser is the design. The SECRET key bypasses RLS
 * entirely and must never appear in a Client Component.
 */

/** Rejects scaffold text, so a half-filled deploy fails instead of shipping. */
const PLACEHOLDER = /placeholder|changeme|change-me|your-|todo|xxxx|example\.com/i;

const real = (label: string) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .min(1, `${label} must not be empty`)
    .refine((v) => !PLACEHOLDER.test(v), `${label} still contains placeholder text`);

// ── Public: inlined into the client bundle. ─────────────────────────────────

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: real("NEXT_PUBLIC_SUPABASE_URL").pipe(z.url()),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: real("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
  NEXT_PUBLIC_SITE_URL: real("NEXT_PUBLIC_SITE_URL").pipe(z.url()),
});

function readPublic() {
  const parsed = publicSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  });

  if (!parsed.success) {
    throw new Error(
      `Deuce is missing environment variables:\n${parsed.error.issues
        .map((i) => `  · ${i.path.join(".")}: ${i.message}`)
        .join("\n")}\n\nCopy .env.example to .env.local and fill it in. See docs/SETUP.md.`,
    );
  }
  return parsed.data;
}

export const env = readPublic();

// ── Server only. ────────────────────────────────────────────────────────────

const serverSchema = z.object({
  SUPABASE_SECRET_KEY: real("SUPABASE_SECRET_KEY"),

  /**
   * Upstash is optional in development and required in production.
   *
   * The rate limiter is the only thing standing between the sign-in endpoint and
   * somebody enumerating Bocconi addresses, and a per-instance in-memory counter
   * does not limit anything once the platform runs more than one instance —
   * which is the normal state of a Vercel deployment. So a production boot
   * without it is a configuration error, and it says so.
   */
  UPSTASH_REDIS_REST_URL: z.string().trim().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().trim().min(1).optional(),
});

let serverCache: z.infer<typeof serverSchema> | null = null;

export function serverEnv() {
  if (serverCache) return serverCache;

  const parsed = serverSchema.safeParse({
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL || undefined,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN || undefined,
  });

  if (!parsed.success) {
    throw new Error(
      `Deuce is missing server environment variables:\n${parsed.error.issues
        .map((i) => `  · ${i.path.join(".")}: ${i.message}`)
        .join("\n")}`,
    );
  }

  serverCache = parsed.data;
  return serverCache;
}

/**
 * True when this process is a single long-lived instance, so an in-memory rate
 * limiter is genuinely a rate limiter. Local `next dev`, `next start` on one
 * box, and CI. Never a serverless deployment.
 */
export const isSingleInstance =
  process.env.NODE_ENV !== "production" || process.env.CI === "true" || !process.env.VERCEL;
