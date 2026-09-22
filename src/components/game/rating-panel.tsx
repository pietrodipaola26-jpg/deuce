"use client";

import { useActionState, useState } from "react";

import { StarIcon } from "@/components/brand/icons";
import { Avatar } from "@/components/player/avatar";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/field";
import { ratePlayer, type ActionState } from "@/lib/actions/games";
import { playerName } from "@/lib/format";
import { cn } from "@/lib/cn";

/**
 * RATING THE PEOPLE YOU PLAYED.
 *
 * Only appears once the game is over, and the database refuses it before then, so
 * a rating on Deuce cannot be bought, farmed, or left by somebody who did not turn
 * up. That is the whole reason the average on a profile is worth reading.
 *
 * The level question is the useful half. "Were they roughly the level they said?"
 * is the signal that keeps the five-point scale honest across a campus, and it is
 * easier to answer truthfully than a star rating about a person.
 */

type Ratee = {
  id: string;
  first_name: string | null;
  last_initial: string | null;
  tint: number;
};

export function RatingPanel({
  gameId,
  players,
  existing,
}: {
  gameId: string;
  players: Ratee[];
  existing: Array<{ ratee_id: string; stars: number; signal: string }>;
}) {
  const done = new Map(existing.map((e) => [e.ratee_id, e]));
  const remaining = players.filter((p) => !done.has(p.id));

  return (
    <div className="flex flex-col gap-3">
      {players.length === 0 ? (
        <p className="text-sm leading-relaxed text-ink-soft">
          Nobody else was in this game, so there is nobody to rate.
        </p>
      ) : null}

      {remaining.length === 0 && players.length > 0 ? (
        <p className="text-sm leading-relaxed text-live">
          You have rated everybody in this game. Thank you. That is what makes the next person&rsquo;s
          decision an easy one.
        </p>
      ) : null}

      {players.map((p) => {
        const already = done.get(p.id);
        return (
          <RateOne
            key={p.id}
            gameId={gameId}
            player={p}
            existingStars={already?.stars ?? null}
          />
        );
      })}
    </div>
  );
}

function RateOne({
  gameId,
  player,
  existingStars,
}: {
  gameId: string;
  player: Ratee;
  existingStars: number | null;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(ratePlayer, {});
  const [stars, setStars] = useState<number>(existingStars ?? 0);
  const [signal, setSignal] = useState("about_right");

  const saved = state.ok || (existingStars !== null && stars === existingStars && !state.errors);

  return (
    <form action={action} className="rounded-card border border-hairline bg-surface p-4">
      <FormError>{state.errors?.form}</FormError>

      <input type="hidden" name="gameId" value={gameId} />
      <input type="hidden" name="rateeId" value={player.id} />
      <input type="hidden" name="stars" value={stars} />
      <input type="hidden" name="signal" value={signal} />

      <div className="flex items-center gap-3">
        <Avatar person={player} size={34} />
        <p className="flex-1 text-sm font-medium text-ink">{playerName(player)}</p>
        {saved && existingStars !== null ? (
          <span className="text-xs font-medium text-live">Rated</span>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4">
        <fieldset>
          <legend className="sr-only">Stars for {playerName(player)}</legend>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setStars(n)}
                aria-pressed={stars === n}
                aria-label={`${n} ${n === 1 ? "star" : "stars"}`}
                className={cn(
                  "rounded p-0.5 transition-colors",
                  n <= stars ? "text-warn" : "text-hairline hover:text-edge",
                )}
              >
                <StarIcon size={22} />
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="min-w-0">
          <legend className="sr-only">Was the level right?</legend>
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: "too_low", label: "Below their level" },
              { id: "about_right", label: "Level was right" },
              { id: "too_high", label: "Above their level" },
            ].map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setSignal(o.id)}
                aria-pressed={signal === o.id}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                  signal === o.id
                    ? "border-court-text bg-court-wash text-court-text"
                    : "border-hairline text-ink-soft hover:border-edge",
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        </fieldset>

        <Button
          weight="secondary"
          size="md"
          type="submit"
          disabled={pending || stars === 0}
          className="ml-auto"
        >
          {pending ? "Saving…" : existingStars !== null ? "Change it" : "Save"}
        </Button>
      </div>
    </form>
  );
}
