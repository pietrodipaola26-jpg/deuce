/**
 * HOW FAR IS IT FROM CAMPUS.
 *
 * The first question a Bocconi student asks about a court, and until migration
 * 00012 the answer lived inside a sentence. It is a number now, so the court list
 * can be ordered by the thing people actually decide on.
 *
 * Great circle, not a route. A real walk is longer than this, always, and the
 * list says "1.4 km" rather than "17 min" for that reason: a distance is honest
 * about being approximate in a way a time is not.
 */

/** Edificio Sarfatti, via Roberto Sarfatti 25. The middle of the campus. */
const CAMPUS = { lat: 45.448915, lon: 9.189394 };

const EARTH_KM = 6371;
const rad = (deg: number) => (deg * Math.PI) / 180;

export type Located = { lat: number | null; lon: number | null };

/** Kilometres from campus, or null for a club whose coordinates we do not have. */
export function kmFromCampus(v: Located): number | null {
  if (v.lat === null || v.lon === null) return null;
  const dLat = rad(v.lat - CAMPUS.lat);
  const dLon = rad(v.lon - CAMPUS.lon);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(CAMPUS.lat)) * Math.cos(rad(v.lat)) * Math.sin(dLon / 2) ** 2;
  return EARTH_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * One decimal place up to ten kilometres, none beyond it.
 *
 * "1.4 km" is a walk somebody can picture. "12.3 km" is false precision about a
 * journey that is going to be decided by the metro timetable, not by 300 metres.
 */
export function formatKm(km: number | null): string | null {
  if (km === null) return null;
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
}

/**
 * Nearest first, and clubs with no coordinates last rather than hidden.
 *
 * A member added club has no coordinates and is still a real court somebody
 * booked. Sorting it to the bottom is the honest treatment; dropping it would
 * lose the game.
 */
export function byDistanceFromCampus<T extends Located & { name: string }>(a: T, b: T): number {
  const da = kmFromCampus(a);
  const db = kmFromCampus(b);
  if (da === null && db === null) return a.name.localeCompare(b.name);
  if (da === null) return 1;
  if (db === null) return -1;
  return da - db;
}
