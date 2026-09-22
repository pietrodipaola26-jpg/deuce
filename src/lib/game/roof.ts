/**
 * WHETHER A COURT HAS A ROOF IS A QUESTION ABOUT THE DATE.
 *
 * Milan clay clubs put a pressurised dome over their courts for the winter and
 * take it off in spring. Quanta covers fifteen of its sixteen courts from
 * October to April, Tennis Club Milano covers thirteen of sixteen, and Centro
 * Tennis Washington went under its dome on 7 September 2026.
 *
 * So a club does not have "a roof". It has roofed courts, or open ones, or both,
 * and the open ones may be domed for half the year. The host picks which kind
 * they booked; this works out the sensible default so most hosts never have to.
 */

/** What a club offers overhead. A club always has at least one of the first two. */
export type VenueRoof = {
  has_indoor: boolean;
  has_outdoor: boolean;
  covered_in_winter: boolean;
};

/**
 * The domed season, inclusive. October to April is what the clubs advertise. It
 * is a convention, not a contract: a club can dome early, as Washington did, so
 * this only ever sets a default the host can change.
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

/** Which roofs the host can choose from at this club. Never empty. */
export function roofOptions(venue: VenueRoof): ("indoor" | "outdoor")[] {
  const out: ("indoor" | "outdoor")[] = [];
  if (venue.has_indoor) out.push("indoor");
  if (venue.has_outdoor) out.push("outdoor");
  // A club with neither would violate venues_has_a_roof, but a default beats a
  // form with no options in it.
  return out.length ? out : ["outdoor"];
}

/**
 * The roof to preselect: the club, and the day the host chose.
 *
 * A club with only one kind has made the choice already. A club with both is
 * assumed indoors in the domed months, because that is what people book when it
 * is cold and raining, and outdoors otherwise.
 */
export function defaultRoof(venue: VenueRoof, localValue: string | null | undefined): boolean {
  if (!venue.has_outdoor) return true;
  if (!venue.has_indoor) return false;
  return isCoveredSeason(localValue);
}

/** How a club describes what it has overhead, in a sentence fragment. */
export function roofSummary(venue: VenueRoof): string {
  const both = venue.has_indoor && venue.has_outdoor;
  if (both) return venue.covered_in_winter ? "indoor and outdoor courts, the outdoor ones domed in winter" : "indoor and outdoor courts";
  if (venue.has_indoor) return "indoor courts";
  return venue.covered_in_winter ? "outdoor courts, domed from October to April" : "outdoor courts";
}
