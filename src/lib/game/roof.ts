/**
 * WHETHER A COURT HAS A ROOF IS A QUESTION ABOUT THE DATE.
 *
 * Milan clay clubs put a pressurised dome over their courts for the winter and
 * take it off in spring. Quanta covers fifteen of its sixteen courts from
 * October to April, Tennis Club Milano covers thirteen of sixteen, and Centro
 * Tennis Washington went under its dome on 7 September 2026. So "is this court
 * indoors" has no answer that stays true for a whole year, which is why
 * venues carries two facts instead of one. See migration 00010.
 *
 * A game, unlike a court, happens on a day. So the roof over a game IS knowable,
 * and it is stored on the game rather than inferred at read time. Nothing here
 * needs a cron job to stay correct.
 */

/** The two roof facts a court carries. They are never both true. */
export type Roof = { indoor: boolean; covered_in_winter: boolean };

/**
 * The domed season, inclusive. October to April is what the clubs themselves
 * advertise. It is a convention, not a contract: a club can dome early, as
 * Washington did, and the host can always correct the roof on the form.
 */
const COVERED_MONTHS = new Set([1, 2, 3, 4, 10, 11, 12]);

/**
 * Does a game starting at this moment fall in the domed season?
 *
 * Takes the raw `datetime-local` value, "YYYY-MM-DDTHH:mm", and reads the month
 * out of the string rather than constructing a Date. The value is already Milan
 * local time, and `new Date(value)` would re-interpret it in the browser's own
 * zone, which is the exact bug the helpers in format.ts exist to prevent.
 */
export function isCoveredSeason(localValue: string | null | undefined): boolean {
  if (!localValue || localValue.length < 7) return false;
  return COVERED_MONTHS.has(Number(localValue.slice(5, 7)));
}

/** The roof a game gets: the court, plus the day it is played. */
export function roofForGame(venue: Roof, localValue: string | null | undefined): boolean {
  if (venue.indoor) return true;
  if (venue.covered_in_winter) return isCoveredSeason(localValue);
  return false;
}

/** How a court describes its own roof in a list, where there is no date yet. */
export function roofLabel(venue: Roof): string {
  if (venue.indoor) return "indoor";
  if (venue.covered_in_winter) return "outdoor, covered in winter";
  return "outdoor";
}
