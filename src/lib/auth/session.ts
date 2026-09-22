import "server-only";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

/**
 * Session helpers.
 *
 * `getUser()` and never `getSession()`. getSession only decodes a cookie the
 * client supplied and must never gate access on the server; getUser revalidates
 * the token against the auth server. The difference is the difference between a
 * check and a suggestion.
 */

export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Signed in, or sent to sign in. Says nothing about onboarding. */
export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

export async function getProfile(): Promise<Profile | null> {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return data ?? null;
}

/**
 * The gate every page inside the product uses: signed in AND onboarded.
 *
 * Splitting the two states matters. Somebody who has clicked their sign-in link
 * but not yet chosen a level is authenticated and not yet a member — they can
 * read their own profile row and nothing else, by policy. Sending them to
 * onboarding rather than to a feed they would see as empty is the difference
 * between a product that works and one that looks broken on first contact.
 */
export async function requireMember(): Promise<{ userId: string; profile: Profile }> {
  const user = await requireUser();
  const profile = await getProfile();

  if (!profile) {
    // The row is created by a trigger on account creation, so its absence means
    // something is genuinely wrong rather than merely incomplete.
    redirect("/login?error=no_profile");
  }

  /**
   * A banned account is checked BEFORE onboarding.
   *
   * `is_member()` already refuses a banned account every row in the database, so
   * without this they would reach the feed and find an empty product with no
   * explanation, which looks like a bug rather than a decision. They are sent to
   * a page that tells them what happened and why.
   */
  if (profile.banned_at) redirect("/closed");

  if (!profile.onboarded_at) redirect("/onboarding");

  return { userId: user.id, profile };
}

/** True only for the moderator, used to decide whether to draw the menu item. */
export async function isModerator(): Promise<boolean> {
  const profile = await getProfile();
  return Boolean(profile?.is_moderator && !profile.banned_at);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
