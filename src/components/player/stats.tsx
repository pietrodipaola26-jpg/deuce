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
 * So every player carries six numbers, and three of them are unflattering by
 * design. A profile that can only go up is a profile nobody believes; the
 * no-show count, the late withdrawals and the report count are what make the
 * rating mean anything.
 *
 * NO-SHOWS AND LATE WITHDRAWALS ARE SHOWN SEPARATELY, even though reliability
 * currently weighs them the same. They are not the same failure: one person told
 * three others at two hours' notice, the other left them standing on a court. A
 * single blended percentage hides that, so both counts sit next to it and the
 * reader can weigh them for themselves.
 *
 * HOSTING IS COUNTED FORWARDS. A tally of games called off would make hosting
 * feel risky, and a feed with no games in it is the only way this product fails.
 * So the strip says how many games somebody put on and how many went ahead. The
 * same fact, read as a record rather than as a charge sheet.
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
  /** Dropped out inside twelve hours. Safety exits are never counted here. */
  late_withdrawals: number | null;
  games_hosted: number | null;
  games_hosted_played: number | null;
  host_reliability: number | null;
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
  const lateOuts = stats?.late_withdrawals ?? 0;
  const hosted = stats?.games_hosted ?? 0;
  const hostedPlayed = stats?.games_hosted_played ?? 0;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
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
        value={lateOuts}
        label={lateOuts === 1 ? "Left late" : "Left late"}
        tone={lateOuts === 0 ? "plain" : "warn"}
      />
      <Tile
        value={reports}
        label={reports === 1 ? "Report" : "Reports"}
        tone={reports === 0 ? "plain" : "bad"}
      />
    </div>

    {/* Only for people who have actually hosted. An empty hosting strip on the
        profile of somebody who has only ever joined is noise. */}
    {hosted > 0 ? (
      <div className="rounded-field bg-paper px-3 py-2.5">
        <p className="text-sm text-ink-soft">
          <span className="num font-medium text-ink">{hosted}</span>{" "}
          {hosted === 1 ? "game hosted" : "games hosted"},{" "}
          <span className="num font-medium text-ink">{hostedPlayed}</span> played.
        </p>
      </div>
    ) : null}
    </div>
  );
}
