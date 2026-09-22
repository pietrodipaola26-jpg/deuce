/**
 * The level scale.
 *
 * Every matchmaking product has to answer "how good are you?" and every one of
 * them gets it wrong in the same way: it asks for a number the player cannot
 * calibrate. "Intermediate" means nothing. "3.5 NTRP" means nothing to someone
 * who has never been rated.
 *
 * So each level is written as something a person can recognise about their own
 * game in one sentence, and the number is the shorthand that comes after.
 * Naming the level this way is the single biggest lever on the confidence
 * problem: a beginner who can see "1 — First time holding a racquet" is a
 * beginner who books.
 */

export type Level = {
  value: number;
  name: string;
  /** Written in the second person, and honest about the bottom of the scale. */
  tell: string;
};

export const LEVELS: Level[] = [
  // Every name has to survive being read as a range — the meter renders
  // "Beginner to Improving", and an earlier "New to it" gave "New to it to
  // Learning". One-word names, and the welcome lives in the tell.
  { value: 1, name: "Beginner", tell: "You have barely held a racquet. You want someone patient." },
  { value: 2, name: "Improving", tell: "You can rally a few balls back and you are here to improve." },
  { value: 3, name: "Social", tell: "You keep a rally going, you serve in, and you play for the fun of it." },
  { value: 4, name: "Club", tell: "You have played properly. You have a reliable serve and a side you prefer." },
  { value: 5, name: "Competitive", tell: "You have played matches that counted, and you want a real one." },
];

export const LEVEL_MIN = 1;
export const LEVEL_MAX = 5;

export function levelFor(value: number): Level {
  const clamped = Math.min(LEVEL_MAX, Math.max(LEVEL_MIN, Math.round(value)));
  // LEVELS is dense from 1..5, so the index is always in range after clamping.
  return LEVELS[clamped - 1]!;
}

/** "3–4" for a range, "3" when a game wants one level only. */
export function levelRangeLabel(min: number, max: number): string {
  return min === max ? `${min}` : `${min} to ${max}`;
}

/**
 * A LEVEL PER SPORT.
 *
 * Somebody who has played tennis since they were eight and picked up a padel
 * racquet in October is not the same standard at both, so the two are held
 * separately and either may be absent. A null level is not "beginner" — it means
 * they do not play that sport at all, and the difference matters: one belongs in
 * a level 1 game, the other belongs in no game of that sport.
 */
export type SportLevels = {
  tennis_level: number | null;
  padel_level: number | null;
};

export type SportId = "tennis" | "padel";

export const SPORTS: Array<{ id: SportId; label: string }> = [
  { id: "tennis", label: "Tennis" },
  { id: "padel", label: "Padel" },
];

export function sportLabel(sport: SportId): string {
  return sport === "tennis" ? "Tennis" : "Padel";
}

/** Their standard at one sport, or null when they do not play it. */
export function levelForSport(p: SportLevels, sport: SportId): number | null {
  return sport === "tennis" ? p.tennis_level : p.padel_level;
}

/**
 * The sports somebody plays, derived from where they have set a level.
 *
 * Derived rather than stored: a separate `sports` array and a level column are
 * two facts that can disagree, and the one the product acts on is the level.
 */
export function sportsPlayed(p: SportLevels): SportId[] {
  const out: SportId[] = [];
  if (p.tennis_level != null) out.push("tennis");
  if (p.padel_level != null) out.push("padel");
  return out;
}

export function playsSport(p: SportLevels, sport: SportId): boolean {
  return levelForSport(p, sport) != null;
}
