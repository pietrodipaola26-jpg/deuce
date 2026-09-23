import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  AttendanceControl,
  CancelGameControl,
  JoinButton,
  LeaveButton,
  WaitlistControl,
} from "./game-actions";
import {
  AlertIcon,
  CalendarIcon,
  ClockIcon,
  EuroIcon,
  IndoorIcon,
  PinIcon,
  ShieldIcon,
  SportIcon,
  SunIcon,
  UsersIcon,
} from "@/components/brand/icons";
import { GameThread } from "@/components/game/game-thread";
import { LevelMeter } from "@/components/game/level-meter";
import { RatingPanel } from "@/components/game/rating-panel";
import { SurfaceMark } from "@/components/game/surface-mark";
import { AvatarStack } from "@/components/player/avatar";
import { PlayerRow } from "@/components/player/player-card";
import { ReportDialog } from "@/components/safety/report-dialog";
import { buttonClasses } from "@/components/ui/button";
import { Card, Chip, Eyebrow, Rule } from "@/components/ui/pieces";
import { CountView } from "@/components/app/count-view";
import { requireMember } from "@/lib/auth/session";
import { getGame, listMessages, listMyRatings, myWaitlistPosition } from "@/lib/data/games";
import { getStatsFor } from "@/lib/data/players";
import {
  formatDuration,
  formatFullDate,
  formatPrice,
  shareOf,
  formatTime,
  hasEnded,
  hasStarted,
  playerName,
  startsWithin,
  threadIsClosed,
} from "@/lib/format";
import { SURFACES } from "@/lib/game/surface";
import { levelFor, levelForSport, sportLabel } from "@/lib/game/level";

export const metadata: Metadata = { title: "Game", robots: { index: false, follow: false } };

/**
 * ONE GAME, and everything you need to decide about it.
 *
 * The order of this page is the order of the decision somebody is actually making:
 *
 *   1. WHAT IT IS       time, court, surface, cost, level — the card, expanded
 *   2. WHO IS GOING     with their records, because that is the real question
 *   3. THE WAY IN       join, or leave, or cancel if it is yours
 *   4. THE THREAD       only once you are in it, because that is the rule
 *   5. AFTERWARDS       attendance for the host, ratings for everybody
 *
 * The thread is not merely hidden from a non-participant: the database returns no
 * messages for them. This page renders what it is allowed to see.
 */
export default async function GamePage({ params }: { params: Promise<{ id: string }> }) {
  // params is a Promise in Next.js 16 — synchronous access was removed in 16.
  const { id } = await params;
  const { userId, profile } = await requireMember();

  const game = await getGame(id);
  if (!game) notFound();

  const mySeat = game.players.find((p) => p.player_id === userId);
  const isIn = Boolean(mySeat);
  const isHost = game.host_id === userId;
  const host = game.players.find((p) => p.is_host)?.profile ?? null;

  const cancelled = game.status === "cancelled";
  const started = hasStarted(game.starts_at);
  const ended = hasEnded(game.starts_at, game.minutes);
  const left = game.spots - game.taken;
  const full = left <= 0;

  // Only asked for when it can matter. A game with a free seat has no queue.
  const waitlistPosition = full && !isIn && !cancelled ? await myWaitlistPosition(game.id) : null;

  // Judged against the level for THIS game's sport: somebody can be a 4 at
  // tennis and a 2 at padel, and the two fit completely different games.
  const myLevel = levelForSport(profile, game.sport);
  const doesNotPlaySport = myLevel === null;
  const outOfRange = myLevel != null && (myLevel < game.level_min || myLevel > game.level_max);

  // The thread closes 24 hours after the game ends — the same window the database
  // policy enforces, so the composer disappears exactly when writing would fail.
  const threadClosed = threadIsClosed(game.starts_at, game.minutes);

  const [messages, myRatings, stats] = await Promise.all([
    isIn ? listMessages(game.id) : Promise.resolve([]),
    isIn && ended ? listMyRatings(game.id) : Promise.resolve([]),
    getStatsFor(game.players.map((p) => p.player_id)),
  ]);

  const others = game.players.filter((p) => p.player_id !== userId);
  const surface = SURFACES[game.surface];

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
      <Link href="/games" className="rounded text-sm text-ink-soft hover:text-ink">
        ← All games
      </Link>

      {/* ── Status, said first when it changes everything below it ─────────── */}
      {cancelled ? (
        <p className="mt-6 flex items-start gap-2.5 rounded-card bg-danger-wash px-4 py-3 text-sm leading-relaxed text-danger">
          <AlertIcon size={17} className="mt-px shrink-0" />
          <span>
            This game was cancelled by the host.
            {game.cancelled_reason ? ` “${game.cancelled_reason}”` : ""} A cancelled game cannot be
            reopened. <Link href="/games/new" className="underline underline-offset-4">Post a new one</Link>.
          </span>
        </p>
      ) : null}

      <header className="mt-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Eyebrow>{game.sport === "tennis" ? "Tennis" : "Padel"}</Eyebrow>
          <span className="h-3.5 w-px bg-hairline" aria-hidden="true" />
          <SurfaceMark surface={game.surface} />
          <span className="inline-flex items-center gap-1.5 text-sm text-ink-soft">
            {game.indoor ? <IndoorIcon size={16} /> : <SunIcon size={16} />}
            {game.indoor ? "Indoor" : "Outdoor"}
          </span>
          {cancelled ? (
            <Chip>Cancelled</Chip>
          ) : ended ? (
            <Chip>Played</Chip>
          ) : isIn ? (
            <Chip tone="accent">You are in</Chip>
          ) : full ? (
            <Chip>Full</Chip>
          ) : (
            <Chip tone="live">
              {left} {left === 1 ? "spot" : "spots"} left
            </Chip>
          )}
        </div>

        <h1 className="mt-4 font-display text-[2rem] leading-[1.06] font-semibold tracking-[-0.03em] text-ink sm:text-[2.5rem]">
          {formatTime(game.starts_at)} at {game.venue.name}
        </h1>
        <p className="mt-2 text-[1.0625rem] text-ink-soft">
          {formatFullDate(game.starts_at)}
          <span className="text-ink-faint"> · {formatDuration(game.minutes)}</span>
        </p>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-12">
        {/* Anonymous, and never counts the host or anybody already in. */}
        <CountView gameId={game.id} />

        <div className="flex flex-col gap-8">
          {/* ── The facts ──────────────────────────────────────────────────── */}
          <Card className="divide-y divide-hairline">
            <Fact icon={<CalendarIcon size={18} />} label="When">
              {formatFullDate(game.starts_at)}, {formatTime(game.starts_at)} for{" "}
              {formatDuration(game.minutes)}
            </Fact>
            <Fact icon={<PinIcon size={18} />} label="Where">
              <span className="font-medium text-ink">{game.venue.name}</span>, {game.venue.area}
              {game.venue.address ? (
                <span className="block text-ink-soft">{game.venue.address}</span>
              ) : null}
              {game.venue.travel ? (
                <span className="block text-ink-faint">{game.venue.travel}</span>
              ) : null}
              {/*
                Order matters. A retired court is also an unverified one, and
                telling somebody a court "was added by a player" when it was
                actually withdrawn for not existing is a false statement about
                how it got there. The stronger, truer warning goes first.
              */}
              {!game.venue.is_active ? (
                <span className="mt-1 block text-xs text-warn">
                  This court has been withdrawn from Deuce because we could not confirm it exists. Do
                  not set off without checking with the host first.
                </span>
              ) : !game.venue.is_verified ? (
                <span className="mt-1 block text-xs text-warn">
                  This court was added by a player and has not been confirmed by a moderator. Check it
                  exists before you set off.
                </span>
              ) : null}
            </Fact>
            <Fact icon={<SportIcon sport={game.sport} size={18} />} label="Surface">
              <span className="font-medium text-ink">{surface.name}.</span> {surface.note}
            </Fact>
            <Fact icon={<UsersIcon size={18} />} label="Level">
              <LevelMeter min={game.level_min} max={game.level_max} />
              <span className="mt-1.5 block text-ink-faint">
                {game.level_min === game.level_max
                  ? levelFor(game.level_min).tell
                  : `From “${levelFor(game.level_min).name}” to “${levelFor(game.level_max).name}”.`}
              </span>
            </Fact>
            <Fact icon={<EuroIcon size={18} />} label="Cost">
              <span className="num font-medium text-ink">
                {formatPrice(shareOf(game.total_cents, game.spots) ?? 0)}
              </span>{" "}
              <span className="text-ink-soft">each when it fills</span>
              {game.taken > 0 && game.taken < game.spots ? (
                <span className="block text-ink-soft">
                  Right now <span className="num">{game.taken}</span>{" "}
                  {game.taken === 1 ? "player" : "players"}, so{" "}
                  <span className="num font-medium text-ink">
                    {formatPrice(shareOf(game.total_cents, game.taken) ?? 0)}
                  </span>{" "}
                  each.
                </span>
              ) : null}
              <span className="block text-ink-faint">
                <span className="num">{formatPrice(game.total_cents)}</span> for the court, split
                evenly and paid at the venue. Shares are rounded up to the cent so the host is never
                short. Deuce takes no cut.
              </span>
            </Fact>
            {game.provides.length > 0 ? (
              <Fact icon={<ClockIcon size={18} />} label="Host brings">
                {game.provides.join(", ")}
              </Fact>
            ) : null}
          </Card>

          {game.note && host ? (
            <div>
              <Eyebrow>From the host</Eyebrow>
              <blockquote className="mt-3">
                <p className="text-[1.0625rem] leading-relaxed text-ink-soft">
                  &ldquo;{game.note}&rdquo;
                </p>
                <footer className="mt-1.5 text-sm text-ink-faint">
                  {playerName(host)}, hosting
                </footer>
              </blockquote>
            </div>
          ) : null}

          {/* ── Who is going ───────────────────────────────────────────────── */}
          <div>
            <div className="flex items-end justify-between gap-4">
              <div>
                <Eyebrow>Who is playing</Eyebrow>
                <p className="num mt-2 text-sm text-ink-faint">
                  {game.taken} of {game.spots} seats taken
                </p>
              </div>
              <AvatarStack people={game.players.map((p) => p.profile)} spots={game.spots} size={32} />
            </div>

            <Card className="mt-4 overflow-hidden">
              <ul className="divide-y divide-hairline">
                {game.players.map((p) => (
                  <PlayerRow
                    key={p.player_id}
                    profile={p.profile}
                    stats={stats.get(p.player_id) ?? null}
                    note={
                      <>
                        {p.is_host ? "hosting" : null}
                        {p.player_id === userId ? (p.is_host ? " · you" : "you") : null}
                        {p.attendance === "played" ? " · turned up" : null}
                        {p.attendance === "no_show" ? " · did not turn up" : null}
                      </>
                    }
                    action={
                      isHost && ended && p.player_id !== userId ? (
                        <AttendanceControl
                          gameId={game.id}
                          playerId={p.player_id}
                          current={p.attendance}
                        />
                      ) : null
                    }
                  />
                ))}
                {left > 0 && !cancelled && !started ? (
                  <li className="px-4 py-3 text-sm text-ink-faint">
                    {left} {left === 1 ? "seat" : "seats"} still free.
                  </li>
                ) : null}
              </ul>
            </Card>
          </div>

          {/* ── The thread, for participants only ──────────────────────────── */}
          {isIn ? (
            <div>
              <Eyebrow>The game thread</Eyebrow>
              <p className="mt-2 mb-4 text-sm leading-relaxed text-ink-soft">
                Only the players in this game can read this. It closes a day after you play, and Deuce
                has no direct messages at all. Nobody here gets your number.
              </p>
              <GameThread
                gameId={game.id}
                initialMessages={messages}
                meId={userId}
                closed={threadClosed || cancelled}
                heading={`${game.sport === "tennis" ? "Tennis" : "Padel"} · ${game.venue.area} · ${formatTime(game.starts_at)}`}
                subheading={`${game.taken} ${game.taken === 1 ? "player" : "players"} · verified Bocconi students`}
              />
            </div>
          ) : null}

          {/* ── Afterwards ─────────────────────────────────────────────────── */}
          {isIn && ended && !cancelled ? (
            <div>
              <Rule className="mb-8" />
              <Eyebrow>Now the game is over</Eyebrow>
              <h2 className="mt-3 font-display text-xl font-medium tracking-[-0.015em] text-ink">
                Rate the people you played.
              </h2>
              <p className="mt-2 mb-5 text-sm leading-relaxed text-ink-soft">
                Nobody is told who rated them, and only the average is ever shown. It takes ten seconds
                and it is the whole reason the next person can trust this.
              </p>
              <RatingPanel
                gameId={game.id}
                players={others.map((p) => p.profile)}
                existing={myRatings}
              />

              {isHost ? (
                <p className="mt-5 flex items-start gap-2 rounded-field bg-court-wash px-4 py-3 text-sm leading-relaxed text-court-text">
                  <ShieldIcon size={16} className="mt-0.5 shrink-0" />
                  You are the host, so you also mark who turned up. The buttons are next to each name
                  above. It is the one thing only you can do, and reliability on Deuce depends on it.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* ── The way in ───────────────────────────────────────────────────── */}
        <aside className="flex flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
          <Card className="p-5">
            {cancelled ? (
              <p className="text-sm leading-relaxed text-ink-soft">
                This game is not happening.{" "}
                <Link href="/games" className="font-medium text-court-text underline underline-offset-4">
                  Find another
                </Link>
                .
              </p>
            ) : ended ? (
              <p className="text-sm leading-relaxed text-ink-soft">
                This game has been played.{" "}
                <Link href="/games" className="font-medium text-court-text underline underline-offset-4">
                  See what is on this week
                </Link>
                .
              </p>
            ) : isHost ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm leading-relaxed text-ink-soft">
                  You are hosting this game.{" "}
                  {full
                    ? "It is full, so the thread is the place to sort out the details."
                    : `${left} more ${left === 1 ? "person" : "people"} can join.`}
                </p>
                <CancelGameControl gameId={game.id} />
              </div>
            ) : isIn ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm leading-relaxed text-ink-soft">
                  You are in this game. Turn up. The host marks who did, and it goes on your record.
                </p>
                <LeaveButton
                  gameId={game.id}
                  startsSoon={startsWithin(game.starts_at, 12)}
                />
              </div>
            ) : started ? (
              <p className="text-sm leading-relaxed text-ink-soft">This game has already started.</p>
            ) : full ? (
              <div className="flex flex-col gap-4">
                <WaitlistControl
                  gameId={game.id}
                  position={waitlistPosition}
                  waiting={game.waiting}
                />
                <div className="border-t border-hairline pt-4">
                  <p className="text-sm leading-relaxed text-ink-faint">
                    Or post one like it. A game at this hour on this court clearly fills.
                  </p>
                  <Link
                    href="/games/new"
                    className={buttonClasses("quiet", "md", "mt-3")}
                  >
                    Post a game like this
                  </Link>
                </div>
              </div>
            ) : doesNotPlaySport ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm leading-relaxed text-warn">
                  You have not set a {sportLabel(game.sport).toLowerCase()} level yet, so Deuce cannot
                  put you in this game. Add one and you can join straight away.
                </p>
                <Link href="/profile" className={buttonClasses("secondary", "md")}>
                  Set your {sportLabel(game.sport).toLowerCase()} level
                </Link>
              </div>
            ) : outOfRange ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm leading-relaxed text-warn">
                  This game asks for level {game.level_min}
                  {game.level_max !== game.level_min ? ` to ${game.level_max}` : ""}, and your{" "}
                  {sportLabel(game.sport).toLowerCase()} level is {myLevel}. Deuce will not put you in a
                  game outside its range. It is how nobody arrives to a mismatch.
                </p>
                <Link href={{ pathname: "/games", query: { fit: "all" } }} className={buttonClasses("secondary", "md")}>
                  Find games you fit
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <JoinButton gameId={game.id} />
                <p className="text-xs leading-relaxed text-ink-faint">
                  Joining opens the game thread and puts your name on the card. You can leave again, and
                  you pay {formatPrice(shareOf(game.total_cents, game.spots) ?? 0).toLowerCase()} at
                  the venue if it fills.
                </p>
              </div>
            )}
          </Card>

          {/* Safety, on the screen where somebody is deciding to meet a stranger
              rather than on a page they would have to go looking for. */}
          <Card className="p-5">
            <p className="flex items-center gap-2 text-sm font-medium text-ink">
              <ShieldIcon size={16} className="text-court-text" />
              Meeting somebody new
            </p>
            <ul className="mt-3 flex flex-col gap-2 text-xs leading-relaxed text-ink-soft">
              <li>Everybody here has a verified Bocconi mailbox, and a record you can read above.</li>
              <li>Arrange everything in the game thread. Nobody needs your phone number.</li>
              <li>Meet at the court. Deuce games happen at booked venues, never anywhere private.</li>
            </ul>

            {isIn && others.length > 0 ? (
              <div className="mt-4 flex flex-col gap-2 border-t border-hairline pt-4">
                {others.map((p) => (
                  <ReportDialog
                    key={p.player_id}
                    subjectId={p.player_id}
                    subjectName={playerName(p.profile)}
                    gameId={game.id}
                  />
                ))}
              </div>
            ) : null}
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Fact({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3.5 px-5 py-4">
      <span className="mt-0.5 shrink-0 text-ink-faint">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="label text-[0.6875rem] text-ink-faint">{label}</p>
        <div className="mt-1.5 text-sm leading-relaxed text-ink-soft">{children}</div>
      </div>
    </div>
  );
}
