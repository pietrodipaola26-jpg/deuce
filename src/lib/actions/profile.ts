"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors, onboardingSchema, profileSchema } from "@/lib/validation";

export type FormState = { errors?: Record<string, string>; ok?: boolean };

/** Pulls the repeated profile fields out of a FormData. */
function readProfileFields(formData: FormData) {
  return {
    firstName: String(formData.get("firstName") ?? ""),
    lastInitial: String(formData.get("lastInitial") ?? ""),
    // One level per sport, each independently optional. An empty string means
    // "I do not play this", and the schema turns it into a null.
    tennisLevel: String(formData.get("tennisLevel") ?? ""),
    padelLevel: String(formData.get("padelLevel") ?? ""),
    languages: formData
      .getAll("languages")
      .map(String)
      .flatMap((v) => v.split(","))
      .map((v) => v.trim())
      .filter(Boolean)
      .slice(0, 6),
    programme: String(formData.get("programme") ?? ""),
    studyYear: String(formData.get("studyYear") ?? ""),
    bio: String(formData.get("bio") ?? ""),
  };
}

/**
 * ONBOARDING.
 *
 * Sets `onboarded_at`, which is the flag every policy in the schema tests. Until
 * it is set the account can read its own profile row and nothing else — no games,
 * no players, no threads — so this action is the moment somebody becomes a member
 * rather than merely an authenticated visitor.
 *
 * `terms_accepted_at` is stamped from the server clock, never from the client.
 */
export async function completeOnboarding(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();

  const parsed = onboardingSchema.safeParse({
    ...readProfileFields(formData),
    confirmedAge: formData.get("confirmedAge") === "on",
    acceptedTerms: formData.get("acceptedTerms") === "on",
  });

  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const v = parsed.data;

  const supabase = await createClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: v.firstName,
      last_initial: v.lastInitial.toUpperCase(),
      tennis_level: v.tennisLevel,
      padel_level: v.padelLevel,
      languages: v.languages,
      programme: v.programme || null,
      study_year: v.studyYear || null,
      bio: v.bio || null,
      // Both stamped from the server clock, never from anything the browser sent.
      terms_accepted_at: now,
      age_confirmed_at: now,
      onboarded_at: now,
    })
    .eq("id", user.id);

  if (error) {
    console.error("[onboarding] update failed", error);
    return { errors: { form: "We could not save that just now. Please try again." } };
  }

  redirect("/games");
}

export async function updateProfile(_previous: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();

  const parsed = profileSchema.safeParse(readProfileFields(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: v.firstName,
      last_initial: v.lastInitial.toUpperCase(),
      tennis_level: v.tennisLevel,
      padel_level: v.padelLevel,
      languages: v.languages,
      programme: v.programme || null,
      study_year: v.studyYear || null,
      bio: v.bio || null,
    })
    .eq("id", user.id);

  if (error) {
    console.error("[profile] update failed", error);
    return { errors: { form: "We could not save that just now. Please try again." } };
  }

  revalidatePath("/profile");
  revalidatePath("/games");
  return { ok: true };
}

/**
 * ACCOUNT DELETION.
 *
 * Immediate and complete, not a flag that hides you. Deleting the auth user
 * cascades to the profile, and from there to seats, messages, ratings given, and
 * notifications — because every foreign key in the schema pointing at a profile
 * says `on delete cascade` for exactly this moment.
 *
 * This is the one thing in the product that needs the admin client: an account
 * that is being deleted cannot authenticate its own removal from the auth
 * schema. It is scoped to the caller's own id and nothing else.
 */
export async function deleteAccount(): Promise<void> {
  const user = await requireUser();

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("[account] deletion failed", error);
    throw new Error("We could not delete your account just now. Please try again.");
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/?deleted=1");
}
