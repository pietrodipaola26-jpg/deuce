import Link from "next/link";

import { IndoorIcon, PinIcon, SportIcon, SunIcon } from "@/components/brand/icons";
import { LevelMeter } from "@/components/game/level-meter";
import { SurfaceMark } from "@/components/game/surface-mark";
import { Avatar, AvatarStack } from "@/components/player/avatar";
import { buttonClasses } from "@/components/ui/button";
import { Card, Chip } from "@/components/ui/pieces";
import type { Game } from "@/lib/data/games";
import { levelForSport, sportLabel, type SportLevels } from "@/lib/game/level";
import {
  formatDayMonth,
  formatDuration,
  formatPrice,
  formatRelativeDay,
  formatTime,
  playerName,
} from "@/lib/format";
import { cn } from "@/lib/cn";

/**
 * THE GAME CARD.
 *
 * This is the product. Everything else exists to get somebody to look at one of
 * these and think "I could do that".
 *
 * WHAT IT SHOWS AND WHY. A student does not fail to play because they cannot
 * find a court. They fail because a message saying "anyone for padel thursday?"
 * leaves six questions unanswered, and asking six follow-up questions in front
 * of four hundred people is exactly the thing they will not do. So the card
 * answers all six before anyone has to ask:
 *
 *   What sport, and on what surface      icon, dot, word
 *   Am I good enough                     the level meter, in numbers AND words
 *   When, and for how long               the largest thing on the card
 *   Where, and how do I get there        venue, area, and the actual tram
 *   What will it cost                    per player, split, no Deuce fee
 *   Who is already going                 avatars, and the empty seats left
 *
 * The host's note is last and is the only free text on the card. It is where
 * "genuinely no pressure on level" lives, and that sentence converts better than
 * anything the interface can say on the host's behalf.
 */
export function GameCard({
  game,
  className,
  /** The reader's own levels, so the card can say when they cannot join. */
  viewer,
  /** True when the reader already has a seat in this game. */
  viewerIsIn = false,
}: {
  game: Game;
  className?: string;
  viewer?: SportLevels | null;
  viewerIsIn?: boolean;
}) {
  const host = game.players.find((p) => p.is_host)?.profile ?? null;
  const going = game.players.map((p) => p.profile);
  const left = game.spots - game.taken;
  const full = left <= 0;
  const cancelled = game.status === "cancelled";

  // Compared against the level for THIS sport: a tennis 4 who is a padel 2 fits
  // very different games, and the old single number got one of them wrong.
  const viewerLevel = viewer ? levelForSport(viewer, game.sport) : null;
  const doesNotPlay = viewer != null && viewerLevel === null;
  const outOfRange =
    viewerLevel != null && (viewerLevel < game.level_min || viewerLevel > game.level_max);

  return (
    <Card
      as="article"
      className={cn(
        "flex flex-col overflow-hidden transition-shadow hover:shadow-lift-2",
        cancelled && "opacity-70",
        className,
      )}
    >
      {/* ── What, and what it is played on ─────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-hairline px-5 py-3">
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-ink">
          <SportIcon sport={game.sport} size={17} className="text-ink-soft" />
          {game.sport === "tennis" ? "Tennis" : "Padel"}
        </span>
        {/* A drawn rule, not a pipe character: a "|" glyph inherits the text line
            box, shifts with the font, and is a character a screen reader has to
            be told to ignore. */}
        <span className="h-3.5 w-px shrink-0 bg-hairline" aria-hidden="true" />
        <SurfaceMark surface={game.surface} />
        <span className="inline-flex items-center gap-1.5 text-sm text-ink-soft">
          {game.indoor ? <IndoorIcon size={16} /> : <SunIcon size={16} />}
          {game.indoor ? "Indoor" : "Outdoor"}
        </span>

        <span className="ml-auto">
          {cancelled ? (
            <Chip tone="plain">Cancelled</Chip>
          ) : viewerIsIn ? (
            <Chip tone="accent">You are in</Chip>
          ) : full ? (
            <Chip>Full</Chip>
          ) : (
            <Chip tone="live">
              {left} {left === 1 ? "spot" : "spots"} left
            </Chip>
          )}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        {/* ── When. The largest thing on the card, set like a scoreboard. ──── */}
        <div className="flex items-baseline gap-3">
          <p className="num text-[1.75rem] leading-none font-medium tracking-tight text-ink">
            {formatTime(game.starts_at)}
          </p>
          <p className="text-sm text-ink-soft">
            <span className="font-medium text-ink">
              {formatRelativeDay(game.starts_at)} {formatDayMonth(game.starts_at)}
            </span>
            <span className="text-ink-faint"> · {formatDuration(game.minutes)}</span>
          </p>
        </div>

        {/* ── Where, and how you actually get there ───────────────────────── */}
        <div>
          <p className="font-display text-[1.0625rem] leading-snug font-medium text-ink">
            {game.venue.name}
            {/* Same order as the game page: withdrawn is the truer label. */}
            {!game.venue.is_active ? (
              <span className="ml-2 align-middle text-xs font-normal text-warn">withdrawn</span>
            ) : !game.venue.is_verified ? (
              <span className="ml-2 align-middle text-xs font-normal text-ink-faint">
                added by a player
              </span>
            ) : null}
          </p>
          <p className="mt-1 inline-flex items-start gap-1.5 text-sm text-ink-soft">
            <PinIcon size={15} className="mt-0.5 shrink-0 text-ink-faint" />
            <span>
              {game.venue.area}
              {game.venue.travel ? <span className="text-ink-faint"> · {game.venue.travel}</span> : null}
            </span>
          </p>
        </div>

        {/* ── Am I good enough, and what does it cost ─────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-field bg-paper px-3 py-2.5">
          <LevelMeter min={game.level_min} max={game.level_max} />
          <span className="num text-sm font-medium text-ink">{formatPrice(game.price_cents)}</span>
        </div>

        {/* ── The host's own words ────────────────────────────────────────── */}
        {host ? (
          <div className="flex gap-3">
            <Avatar person={host} size={30} />
            <p className="text-sm leading-relaxed text-ink-soft">
              <span className="font-medium text-ink">{playerName(host)}</span>{" "}
              <span className="text-ink-faint">hosting</span>
              {game.note ? (
                <>
                  <br />
                  &ldquo;{game.note}&rdquo;
                </>
              ) : null}
            </p>
          </div>
        ) : null}

        {game.provides.length > 0 ? (
          <p className="text-xs text-ink-faint">
            Host brings: {game.provides.join(", ").toLowerCase()}
          </p>
        ) : null}

        {/* Said on the card rather than discovered on the button. Somebody who
            cannot join this game should learn that here, with the reason. */}
        {!viewerIsIn && !cancelled && doesNotPlay ? (
          <p className="text-xs leading-relaxed text-warn">
            You have not set a {sportLabel(game.sport).toLowerCase()} level yet, so you cannot join
            this one.
          </p>
        ) : !viewerIsIn && !cancelled && outOfRange ? (
          <p className="text-xs leading-relaxed text-warn">
            This game asks for level {game.level_min}
            {game.level_max !== game.level_min ? ` to ${game.level_max}` : ""}, and your{" "}
            {sportLabel(game.sport).toLowerCase()} level is {viewerLevel}.
          </p>
        ) : null}

        {/* ── Who is going, and the way in ────────────────────────────────── */}
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-hairline pt-4">
          <span className="flex items-center gap-2.5">
            <AvatarStack people={going} spots={game.spots} size={30} />
            <span className="num text-xs text-ink-faint">
              {game.taken}/{game.spots}
            </span>
          </span>

          <Link
            href={`/games/${game.id}`}
            className={buttonClasses(viewerIsIn || full || cancelled ? "secondary" : "primary", "md")}
          >
            {cancelled ? "See what happened" : viewerIsIn ? "Open the game" : full ? "Take a look" : "See the game"}
          </Link>
        </div>
      </div>
    </Card>
  );
}
