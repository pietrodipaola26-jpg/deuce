/**
 * Every date, time and price the product shows.
 *
 * ONE TIME ZONE, NAMED EXPLICITLY. Deuce is one campus in Milan, so a game at
 * 18:30 means 18:30 in Milan whether you are reading it from Bocconi, from a
 * server in Frankfurt, or from a laptop still set to Tokyo after the flight.
 * Formatting through `Intl` with an explicit `timeZone` is what makes the
 * server-rendered string and the client-rendered one identical — the ordinary
 * cause of a hydration mismatch on a page full of times is a `toLocaleString`
 * that quietly used the machine's own zone.
 *
 * en-GB throughout: 24-hour clock, day before month. That is how a fixture list
 * reads in Italy, and "6:30 PM" on a European sports site looks like a bug.
 */

const ZONE = "Europe/Rome";
const LOCALE = "en-GB";

const time = new Intl.DateTimeFormat(LOCALE, {
  timeZone: ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const weekday = new Intl.DateTimeFormat(LOCALE, { timeZone: ZONE, weekday: "short" });
const dayMonth = new Intl.DateTimeFormat(LOCALE, { timeZone: ZONE, day: "numeric", month: "short" });
const fullDate = new Intl.DateTimeFormat(LOCALE, {
  timeZone: ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
});

/** "18:30" — the biggest thing on a game card. */
export function formatTime(iso: string): string {
  return time.format(new Date(iso));
}

/** "Tue" */
export function formatWeekday(iso: string): string {
  return weekday.format(new Date(iso));
}

/** "24 Feb" */
export function formatDayMonth(iso: string): string {
  return dayMonth.format(new Date(iso));
}

/** "Tuesday 24 February" */
export function formatFullDate(iso: string): string {
  return fullDate.format(new Date(iso));
}

/**
 * "Today", "Tomorrow", or the weekday.
 *
 * Compared as calendar days IN MILAN, not as a 24-hour distance: a game at 09:00
 * tomorrow is "Tomorrow" even when it is 23:00 now, and "in 10 hours" is not
 * what anybody wants to read on a fixture.
 */
export function formatRelativeDay(iso: string): string {
  const dayKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const target = dayKey.format(new Date(iso));
  const now = new Date();
  const today = dayKey.format(now);
  const tomorrow = dayKey.format(new Date(now.getTime() + 86_400_000));

  if (target === today) return "Today";
  if (target === tomorrow) return "Tomorrow";
  return weekday.format(new Date(iso));
}

/** "€9 each" — the number people actually compare. Deuce adds no fee. */
export function formatPrice(cents: number): string {
  if (cents === 0) return "Free";
  const euros = cents / 100;
  const shown = Number.isInteger(euros) ? String(euros) : euros.toFixed(2);
  return `€${shown} each`;
}

/** "€9.00" for a form field, with no "each". */
export function formatEuros(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** "90 min" */
export function formatDuration(minutes: number): string {
  return `${minutes} min`;
}

/**
 * "Mara V." — a first name and one initial, which is the most Deuce ever shows
 * of somebody's name. Enough to greet them at a court, not enough to look them
 * up.
 */
export function playerName(p: { first_name: string | null; last_initial: string | null }): string {
  if (!p.first_name) return "A player";
  return p.last_initial ? `${p.first_name} ${p.last_initial}.` : p.first_name;
}

/** "MV", for the avatar. */
export function playerInitials(p: {
  first_name: string | null;
  last_initial: string | null;
}): string {
  const first = p.first_name?.trim()?.[0]?.toUpperCase() ?? "?";
  const last = p.last_initial?.trim()?.[0]?.toUpperCase() ?? "";
  return `${first}${last}`;
}

/** True once the game is over, which is when rating and attendance open. */
export function hasEnded(startsAt: string, minutes: number): boolean {
  return new Date(startsAt).getTime() + minutes * 60_000 < Date.now();
}

export function hasStarted(startsAt: string): boolean {
  return new Date(startsAt).getTime() < Date.now();
}

/** "2 hours ago", for a notification list. */
export function formatAgo(iso: string): string {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} ${days === 1 ? "day" : "days"} ago`;
  return formatDayMonth(iso);
}

/**
 * The value an `<input type="datetime-local">` needs, in Milan time.
 *
 * A datetime-local input has no zone, so it must be handed the wall-clock time
 * the host will read on their own wall. Deriving it from the ISO string through
 * the formatter keeps that true for somebody editing a game from another zone.
 */
export function toLocalInputValue(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));

  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/**
 * Turns a `datetime-local` value ("2026-03-04T18:30") into a real instant,
 * reading it as Milan wall-clock time.
 *
 * `new Date("2026-03-04T18:30")` would parse it in the SERVER's zone, which on
 * Vercel is UTC — every game would be posted an hour or two off, and it would
 * look correct to whoever tested it in Italy in winter. The offset is discovered
 * from the zone itself rather than hard-coded, so summer time is not a bug
 * waiting for late March.
 */
export function fromLocalInputValue(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [, y, mo, d, h, mi] = match as unknown as [string, string, string, string, string, string];

  // Start from the instant those numbers name in UTC, then correct by the
  // zone's offset at that instant.
  const asUtc = Date.UTC(+y, +mo - 1, +d, +h, +mi);
  const offset = zoneOffsetMs(new Date(asUtc));
  const corrected = new Date(asUtc - offset);

  // The offset can differ either side of a DST boundary; one re-check settles it.
  const settled = zoneOffsetMs(corrected);
  return settled === offset ? corrected : new Date(asUtc - settled);
}

/** How far ahead of UTC Europe/Rome is at a given instant, in milliseconds. */
function zoneOffsetMs(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(at);

  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const asIfUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return asIfUtc - Math.floor(at.getTime() / 1000) * 1000;
}

/**
 * True once a game thread has closed, 24 hours after the game ended.
 *
 * The same window the `messages` insert policy enforces in the database, so the
 * composer disappears at exactly the moment writing would start failing.
 */
export function threadIsClosed(startsAt: string, minutes: number): boolean {
  return new Date(startsAt).getTime() + minutes * 60_000 + 86_400_000 < Date.now();
}

/** True when a game starts within `hours` from now. */
export function startsWithin(startsAt: string, hours: number): boolean {
  return new Date(startsAt).getTime() - Date.now() < hours * 3_600_000;
}

/**
 * The default value for the "when" field on a new game: tomorrow at 18:00,
 * MILAN time.
 *
 * Computed on the server and handed to the form as a prop, rather than worked out
 * in the browser. Two reasons, and the second is a real bug rather than a
 * preference: a `datetime-local` default built from the browser's own clock reads
 * the laptop's zone, so a student who has just landed from Tokyo and not changed
 * their system clock would be offered — and would post — a game seven hours out.
 * Everything else in Deuce treats that field as Milan wall-clock time, and so does
 * this.
 */
export function defaultGameStart(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(Date.now() + 86_400_000));

  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "01";
  return `${get("year")}-${get("month")}-${get("day")}T18:00`;
}
