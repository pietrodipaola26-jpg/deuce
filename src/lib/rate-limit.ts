import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { isSingleInstance, serverEnv } from "@/env";

/**
 * RATE LIMITING.
 *
 * The sign-in endpoint is the one that needs this most. Deuce admits exactly two
 * email domains, which means an address is guessable: firstname.lastname@
 * studbocconi.it. Without a limit, the sign-in form is a way to send mail to any
 * Bocconi student, from us, at any rate somebody likes. That is the abuse this
 * file exists to stop.
 *
 * WHY UPSTASH AND NOT A MAP. A counter in process memory is not a rate limit on
 * a platform that runs several instances: each one has its own idea of how many
 * requests it has seen, and the effective limit is the limit times the instance
 * count. Vercel runs several instances. So a production boot with no Upstash
 * credentials fails loudly rather than silently allowing everything.
 *
 * The in-memory fallback exists for `next dev` and CI, where there genuinely is
 * one process. It is chosen by `isSingleInstance`, never by whether the
 * credentials happen to be absent.
 */

type Decision = { ok: true } | { ok: false; retryAfterSeconds: number };

export type LimitName = "signin" | "createGame" | "message" | "report" | "join";

/** Chosen from what the action actually costs, not from a single global number. */
const BUDGETS: Record<LimitName, { limit: number; window: `${number} ${"s" | "m" | "h"}` }> = {
  // Sends an email to somebody else's mailbox. The tightest budget here.
  signin: { limit: 5, window: "15 m" },
  // Writes a row everyone on campus sees.
  createGame: { limit: 10, window: "1 h" },
  // Generous: a thread sorting out which entrance to use is a burst of messages.
  message: { limit: 30, window: "1 m" },
  // Deliberately loose. Never make somebody wait to report a safety problem.
  report: { limit: 10, window: "1 h" },
  join: { limit: 30, window: "1 h" },
};

let redis: Redis | null = null;
const limiters = new Map<LimitName, Ratelimit>();

function upstash(name: LimitName): Ratelimit | null {
  const { UPSTASH_REDIS_REST_URL: url, UPSTASH_REDIS_REST_TOKEN: token } = serverEnv();

  if (!url || !token) {
    if (isSingleInstance) return null;
    throw new Error(
      "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required in production: " +
        "an in-memory rate limiter does not limit anything across multiple instances.",
    );
  }

  redis ??= new Redis({ url, token });

  const existing = limiters.get(name);
  if (existing) return existing;

  const budget = BUDGETS[name];
  const limiter = new Ratelimit({
    redis,
    // Sliding window rather than fixed: a fixed window lets somebody spend the
    // whole budget in the last second of one window and again in the first
    // second of the next.
    limiter: Ratelimit.slidingWindow(budget.limit, budget.window),
    prefix: `deuce:${name}`,
    analytics: false,
  });
  limiters.set(name, limiter);
  return limiter;
}

// ── The single-process fallback. ────────────────────────────────────────────

const memory = new Map<string, number[]>();

function windowMs(window: `${number} ${"s" | "m" | "h"}`): number {
  const [amount, unit] = window.split(" ") as [string, "s" | "m" | "h"];
  const factor = unit === "s" ? 1_000 : unit === "m" ? 60_000 : 3_600_000;
  return Number(amount) * factor;
}

function inMemory(name: LimitName, key: string): Decision {
  const budget = BUDGETS[name];
  const span = windowMs(budget.window);
  const now = Date.now();
  const bucket = (memory.get(key) ?? []).filter((t) => now - t < span);

  if (bucket.length >= budget.limit) {
    const oldest = bucket[0] ?? now;
    memory.set(key, bucket);
    return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((span - (now - oldest)) / 1000)) };
  }

  bucket.push(now);
  memory.set(key, bucket);

  // Unbounded growth would be a slow leak in a long-running dev server.
  if (memory.size > 5_000) {
    for (const [k, v] of memory) {
      if (v.every((t) => now - t >= span)) memory.delete(k);
    }
  }

  return { ok: true };
}

/**
 * Consumes one unit of `name`'s budget for `identifier`.
 *
 * FAILS OPEN when Upstash is unreachable, and that is a decision rather than an
 * oversight: a Redis outage must not take sign-in down for the whole campus. The
 * limiter protects against abuse, not against catastrophe, and the wrong failure
 * mode here is a locked door.
 */
export async function checkRateLimit(name: LimitName, identifier: string): Promise<Decision> {
  const key = `${name}:${identifier}`;
  const limiter = upstash(name);

  if (!limiter) return inMemory(name, key);

  try {
    const result = await limiter.limit(identifier);
    if (result.success) return { ok: true };
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)),
    };
  } catch (error) {
    console.error("[rate-limit] Upstash unreachable, allowing the request", error);
    return { ok: true };
  }
}

/** A human sentence, because "429" is not one. */
export function rateLimitMessage(retryAfterSeconds: number): string {
  if (retryAfterSeconds < 90) return `Too many attempts. Try again in ${retryAfterSeconds} seconds.`;
  const minutes = Math.ceil(retryAfterSeconds / 60);
  return `Too many attempts. Try again in ${minutes} minutes.`;
}
