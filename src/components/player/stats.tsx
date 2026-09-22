import { StarIcon } from "@/components/brand/icons";
import { cn } from "@/lib/cn";

/**
 * THE RECORD.
 *
 * The question this product has to answer is not "can I find a game". It is "is
 * it safe to turn up alone, at 21:00, in a part of Milan I do not know, to meet
 * somebody I have never met". No amount of reassuring copy answers that. A
 * record does.
 *
 * So every player carries five numbers, and two of them are unflattering by
 * design. A profile that can only go up is a profile nobody believes; the
 * no-show count and the report count are what make the rating mean anything.
 *
 * A PLAYER WITH NO HISTORY READS AS NEW, NOT AS PERFECT. `reliability` is null
 * until somebody has actually been marked present or absent, and this component
 * renders that as "No games yet" rather than as 100%. "New" and "flawless" are
 * different facts and a product that draws them identically is lying about the
 * one that matters.
 */

export type PlayerStatsRow = {
  games_played: number | null;
  no_shows: number | null;
  rating: number | null;
  rating_count: number | null;
  reliability: number | null;
  reports: number | null;
};

function Tile({
  value,
  label,
  tone = "plain",
}: {
  value: React.ReactNode;
  label: string;
  tone?: "plain" | "good" | "warn" | "bad" | "quiet";
}) {
  const tones = {
    plain: "text-ink",
    good: "text-live",
    warn: "text-warn",
    bad: "text-danger",
    quiet: "text-ink-faint",
  } as const;

  return (
    <div className="rounded-field bg-paper px-3 py-2.5">
      <p className={cn("num text-lg leading-none font-medium", tones[tone])}>{value}</p>
      <p className="mt-1.5 text-xs leading-tight text-ink-faint">{label}</p>
    </div>
  );
}

export function PlayerStats({
  stats,
  className,
}: {
  stats: PlayerStatsRow | null;
  className?: string;
}) {
  const games = stats?.games_played ?? 0;
  const noShows = stats?.no_shows ?? 0;
  const reports = stats?.reports ?? 0;
  const ratingCount = stats?.rating_count ?? 0;
  const rating = stats?.rating ?? null;
  const reliability = stats?.reliability ?? null;

  return (
    <div className={cn("grid grid-cols-2 gap-2 sm:grid-cols-5", className)}>
      <Tile
        value={
          rating === null ? (
            // "New" rather than a dash placeholder: it is the actual fact, and a
            // stat tile reading "New / Not rated yet" says more than a mark that
            // could equally mean zero or broken.
            "New"
          ) : (
            <span className="inline-flex items-center gap-1">
              <StarIcon size={14} className="text-warn" />
              {Number(rating).toFixed(1)}
            </span>
          )
        }
        label={
          ratingCount === 0
            ? "Not rated yet"
            : `Rating · ${ratingCount} ${ratingCount === 1 ? "game" : "games"} rated`
        }
        tone={rating === null ? "quiet" : "plain"}
      />
      <Tile value={games} label="Games played" tone={games === 0 ? "quiet" : "plain"} />
      <Tile
        value={reliability === null ? "New" : `${reliability}%`}
        label={reliability === null ? "No games yet" : "Turned up"}
        tone={reliability === null ? "quiet" : reliability >= 95 ? "good" : "warn"}
      />
      <Tile
        value={noShows}
        label={noShows === 1 ? "Missed game" : "Missed games"}
        tone={noShows === 0 ? "plain" : "warn"}
      />
      <Tile
        value={reports}
        label={reports === 1 ? "Report" : "Reports"}
        tone={reports === 0 ? "plain" : "bad"}
      />
    </div>
  );
}
