import { z } from "zod";

/**
 * The shapes every form submits.
 *
 * These run on the SERVER, in the action, after the browser has had its say. The
 * client-side version of a check is a courtesy to somebody typing; this is the
 * one that decides. The database then re-checks the rules it owns (capacity,
 * level range, who may post) because a Server Action is reachable by a direct
 * POST like any other endpoint.
 */

const trimmed = (max: number) => z.string().trim().max(max);

/**
 * A level for one sport, or nothing at all.
 *
 * An empty string arrives from a form field nobody touched, and it means "I do
 * not play this" rather than "beginner". Those are different facts: the first
 * belongs in no game of that sport, the second belongs in a level 1 game.
 */
const optionalLevel = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : Number(v)))
  .refine((v) => v === null || (Number.isInteger(v) && v >= 1 && v <= 5), {
    message: "Choose a level between 1 and 5.",
  });

const profileBase = z.object({
  firstName: trimmed(40).min(1, "Tell us what to call you."),
  lastInitial: z
    .string()
    .trim()
    .regex(/^[A-Za-z]$/, "One letter, your surname initial."),
  tennisLevel: optionalLevel,
  padelLevel: optionalLevel,
  languages: z.array(trimmed(30).min(1)).max(6).default([]),
  programme: trimmed(60).optional().or(z.literal("")),
  studyYear: trimmed(30).optional().or(z.literal("")),
  bio: trimmed(280).optional().or(z.literal("")),
});

/**
 * Neither sport is compulsory and at least one is.
 *
 * Reported against `sports` rather than against either level, because the person
 * has not failed to fill in a field — they have not yet told us what they play,
 * and the error belongs on the question rather than on one of the two answers.
 */
const PLAYS_SOMETHING = {
  message: "Pick at least one sport, and say roughly how you play it.",
  path: ["sports"],
};

const playsSomething = (v: { tennisLevel: number | null; padelLevel: number | null }) =>
  v.tennisLevel !== null || v.padelLevel !== null;

export const profileSchema = profileBase.refine(playsSomething, PLAYS_SOMETHING);

/**
 * Two consents, asked and recorded separately.
 *
 * Bundling "I am 18" and "I agree to the rules" into one box is convenient and
 * it is not consent under GDPR art. 4(11), which requires it to be specific. A
 * person who ticks a combined box has not told you which half they meant.
 */
export const onboardingSchema = profileBase
  .extend({
    confirmedAge: z.literal(true, {
      error: "Deuce is for people aged 18 and over. Please confirm your age.",
    }),
    acceptedTerms: z.literal(true, {
      error: "Please accept the community rules to create your account.",
    }),
  })
  .refine(playsSomething, PLAYS_SOMETHING);

/**
 * A game.
 *
 * `totalEuros` is the whole court fee, taken as a decimal string and converted
 * to integer cents in
 * the action. Money is never stored as a float: 8.10 is not representable in
 * binary floating point, and a court fee that renders as €8.099999 once is a
 * product nobody trusts with a split.
 */
export const gameSchema = z
  .object({
    venueId: z.string().uuid("Choose a court."),
    sport: z.enum(["tennis", "padel"]),
    surface: z.enum(["clay", "hard", "padel", "grass"]),
    indoor: z.boolean(),
    startsAt: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Choose a day and a time."),
    minutes: z.coerce.number().int().min(30, "At least 30 minutes.").max(240, "At most four hours."),
    levelMin: z.coerce.number().int().min(1).max(5),
    levelMax: z.coerce.number().int().min(1).max(5),
    spots: z.coerce.number().int().refine((v) => v === 2 || v === 4, "Two players or four."),
    // The WHOLE court fee now, not a share. Four digits, because a peak padel
    // court for ninety minutes is comfortably over a hundred euro at some clubs.
    totalEuros: z
      .string()
      .trim()
      .regex(/^\d{1,4}([.,]\d{1,2})?$/, "A number, like 40 or 40.50."),
    note: trimmed(280).optional().or(z.literal("")),
    provides: z.array(trimmed(40).min(1)).max(6).default([]),
  })
  .refine((v) => v.levelMin <= v.levelMax, {
    message: "The lowest level cannot be above the highest.",
    path: ["levelMin"],
  })
  // Mirrors the check constraints on `games`, so the person gets a sentence
  // rather than a Postgres error.
  .refine((v) => v.sport !== "padel" || v.spots === 4, {
    message: "Padel is always four players.",
    path: ["spots"],
  })
  .refine((v) => v.sport !== "padel" || v.surface === "padel", {
    message: "Padel is played on turf.",
    path: ["surface"],
  })
  .refine((v) => v.sport !== "tennis" || v.surface !== "padel", {
    message: "Choose clay, hard or grass for tennis.",
    path: ["surface"],
  });

export const venueSchema = z.object({
  name: trimmed(80).min(2, "What is the club called?"),
  area: trimmed(60).min(2, "Which part of Milan?"),
  // Optional, and it is the field most worth asking for. A member who knows the
  // club but not the house number must still be able to post the game, because
  // supply is the constraint on this product, so this cannot be required. When it
  // is given it has to be long enough to be an address rather than a word.
  address: trimmed(160).min(4, "That is too short to find.").optional().or(z.literal("")),
  travel: trimmed(120).optional().or(z.literal("")),
  /**
   * The surface the member is adding the club for. A club row holds an array,
   * because a club can have several, but somebody adding a court knows the one
   * they just booked. A moderator can widen it later.
   */
  surface: z.enum(["clay", "hard", "padel", "grass"]),
  /**
   * One choice of three, not three booleans. venues_has_a_roof and
   * venues_winter_cover_is_outdoor in 00011 reject the combinations this does not
   * offer, so the form is never given a way to describe an impossible club.
   */
  roof: z.enum(["indoor", "winter", "open"], { message: "Is it covered?" }),
});

export const messageSchema = z.object({
  body: z.string().trim().min(1, "Write something first.").max(1000, "That is too long for one message."),
});

export const reportSchema = z.object({
  subjectId: z.string().uuid(),
  gameId: z.string().uuid().optional().or(z.literal("")),
  reason: z.enum(["no_show", "conduct", "safety", "spam", "other"]),
  detail: trimmed(1000).optional().or(z.literal("")),
});

export const ratingSchema = z.object({
  gameId: z.string().uuid(),
  rateeId: z.string().uuid(),
  stars: z.coerce.number().int().min(1).max(5),
  signal: z.enum(["too_low", "about_right", "too_high"]).default("about_right"),
});

/** Euro decimal string → integer cents, without touching a float. */
export function toCents(euros: string): number {
  const [whole, fraction = ""] = euros.trim().replace(",", ".").split(".");
  const cents = fraction.padEnd(2, "0").slice(0, 2);
  return Number(whole) * 100 + Number(cents);
}

/** Flattens Zod issues into `{ field: message }` for a form to render. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
