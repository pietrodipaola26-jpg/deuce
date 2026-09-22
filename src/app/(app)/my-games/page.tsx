import type { Metadata } from "next";
import Link from "next/link";

import { GameCard } from "@/components/game/game-card";
import { buttonClasses } from "@/components/ui/button";
import { Eyebrow, Rule } from "@/components/ui/pieces";
import { EmptyState } from "@/components/ui/field";
import { requireMember } from "@/lib/auth/session";
import { listMyGames } from "@/lib/data/games";
import { hasEnded } from "@/lib/format";

export const metadata: Metadata = {
  title: "Your games",
  robots: { index: false, follow: false },
};

/**
 * Everything you are in: what is coming, and what has been played.
 *
 * The past list is not nostalgia. It is where ratings and attendance get done, and
 * a played game that still needs rating is flagged, because the record only works
 * if people actually close the loop.
 */
export default async function MyGamesPage() {
  const { userId, profile } = await requireMember();
  const { upcoming, past } = await listMyGames(userId);

  const needsRating = past.filter(
    (g) => g.status !== "cancelled" && hasEnded(g.starts_at, g.minutes) && g.players.length > 1,
  );

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Your games</Eyebrow>
          <h1 className="mt-3 font-display text-3xl leading-tight font-semibold tracking-[-0.025em] text-ink sm:text-[2.25rem]">
            What you are playing.
          </h1>
        </div>
        <Link href="/games/new" className={buttonClasses("primary", "md")}>
          Post a game
        </Link>
      </div>

      {needsRating.length > 0 ? (
        <p className="mt-8 rounded-card bg-court-wash px-4 py-3 text-sm leading-relaxed text-court-text">
          You have {needsRating.length} played {needsRating.length === 1 ? "game" : "games"} to rate.
          Ten seconds each, and it is the whole reason the next person can trust this.
        </p>
      ) : null}

      <section className="mt-10">
        <h2 className="font-display text-xl font-medium tracking-[-0.015em] text-ink">Coming up</h2>
        {upcoming.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="Nothing in the diary."
              action={
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link href="/games" className={buttonClasses("primary", "lg")}>
                    Find a game
                  </Link>
                  <Link href="/games/new" className={buttonClasses("secondary", "lg")}>
                    Post one
                  </Link>
                </div>
              }
            >
              Join something this week. The week you play twice is the week Deuce starts working.
            </EmptyState>
          </div>
        ) : (
          <ul className="mt-4 grid gap-5 md:grid-cols-2">
            {upcoming.map((game) => (
              <li key={game.id} className="flex">
                <GameCard game={game} className="w-full" viewer={profile} viewerIsIn />
              </li>
            ))}
          </ul>
        )}
      </section>

      {past.length > 0 ? (
        <section className="mt-16">
          <Rule className="mb-10" />
          <h2 className="font-display text-xl font-medium tracking-[-0.015em] text-ink">Played</h2>
          <p className="mt-2 text-sm text-ink-soft">
            Open one to rate the people you played, and to read the thread back.
          </p>
          <ul className="mt-4 grid gap-5 md:grid-cols-2">
            {past.map((game) => (
              <li key={game.id} className="flex">
                <GameCard game={game} className="w-full" viewer={profile} viewerIsIn />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
