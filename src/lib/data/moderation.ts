import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * The moderator's queue.
 *
 * Row-level security already restricts `reports` to moderators, so this reads as
 * the caller like every other query in the app. There is no admin client here:
 * if the policy is wrong, this returns nothing rather than quietly returning
 * everything, which is the failure direction you want.
 *
 * The subject's record travels with each report on purpose. A first complaint
 * about somebody with forty games and no missed ones reads very differently from
 * a fourth complaint about somebody with two, and a moderator should not have to
 * go and look that up in another tab while deciding.
 */
export async function listReports() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("reports")
    .select(
      `id, reason, detail, status, outcome, resolution_note, created_at, resolved_at,
       reporter:profiles!reports_reporter_id_fkey ( id, first_name, last_initial, tint ),
       subject:profiles!reports_subject_id_fkey ( id, first_name, last_initial, tint, banned_at ),
       game:games ( id, sport, starts_at, minutes, venue:venues ( name, area ) )`,
    )
    .order("status", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw new Error(`Could not load the reports: ${error.message}`);
  return data ?? [];
}

export type Report = Awaited<ReturnType<typeof listReports>>[number];

/** The record of everybody named in the queue, for the context above. */
export async function statsForReports(reports: Report[]) {
  const ids = [...new Set(reports.map((r) => r.subject?.id).filter((v): v is string => Boolean(v)))];
  if (ids.length === 0) return new Map<string, { games_played: number | null; reliability: number | null; reports: number | null }>();

  const supabase = await createClient();
  const { data } = await supabase
    .from("player_stats")
    .select("player_id, games_played, reliability, reports")
    .in("player_id", ids);

  const map = new Map<string, { games_played: number | null; reliability: number | null; reports: number | null }>();
  for (const row of data ?? []) {
    if (row.player_id) {
      map.set(row.player_id, {
        games_played: row.games_played,
        reliability: row.reliability,
        reports: row.reports,
      });
    }
  }
  return map;
}
