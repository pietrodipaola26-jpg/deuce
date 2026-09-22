"use server";

import type { Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { env } from "@/env";
import { normaliseEmail, validateEmail } from "@/lib/auth/domains";
import { checkRateLimit, rateLimitMessage } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

/**
 * SIGNING IN.
 *
 * There are no passwords in Deuce. Sign-in is a link (or a six-digit code) sent
 * to a Bocconi mailbox, and that is not a shortcut — it IS the verification the
 * whole product rests on. A password would let somebody keep an account after
 * they lose access to the mailbox that proved they belong here, which is exactly
 * the property Deuce must not have. It also means there is no password to
 * breach, reset, or reuse from another site.
 *
 * The same call handles signing up and signing in. A student does not care which
 * one they are doing, and asking them to know is how you lose the ones who
 * already have an account and have forgotten.
 */

export type AuthState = { error?: string; sent?: boolean; email?: string };

/** The identifier the rate limiter counts against. */
async function callerIp(): Promise<string> {
  const h = await headers();
  // Vercel sets x-forwarded-for; the first entry is the client.
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || h.get("x-real-ip") || "unknown";
}

export async function requestSignInLink(
  _previous: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const rawEmail = String(formData.get("email") ?? "");
  const next = String(formData.get("next") ?? "");
  const email = normaliseEmail(rawEmail);

  const problem = validateEmail(email);
  if (problem) return { error: problem, email: rawEmail };

  /**
   * Limited by ADDRESS AND BY IP, and both are needed.
   *
   * Per-address alone lets one machine walk the whole of studbocconi.it, one
   * message each. Per-IP alone lets a botnet hammer a single mailbox. Deuce
   * admits exactly two domains, so an address is guessable — this endpoint sends
   * mail to other people, and it is the one that has to be hardest to abuse.
   */
  for (const key of [`email:${email}`, `ip:${await callerIp()}`]) {
    const decision = await checkRateLimit("signin", key);
    if (!decision.ok) {
      return { error: rateLimitMessage(decision.retryAfterSeconds), email: rawEmail };
    }
  }

  const supabase = await createClient();

  const callback = new URL("/auth/callback", env.NEXT_PUBLIC_SITE_URL);
  if (next.startsWith("/") && !next.startsWith("//")) {
    // Only ever a path on this site: an absolute URL here would make the
    // sign-in link an open redirect straight out of somebody's inbox.
    callback.searchParams.set("next", next);
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: callback.toString(), shouldCreateUser: true },
  });

  if (error) {
    /**
     * Deliberately vague to the visitor, specific in the log.
     *
     * GoTrue's own messages distinguish "no such user" from other failures, and
     * repeating that to the browser turns this form into a way to ask whether a
     * given student has an account.
     */
    console.error("[auth] signInWithOtp failed", { email, message: error.message });

    if (error.message.toLowerCase().includes("rate limit")) {
      return { error: "Too many attempts just now. Try again in a few minutes.", email: rawEmail };
    }
    return {
      error: "We could not send that link just now. Check the address and try again.",
      email: rawEmail,
    };
  }

  return { sent: true, email };
}

/** The 6-digit code path, for when a mail client mangles the link. */
export async function verifyCode(_previous: AuthState, formData: FormData): Promise<AuthState> {
  const email = normaliseEmail(String(formData.get("email") ?? ""));
  const token = String(formData.get("code") ?? "").replace(/\s/g, "");
  const next = String(formData.get("next") ?? "");

  if (!/^\d{6}$/.test(token)) return { error: "The code is six digits.", email, sent: true };

  const decision = await checkRateLimit("signin", `code:${email}`);
  if (!decision.ok) {
    return { error: rateLimitMessage(decision.retryAfterSeconds), email, sent: true };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });

  if (error) {
    return { error: "That code is wrong or has expired. Ask for a new one.", email, sent: true };
  }

  // Only ever a path on this site — an absolute URL here would make the sign-in
  // link an open redirect arriving from us in somebody's inbox.
  redirect((next.startsWith("/") && !next.startsWith("//") ? next : "/games") as Route);
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
