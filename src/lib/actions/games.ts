"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireMember } from "@/lib/auth/session";
import { checkRateLimit, rateLimitMessage } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { fromLocalInputValue } from "@/lib/format";
import {
  fieldErrors,
  gameSchema,
  messageSchema,
  ratingSchema,
  reportSchema,
  toCents,
  venueSchema,
} from "@/lib/validation";

export type ActionState = { errors?: Record<string, string>; ok?: boolean; message?: string };

/**
 * Every mutation on a game.
 *
 * TWO THINGS ARE TRUE OF ALL OF THEM.
 *
 *  1. They re-check authorisation. A Server Action is an HTTP POST endpoint, so
 *     `requireMember()` is called inside each one rather than being trusted from
 *     the page that rendered the button.
 *
 *  2. They do not enforce the rules themselves. Capacity, level range, host-only
 *     cancellation and "you cannot rate before the game" live in the database
 *     functions, which hold a row lock while they check. These actions call those
 *     functions and turn a Postgres error into a sentence somebody can act on.
 */

/** Turns a Postgres error into the sentence the function raised, or a fallback. */
function readableError(message: string, fallback: string): string {
  // The DB functions raise human sentences deliberately; pass them through.
  const cleaned = message.replace(/^.*?(?:ERROR|error):\s*/i, "").trim();
  if (cleaned && cleaned.length < 200 && /[.!?]$/.test(cleaned)) return cleaned;
  return fallback;
}

export async function createGame(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const { userId } = await requireMember();

  const limit = await checkRateLimit("createGame", userId);
  if (!limit.ok) return { errors: { form: rateLimitMessage(limit.retryAfterSeconds) } };

  const parsed = gameSchema.safeParse({
    venueId: String(formData.get("venueId") ?? ""),
    sport: String(formData.get("sport") ?? ""),
    surface: String(formData.get("surface") ?? ""),
    indoor: formData.get("indoor") === "on",
    startsAt: String(formData.get("startsAt") ?? ""),
    minutes: String(formData.get("minutes") ?? ""),
    levelMin: String(formData.get("levelMin") ?? ""),
    levelMax: String(formData.get("levelMax") ?? ""),
    spots: String(formData.get("spots") ?? ""),
    priceEuros: String(formData.get("priceEuros") ?? ""),
    note: String(formData.get("note") ?? ""),
    provides: formData.getAll("provides").map(String),
  });

  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const v = parsed.data;

  // Read as Milan wall-clock time, not as the server's zone. See the comment on
  // fromLocalInputValue — on Vercel the server is UTC, and parsing it there
  // would post every game an hour or two off.
  const startsAt = fromLocalInputValue(v.startsAt);
  if (!startsAt) return { errors: { startsAt: "Choose a day and a time." } };
  if (startsAt.getTime() < Date.now()) {
    return { errors: { startsAt: "That time has already passed." } };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("games")
    .insert({
      host_id: userId,
      venue_id: v.venueId,
      sport: v.sport,
      surface: v.surface,
      indoor: v.indoor,
      starts_at: startsAt.toISOString(),
      minutes: v.minutes,
      level_min: v.levelMin,
      level_max: v.levelMax,
      spots: v.spots,
      price_cents: toCents(v.priceEuros),
      note: v.note || null,
      provides: v.provides,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[games] create failed", error);
    return {
      errors: { form: readableError(error?.message ?? "", "We could not post that game. Please try again.") },
    };
  }

  revalidatePath("/games");
  revalidatePath("/my-games");
  redirect(`/games/${data.id}`);
}

/** Adds a court a member names themselves. Lands unverified, and says so. */
export async function createVenue(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const { userId } = await requireMember();

  const parsed = venueSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    area: String(formData.get("area") ?? ""),
    travel: String(formData.get("travel") ?? ""),
    surface: String(formData.get("surface") ?? ""),
    indoor: formData.get("indoor") === "on",
  });

  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("venues").insert({
    name: v.name,
    area: v.area,
    travel: v.travel || null,
    surface: v.surface,
    indoor: v.indoor,
    created_by: userId,
    // Never trusted from the client: the RLS policy also requires false.
    is_verified: false,
  });

  if (error) {
    console.error("[venues] create failed", error);
    return { errors: { form: "We could not add that court. Please try again." } };
  }

  revalidatePath("/games/new");
  return { ok: true, message: "Court added. Pick it from the list." };
}

export async function joinGame(gameId: string): Promise<ActionState> {
  const { userId } = await requireMember();

  const limit = await checkRateLimit("join", userId);
  if (!limit.ok) return { errors: { form: rateLimitMessage(limit.retryAfterSeconds) } };

  const supabase = await createClient();
  const { error } = await supabase.rpc("join_game", { p_game_id: gameId });

  if (error) {
    return {
      errors: {
        form: readableError(error.message, "We could not add you to that game. Please try again."),
      },
    };
  }

  revalidatePath(`/games/${gameId}`);
  revalidatePath("/games");
  revalidatePath("/my-games");
  return { ok: true };
}

export async function leaveGame(gameId: string): Promise<ActionState> {
  await requireMember();

  const supabase = await createClient();
  const { error } = await supabase.rpc("leave_game", { p_game_id: gameId });

  if (error) {
    return {
      errors: { form: readableError(error.message, "We could not take you out of that game.") },
    };
  }

  revalidatePath(`/games/${gameId}`);
  revalidatePath("/games");
  revalidatePath("/my-games");
  return { ok: true };
}

export async function cancelGame(gameId: string, reason: string): Promise<ActionState> {
  await requireMember();

  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_game", {
    p_game_id: gameId,
    p_reason: reason.trim() ? reason.trim().slice(0, 200) : undefined,
  });

  if (error) {
    return { errors: { form: readableError(error.message, "We could not cancel that game.") } };
  }

  revalidatePath(`/games/${gameId}`);
  revalidatePath("/games");
  revalidatePath("/my-games");
  return { ok: true };
}

/**
 * Posting to a thread.
 *
 * An ordinary INSERT rather than an RPC, so that Realtime broadcasts it and an
 * open thread updates without a refresh. The RLS policy is what checks that the
 * sender is in the game and that the thread has not closed.
 */
export async function postMessage(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const { userId } = await requireMember();
  const gameId = String(formData.get("gameId") ?? "");

  const parsed = messageSchema.safeParse({ body: String(formData.get("body") ?? "") });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const limit = await checkRateLimit("message", userId);
  if (!limit.ok) return { errors: { form: rateLimitMessage(limit.retryAfterSeconds) } };

  const supabase = await createClient();
  const { error } = await supabase
    .from("messages")
    .insert({ game_id: gameId, sender_id: userId, body: parsed.data.body });

  if (error) {
    console.error("[messages] insert failed", error);
    // The commonest cause is the policy: not in the game, or the thread closed.
    return {
      errors: {
        form: "That message did not send. The thread closes a day after the game is played.",
      },
    };
  }

  revalidatePath(`/games/${gameId}`);
  return { ok: true };
}

export async function markAttendance(
  gameId: string,
  playerId: string,
  state: "unknown" | "played" | "no_show",
): Promise<ActionState> {
  await requireMember();

  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_attendance", {
    p_game_id: gameId,
    p_player_id: playerId,
    p_state: state,
  });

  if (error) {
    return { errors: { form: readableError(error.message, "We could not save that.") } };
  }

  revalidatePath(`/games/${gameId}`);
  revalidatePath(`/players/${playerId}`);
  return { ok: true };
}

export async function ratePlayer(_previous: ActionState, formData: FormData): Promise<ActionState> {
  await requireMember();

  const parsed = ratingSchema.safeParse({
    gameId: String(formData.get("gameId") ?? ""),
    rateeId: String(formData.get("rateeId") ?? ""),
    stars: String(formData.get("stars") ?? ""),
    signal: String(formData.get("signal") || "about_right"),
  });

  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("rate_player", {
    p_game_id: v.gameId,
    p_ratee_id: v.rateeId,
    p_stars: v.stars,
    p_signal: v.signal,
  });

  if (error) {
    return { errors: { form: readableError(error.message, "We could not save that rating.") } };
  }

  revalidatePath(`/games/${v.gameId}`);
  return { ok: true, message: "Thanks. That is on their record." };
}

/**
 * Reporting a player.
 *
 * The rate limit here is deliberately loose. Never make somebody wait to report
 * a safety problem; the cost of one spurious report is a moderator's minute, and
 * the cost of a blocked one is the thing this product exists to prevent.
 */
export async function submitReport(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const { userId } = await requireMember();

  const parsed = reportSchema.safeParse({
    subjectId: String(formData.get("subjectId") ?? ""),
    gameId: String(formData.get("gameId") ?? ""),
    reason: String(formData.get("reason") ?? ""),
    detail: String(formData.get("detail") ?? ""),
  });

  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const v = parsed.data;

  const limit = await checkRateLimit("report", userId);
  if (!limit.ok) return { errors: { form: rateLimitMessage(limit.retryAfterSeconds) } };

  const supabase = await createClient();
  const { error } = await supabase.from("reports").insert({
    reporter_id: userId,
    subject_id: v.subjectId,
    game_id: v.gameId || null,
    reason: v.reason,
    detail: v.detail || null,
  });

  if (error) {
    console.error("[reports] insert failed", error);
    return { errors: { form: "We could not send that report. Please try again." } };
  }

  return {
    ok: true,
    message: "Reported. A student moderator will look at this, and we may contact you.",
  };
}

export async function markNotificationsRead(): Promise<void> {
  const { userId } = await requireMember();

  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);

  revalidatePath("/notifications");
  revalidatePath("/games");
}
