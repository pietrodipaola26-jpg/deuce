import type { Route } from "next";
import type { Metadata } from "next";
import Link from "next/link";

import { GameCard } from "@/components/game/game-card";
import { PadelIcon, TennisIcon } from "@/components/brand/icons";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/pieces";
import { EmptyState } from "@/components/ui/field";
import { requireMember } from "@/lib/auth/session";
import { listUpcomingGames, type FeedFilters } from "@/lib/data/games";
import { createClient } from "@/lib/supabase/server";
import { LEVELS, sportsPlayed } from "@/lib/game/level";
import { SURFACE_LIST, type SurfaceId } from "@/lib/game/surface";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "This week's games",
  robots: { index: false, follow: false },
};

/**
 * THE FEED.
 *
 * FILTERS ARE IN THE URL, not in React state. Three reasons, and the third is the
 * one that matters: a filtered feed is a link somebody can send to the friend they
 * want to play with, the back button behaves, and the whole page is a Server
 * Component that arrives complete — no loading spinner over an empty list on the
 * one screen the product is judged by.
 *
 * "Just my level" defaults ON for a reason. The failure mode of this product is a
 * beginner scrolling past nine games they would be out of their depth in and
 * concluding Deuce is not for them. Showing them only the games they can actually
 * join is not hiding the feed; it is the feed answering the question they came
 * with. It is one click to see everything.
 */
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function GamesPage({ searchParams }: { searchParams: SearchParams }) {
  const { userId, profile } = await requireMember();
  const params = await searchParams;

  const sportParam = one(params.sport);
  const levelParam = one(params.level);
  const surfaceParam = one(params.surface);
  const openParam = one(params.open);
  const mineParam = one(params.fit);

  // Defaults to the reader's own level unless they have explicitly said "all".
  const fitToMe = mineParam !== "all";

  const filters: FeedFilters = {
    sport: sportParam === "tennis" || sportParam === "padel" ? sportParam : undefined,
    surface: SURFACE_LIST.some((s) => s.id === surfaceParam)
      ? (surfaceParam as SurfaceId)
      : undefined,
    level: levelParam && /^[1-5]$/.test(levelParam) ? Number(levelParam) : undefined,
    openOnly: openParam !== "0",
    fitsMe: fitToMe
      ? { tennis: profile.tennis_level, padel: profile.padel_level }
      : undefined,
  };

  /** "Tennis 4 · Padel 2", or just the one they play. */
  const myLevelsLabel = sportsPlayed(profile)
    .map((sport) =>
      sport === "tennis" ? `Tennis ${profile.tennis_level}` : `Padel ${profile.padel_level}`,
    )
    .join(" · ");

  const games = await listUpcomingGames(filters);

  // Which of these the reader already has a seat in, so the card can say so.
  const supabase = await createClient();
  const { data: mySeats } = await supabase
    .from("game_players")
    .select("game_id")
    .eq("player_id", userId);
  const seatIds = new Set((mySeats ?? []).map((s) => s.game_id));

  const query = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    const current: Record<string, string | undefined> = {
      sport: filters.sport,
      surface: filters.surface,
      level: filters.level ? String(filters.level) : undefined,
      open: openParam === "0" ? "0" : undefined,
      fit: fitToMe ? undefined : "all",
      ...changes,
    };
    for (const [k, v] of Object.entries(current)) if (v) next.set(k, v);
    const qs = next.toString();
    // `Route` rather than a bare string: typedRoutes is on, and a computed path
    // is the one thing it cannot verify for us. The segment is a literal here, so
    // this narrows a real guarantee rather than discarding one.
    return (qs ? `/games?${qs}` : "/games") as Route;
  };

  const anyFilter =
    Boolean(filters.sport) || Boolean(filters.surface) || Boolean(filters.level) || !fitToMe || openParam === "0";

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl leading-tight font-semibold tracking-[-0.025em] text-ink sm:text-[2.25rem]">
            {profile.first_name ? `Hello, ${profile.first_name}.` : "This week"}
          </h1>
          <p className="mt-2 text-[0.9375rem] text-ink-soft">
            {games.length === 0
              ? "No games match that just yet."
              : `${games.length} ${games.length === 1 ? "game" : "games"} you could play.`}
          </p>
        </div>
        <Link href="/games/new" className={buttonClasses("primary", "md")}>
          Post a game
        </Link>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <Card className="mt-8 p-4 sm:p-5">
        <div className="flex flex-col gap-4">
          <Row label="Sport">
            <Pill href={query({ sport: undefined })} on={!filters.sport}>
              Both
            </Pill>
            <Pill href={query({ sport: "tennis" })} on={filters.sport === "tennis"}>
              <TennisIcon size={14} /> Tennis
            </Pill>
            <Pill href={query({ sport: "padel" })} on={filters.sport === "padel"}>
              <PadelIcon size={14} /> Padel
            </Pill>
          </Row>

          <Row label="Level">
            {/* One pill, two levels. "Just my level (T4 · P2)" is denser than two
                controls and it is the truthful label: the filter really is a
                different window in each sport. */}
            <Pill href={query({ fit: undefined, level: undefined })} on={fitToMe && !filters.level}>
              Games I fit{myLevelsLabel ? ` (${myLevelsLabel})` : ""}
            </Pill>
            <Pill href={query({ fit: "all", level: undefined })} on={!fitToMe && !filters.level}>
              Any level
            </Pill>
            {LEVELS.map((l) => (
              <Pill
                key={l.value}
                href={query({ fit: "all", level: String(l.value) })}
                on={filters.level === l.value}
              >
                <span className="num">{l.value}</span> {l.name}
              </Pill>
            ))}
          </Row>

          <Row label="Surface">
            <Pill href={query({ surface: undefined })} on={!filters.surface}>
              Any
            </Pill>
            {SURFACE_LIST.map((s) => (
              <Pill key={s.id} href={query({ surface: s.id })} on={filters.surface === s.id}>
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: s.swatch }}
                  aria-hidden="true"
                />
                {s.name}
              </Pill>
            ))}
          </Row>

          <Row label="Availability">
            <Pill href={query({ open: undefined })} on={openParam !== "0"}>
              Spots left
            </Pill>
            <Pill href={query({ open: "0" })} on={openParam === "0"}>
              Everything
            </Pill>
          </Row>

          {anyFilter ? (
            <div>
              <Link
                href="/games"
                className="rounded-full px-2 py-1 text-xs font-medium text-court-text hover:bg-court-wash"
              >
                Clear all
              </Link>
            </div>
          ) : null}
        </div>
      </Card>

      {/* ── The games ───────────────────────────────────────────────────────── */}
      {games.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title={anyFilter ? "Nothing matches that." : "No games posted yet."}
            action={
              <div className="flex flex-col gap-3 sm:flex-row">
                {anyFilter ? (
                  <Link href="/games" className={buttonClasses("secondary", "lg")}>
                    Clear the filters
                  </Link>
                ) : null}
                <Link href="/games/new" className={buttonClasses("primary", "lg")}>
                  Post the first one
                </Link>
              </div>
            }
          >
            {anyFilter
              ? "Widen the level or the surface, or post a game of your own. A posted game fills far more often than a message asking whether anybody is free."
              : "Somebody has to go first, and it is a better deal than it sounds: the person who posts picks the court, the time and the level. Saturday afternoons fill fastest."}
          </EmptyState>
        </div>
      ) : (
        <ul className="mt-8 grid gap-5 md:grid-cols-2">
          {games.map((game) => (
            <li key={game.id} className="flex">
              <GameCard
                game={game}
                className="w-full"
                viewer={profile}
                viewerIsIn={seatIds.has(game.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="label text-[0.6875rem] text-ink-faint">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

/**
 * A filter is a LINK, not a button.
 *
 * So it works with no JavaScript, it can be opened in a new tab, and the browser's
 * own history is the undo. `aria-current` rather than `aria-pressed`, because this
 * is navigation and not a toggle.
 */
function Pill({ href, on, children }: { href: Route; on: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={on ? "true" : undefined}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.8125rem] font-medium transition-colors",
        on
          ? "border-court-text bg-court text-on-court"
          : "border-hairline bg-surface text-ink-soft hover:border-edge hover:text-ink",
      )}
    >
      {children}
    </Link>
  );
}
