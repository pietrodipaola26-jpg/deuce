"use server";

import { revalidatePath } from "next/cache";

import { requireMember } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type ModerationState = { error?: string; ok?: boolean; message?: string };

/**
 * Marks the queue as seen, which is the only thing that clears the badge.
 *
 * Called when the moderation page is opened. Deliberately separate from
 * resolving anything: seeing a report and dealing with it are different acts,
 * and only the first one is what the badge is counting.
 */
export async function markReportsSeen(): Promise<void> {
  const { profile } = await requireMember();
  if (!profile.is_moderator) return;

  const supabase = await createClient();
  await supabase.rpc("mark_reports_seen");
  revalidatePath("/moderator", "layout");
}

/**
 * Resolve a report.
 *
 * Every rule lives in `resolve_report()` in the database: that the caller is a
 * moderator, that the report is still open, that a reason was written, that a
 * ban actually bans, and who gets told. This action carries the form to it and
 * turns a Postgres error into a sentence.
 *
 * It checks `is_moderator` here as well, but only so the UI can fail early with
 * a readable message. The check that counts is the one the database makes, since
 * a Server Action is an HTTP endpoint like any other.
 */
export async function resolveReport(
  _previous: ModerationState,
  formData: FormData,
): Promise<ModerationState> {
  const { profile } = await requireMember();
  if (!profile.is_moderator) {
    return { error: "Only a moderator can resolve a report." };
  }

  const reportId = String(formData.get("reportId") ?? "");
  const outcome = String(formData.get("outcome") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  if (!["warning", "ban", "dismissed"].includes(outcome)) {
    return { error: "Choose a warning, a ban, or a dismissal." };
  }
  if (!note) {
    return { error: "Write a short reason. It is what the people involved are told." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("resolve_report", {
    p_report_id: reportId,
    p_outcome: outcome,
    p_note: note,
  });

  if (error) {
    console.error("[moderation] resolve failed", error);
    const clean = error.message.replace(/^.*?(?:ERROR|error):\s*/i, "").trim();
    return {
      error: clean && clean.length < 200 ? clean : "We could not save that decision. Try again.",
    };
  }

  revalidatePath("/moderator");
  revalidatePath("/notifications");
  return {
    ok: true,
    message:
      outcome === "dismissed"
        ? "Dismissed. The reporter has been told; the subject has not."
        : outcome === "warning"
          ? "Warning issued. Both people have been told."
          : "Account closed. Both people have been told.",
  };
}
