import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { PlayerStatsRow } from "@/components/player/stats";
import type { Profile } from "@/lib/auth/session";

/** A profile plus the five public numbers. */
export type PlayerView = { profile: Profile; stats: PlayerStatsRow | null };

export async function getPlayer(id: string): Promise<PlayerView | null> {
  const supabase = await createClient();

  const [{ data: profile }, { data: stats }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
    supabase.from("player_stats").select("*").eq("player_id", id).maybeSingle(),
  ]);

  if (!profile) return null;
  return { profile, stats: stats ?? null };
}

/** Stats for several players at once, for a list of seats. */
export async function getStatsFor(ids: string[]): Promise<Map<string, PlayerStatsRow>> {
  if (ids.length === 0) return new Map();
  const supabase = await createClient();
  const { data } = await supabase.from("player_stats").select("*").in("player_id", ids);

  const map = new Map<string, PlayerStatsRow>();
  for (const row of data ?? []) {
    if (row.player_id) map.set(row.player_id, row);
  }
  return map;
}

export async function listNotifications(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("id, kind, body, read_at, created_at, game_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(`Could not load your notifications: ${error.message}`);
  return data ?? [];
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);
  return count ?? 0;
}

/**
 * Everybody the caller has actually shared a court with.
 *
 * This is the list the report page offers, and the scope is deliberate: you can
 * report somebody you played with, not somebody you merely saw in a feed. A
 * reporting form that lets you name any member on campus is a harassment tool
 * with a shield icon on it.
 *
 * Two queries rather than a join through my own seats, because PostgREST cannot
 * express "the other players in the games I am in" as one embedded filter, and a
 * self-join through the view would still need the game ids first.
 */
export async function listPeopleIHavePlayedWith(userId: string) {
  const supabase = await createClient();

  const { data: mySeats } = await supabase
    .from("game_players")
    .select("game_id")
    .eq("player_id", userId);

  const gameIds = (mySeats ?? []).map((s) => s.game_id);
  if (gameIds.length === 0) return [];

  const { data } = await supabase
    .from("game_players")
    .select(
      "game_id, player_id, profile:profiles!inner ( id, first_name, last_initial, tint ), game:games!inner ( id, sport, starts_at, venue:venues!inner ( name ) )",
    )
    .in("game_id", gameIds)
    .neq("player_id", userId)
    .order("joined_at", { ascending: false });

  // One entry per person, keeping the most recent game as the context a
  // moderator will want.
  const seen = new Map<
    string,
    {
      id: string;
      first_name: string | null;
      last_initial: string | null;
      tint: number;
      lastGameId: string;
      lastGameLabel: string;
    }
  >();

  for (const row of data ?? []) {
    if (seen.has(row.player_id)) continue;
    seen.set(row.player_id, {
      id: row.profile.id,
      first_name: row.profile.first_name,
      last_initial: row.profile.last_initial,
      tint: row.profile.tint,
      lastGameId: row.game.id,
      lastGameLabel: `${row.game.sport === "tennis" ? "Tennis" : "Padel"} at ${row.game.venue.name}`,
    });
  }

  return [...seen.values()];
}

export type PlayedWith = Awaited<ReturnType<typeof listPeopleIHavePlayedWith>>[number];

/** The reports the caller has already sent, so the page can show what happened. */
export async function listMyReports(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reports")
    .select("id, reason, status, detail, created_at, subject:profiles!reports_subject_id_fkey ( first_name, last_initial )")
    .eq("reporter_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);
  return data ?? [];
}

/**
 * Open reports the moderator has not looked at yet.
 *
 * Answers zero for everybody else: the database function checks, so the nav can
 * ask on every page load without branching on who is asking.
 */
export async function countUnseenReports(): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("unseen_report_count");
  if (error) return 0;
  return data ?? 0;
}
