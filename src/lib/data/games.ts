import "server-only";

import type { QueryData, SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

/**
 * Every read of a game, in one place.
 *
 * All of these run through the request-scoped client, so Row Level Security
 * applies: a signed-out caller gets nothing, and a member gets exactly what the
 * policies in the schema allow. None of it uses the admin client.
 *
 * The select string is shared so a game card is fed the same shape everywhere —
 * the feed, a profile, the detail page — and `QueryData` derives the TypeScript
 * type from the query itself. Hand-written row types drift from the query the
 * first time somebody adds a column; this cannot.
 */
const GAME_SELECT = `
  id, host_id, sport, surface, indoor, starts_at, minutes,
  level_min, level_max, spots, taken, price_cents, note, provides,
  status, cancelled_at, cancelled_reason, created_at,
  venue:venues!inner ( id, name, area, travel, is_verified, indoor, surface ),
  players:game_players ( player_id, is_host, attendance,
    profile:profiles!inner ( id, first_name, last_initial, tint, tennis_level, padel_level ) )
` as const;

function gameQuery(supabase: SupabaseClient<Database>) {
  return supabase.from("games").select(GAME_SELECT);
}

export type Game = QueryData<ReturnType<typeof gameQuery>>[number];
export type GamePlayer = Game["players"][number];

export type FeedFilters = {
  sport?: "tennis" | "padel";
  level?: number;
  surface?: Database["public"]["Enums"]["surface"];
  /** Only games with a seat free. */
  openOnly?: boolean;
  indoor?: boolean;
  /**
   * Only games this player could actually join.
   *
   * Two levels rather than one, because a level is per sport now: somebody may
   * be a 4 at tennis and a 2 at padel, and "games I fit" has to mean a different
   * range in each half of the feed. A null means they do not play that sport, so
   * none of its games fit.
   */
  fitsMe?: { tennis: number | null; padel: number | null };
};

/**
 * THE FEED: upcoming games, soonest first.
 *
 * Cancelled games are excluded, and so is anything that has already started —
 * a feed is a list of things you can still do something about.
 */
export async function listUpcomingGames(filters: FeedFilters = {}): Promise<Game[]> {
  const supabase = await createClient();

  let query = gameQuery(supabase)
    .neq("status", "cancelled")
    .gt("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(60);

  if (filters.sport) query = query.eq("sport", filters.sport);
  if (filters.surface) query = query.eq("surface", filters.surface);
  if (filters.indoor !== undefined) query = query.eq("indoor", filters.indoor);
  if (filters.openOnly) query = query.eq("status", "open");

  /**
   * A level filter matches when the game's RANGE includes the level, not when
   * the range equals it. A level 3 player belongs in a 2 to 3 game and in a 3 to
   * 4 game, and a filter that returned only exact matches would hide most of the
   * feed from exactly the people least willing to look harder.
   */
  if (filters.level !== undefined) {
    query = query.lte("level_min", filters.level).gte("level_max", filters.level);
  } else if (filters.fitsMe) {
    /**
     * "Games I fit" is a different range per sport, so it is an OR of two
     * sport-specific windows rather than one comparison. Someone who plays only
     * padel contributes one clause; someone who plays neither could not have got
     * this far, since onboarding requires a level for at least one.
     */
    const clauses: string[] = [];
    const { tennis, padel } = filters.fitsMe;
    if (tennis != null) {
      clauses.push(`and(sport.eq.tennis,level_min.lte.${tennis},level_max.gte.${tennis})`);
    }
    if (padel != null) {
      clauses.push(`and(sport.eq.padel,level_min.lte.${padel},level_max.gte.${padel})`);
    }
    if (clauses.length > 0) query = query.or(clauses.join(","));
  }

  const { data, error } = await query;
  if (error) throw new Error(`Could not load the feed: ${error.message}`);
  return data ?? [];
}

export async function getGame(id: string): Promise<Game | null> {
  const supabase = await createClient();
  const { data, error } = await gameQuery(supabase).eq("id", id).maybeSingle();
  if (error) throw new Error(`Could not load that game: ${error.message}`);
  return data ?? null;
}

/**
 * The games one person is in — hosting or joined, upcoming and past.
 *
 * Two queries rather than one with a client-side split: "upcoming, soonest
 * first" and "past, most recent first" are opposite orderings, and sorting one
 * list twice in JavaScript to present two is slower and reads worse.
 */
export async function listMyGames(userId: string): Promise<{ upcoming: Game[]; past: Game[] }> {
  const supabase = await createClient();

  const { data: seats, error: seatError } = await supabase
    .from("game_players")
    .select("game_id")
    .eq("player_id", userId);

  if (seatError) throw new Error(`Could not load your games: ${seatError.message}`);

  const ids = (seats ?? []).map((s) => s.game_id);
  if (ids.length === 0) return { upcoming: [], past: [] };

  const nowIso = new Date().toISOString();

  const [upcoming, past] = await Promise.all([
    gameQuery(supabase)
      .in("id", ids)
      .gte("starts_at", nowIso)
      .order("starts_at", { ascending: true }),
    gameQuery(supabase)
      .in("id", ids)
      .lt("starts_at", nowIso)
      .order("starts_at", { ascending: false })
      .limit(30),
  ]);

  if (upcoming.error) throw new Error(`Could not load your games: ${upcoming.error.message}`);
  if (past.error) throw new Error(`Could not load your games: ${past.error.message}`);

  return { upcoming: upcoming.data ?? [], past: past.data ?? [] };
}

/** How many games are open right now, for the empty-state copy and the nav. */
export async function countOpenGames(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("games")
    .select("id", { count: "exact", head: true })
    .eq("status", "open")
    .gt("starts_at", new Date().toISOString());

  if (error) return 0;
  return count ?? 0;
}

export async function listVenues() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("venues")
    .select("id, name, area, travel, surface, indoor, is_verified")
    .eq("is_active", true)
    .order("is_verified", { ascending: false })
    .order("name", { ascending: true });

  if (error) throw new Error(`Could not load the courts: ${error.message}`);
  return data ?? [];
}

export type Venue = Awaited<ReturnType<typeof listVenues>>[number];

/** The thread for one game. RLS returns nothing unless the caller is in it. */
export async function listMessages(gameId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .select(
      "id, body, is_system, created_at, sender_id, sender:profiles ( id, first_name, last_initial, tint )",
    )
    .eq("game_id", gameId)
    .order("created_at", { ascending: true })
    .limit(300);

  if (error) throw new Error(`Could not load the thread: ${error.message}`);
  return data ?? [];
}

export type Message = Awaited<ReturnType<typeof listMessages>>[number];

/** Which of the other players the caller has already rated, for this game. */
export async function listMyRatings(gameId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ratings")
    .select("ratee_id, stars, signal")
    .eq("game_id", gameId);
  return data ?? [];
}
