/**
 * The four playing surfaces.
 *
 * A surface is not decoration: it changes how the ball behaves, what shoes you
 * need, and whether the game survives the weather. It is the first thing a
 * player wants to know about a court, so Deuce treats it as information — with
 * a name and a glyph, never a colour alone.
 */

export type SurfaceId = "clay" | "hard" | "padel" | "grass";

export type Surface = {
  id: SurfaceId;
  name: string;
  /** What it means for the person deciding whether to turn up. */
  note: string;
  /** Token name. Marks only — never text colour. See globals.css. */
  swatch: string;
};

export const SURFACES: Record<SurfaceId, Surface> = {
  clay: {
    id: "clay",
    name: "Clay",
    note: "Slower ball, long rallies, and you will slide. Most of Milan plays on it.",
    swatch: "var(--color-surf-clay)",
  },
  hard: {
    id: "hard",
    name: "Hard",
    note: "Faster and truer. Kinder to beginners because the bounce never surprises you.",
    swatch: "var(--color-surf-hard)",
  },
  padel: {
    id: "padel",
    // Named for the material, not the sport. Calling it "Padel" made every
    // padel card read "Padel | Padel | Indoor", which looks like a bug and
    // wastes the one line that should be telling you about the court.
    name: "Turf",
    note: "Artificial grass inside glass walls, always doubles. The easiest game in the world to start and the hardest to stop.",
    swatch: "var(--color-surf-padel)",
  },
  grass: {
    id: "grass",
    name: "Grass",
    note: "Rare, seasonal, and worth the trip when it appears.",
    swatch: "var(--color-surf-grass)",
  },
};

export const SURFACE_LIST = Object.values(SURFACES);
