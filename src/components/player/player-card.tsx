import type { Route } from "next";
import Link from "next/link";

import { SportIcon } from "@/components/brand/icons";
import { LevelMeter } from "@/components/game/level-meter";
import { Avatar } from "@/components/player/avatar";
import { PlayerStats, type PlayerStatsRow } from "@/components/player/stats";
import { Card, Chip } from "@/components/ui/pieces";
import type { Profile } from "@/lib/auth/session";
import { levelForSport, sportLabel, sportsPlayed, type SportLevels } from "@/lib/game/level";
import { playerName } from "@/lib/format";
import { cn } from "@/lib/cn";

/**
 * A profile as another player sees it before deciding to share a court with them
 * for ninety minutes.
 *
 * WHAT IS NOT HERE, ON PURPOSE: no surname, no photograph, no course code, no
 * timetable, no phone number, no email address. A platform that verifies a
 * university mailbox is holding a real identity, and the correct amount of it to
 * publish is the amount needed to decide about one game.
 *
 * Languages are on the card because half this audience arrived in Milan six
 * weeks ago, and "English, Spanish" is the detail that decides whether an
 * exchange student presses join.
 */
export function PlayerCard({
  profile,
  stats,
  className,
  href,
}: {
  profile: Profile;
  stats: PlayerStatsRow | null;
  className?: string;
  /** When given, the name becomes a link to the full profile. */
  href?: Route;
}) {
  const name = playerName(profile);

  return (
    <Card className={cn("p-5", className)}>
      <div className="flex items-start gap-3.5">
        <Avatar person={profile} size={48} />
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg leading-tight font-medium text-ink">
            {href ? (
              <Link href={href} className="rounded hover:underline underline-offset-4">
                {name}
              </Link>
            ) : (
              name
            )}
          </p>
          {profile.programme ? (
            <p className="mt-0.5 text-sm text-ink-soft">
              {profile.programme}
              {profile.study_year ? <span className="text-ink-faint"> · {profile.study_year}</span> : null}
            </p>
          ) : null}
          {profile.languages.length > 0 ? (
            <p className="mt-1 text-xs text-ink-faint">Speaks {profile.languages.join(", ")}</p>
          ) : null}
        </div>
        {/* The sports somebody plays are the ones they have set a level for, so
            the chip carries the level rather than repeating the name alone. */}
        <span className="hidden shrink-0 gap-1.5 sm:flex">
          {sportsPlayed(profile).map((s) => (
            <Chip key={s}>
              <SportIcon sport={s} size={13} />
              {sportLabel(s)} <span className="num">{levelForSport(profile, s)}</span>
            </Chip>
          ))}
        </span>
      </div>

      {/* One meter per sport. Two rows is the honest shape of the data: a single
          bar for somebody who is a 4 at tennis and a 2 at padel would have to
          pick one of them to lie about. */}
      <div className="mt-4 flex flex-col gap-2">
        {sportsPlayed(profile).map((s) => (
          <div key={s} className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="w-14 shrink-0 text-xs text-ink-faint">{sportLabel(s)}</span>
            <LevelMeter min={levelForSport(profile, s)!} max={levelForSport(profile, s)!} />
          </div>
        ))}
      </div>

      {profile.bio ? (
        <p className="mt-4 text-sm leading-relaxed text-ink-soft">&ldquo;{profile.bio}&rdquo;</p>
      ) : null}

      <PlayerStats stats={stats} className="mt-4" />
    </Card>
  );
}

/** A compact seat in a game's player list: who they are, and their record. */
export function PlayerRow({
  profile,
  stats,
  note,
  action,
}: {
  profile: Pick<Profile, "id" | "first_name" | "last_initial" | "tint"> & SportLevels;
  stats: PlayerStatsRow | null;
  /** "Hosting", or an attendance mark. */
  note?: React.ReactNode;
  action?: React.ReactNode;
}) {
  const games = stats?.games_played ?? 0;
  const reliability = stats?.reliability ?? null;
  const rating = stats?.rating ?? null;

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <Avatar person={profile} size={38} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">
          <Link href={`/players/${profile.id}`} className="rounded hover:underline underline-offset-4">
            {playerName(profile)}
          </Link>
          {note ? <span className="ml-2 text-xs font-normal text-ink-faint">{note}</span> : null}
        </p>
        <p className="num mt-0.5 text-xs text-ink-faint">
          {sportsPlayed(profile)
            .map((s) => `${sportLabel(s)} ${levelForSport(profile, s)}`)
            .join(" · ") || "No level set"}
          {" · "}
          {games === 0 ? "New to Deuce" : `${games} ${games === 1 ? "game" : "games"}`}
          {rating !== null ? ` · ${Number(rating).toFixed(1)}★` : ""}
          {reliability !== null ? ` · ${reliability}% turned up` : ""}
        </p>
      </div>
      {action ? <span className="shrink-0">{action}</span> : null}
    </li>
  );
}
