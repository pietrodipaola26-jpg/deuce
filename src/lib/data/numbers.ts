import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * THE NUMBERS.
 *
 * Four reads, all of them database functions that refuse anybody who is not a
 * moderator. The guard is in the function rather than here, for the same reason
 * every other rule in this product is: a check in a page is a check somebody can
 * route around, and a check in the database is not.
 *
 * Nothing is cached. The tables are small enough that a live read is cheaper
 * than the machinery to avoid one, and a stale number is worse than a slow page
 * when you are looking at it precisely to find out what just happened.
 */

export type Metric = {
  metric: string;
  all_time: number;
  /** Null for metrics that describe a state rather than something that happened. */
  this_week: number | null;
  last_week: number | null;
};

export async function getNumbers(): Promise<Map<string, Metric>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("deuce_numbers");
  if (error) throw new Error(`Could not read the numbers: ${error.message}`);
  return new Map((data ?? []).map((row) => [row.metric, row]));
}

export async function getHosts() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("deuce_hosts");
  if (error) throw new Error(`Could not read the hosts: ${error.message}`);
  return data ?? [];
}

export async function getCourts() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("deuce_courts");
  if (error) throw new Error(`Could not read the courts: ${error.message}`);
  return data ?? [];
}

export async function getWeekly() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("deuce_weekly");
  if (error) throw new Error(`Could not read the weeks: ${error.message}`);
  return data ?? [];
}
