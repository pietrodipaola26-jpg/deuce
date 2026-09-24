"use client";

import { useState, useTransition } from "react";

import { AlertIcon, ArrowRightIcon, CheckIcon } from "@/components/brand/icons";
import { Button, buttonClasses } from "@/components/ui/button";
import { FormError, textareaClasses } from "@/components/ui/field";
import {
  cancelGame,
  joinGame,
  joinWaitlist,
  leaveGame,
  leaveWaitlist,
  markAttendance,
} from "@/lib/actions/games";
import { cn } from "@/lib/cn";

/**
 * The buttons that change a game.
 *
 * Each one calls a Server Action that calls a database function, and the reason
 * for that chain is worth stating: the function takes a row lock and is the only
 * thing that decides whether the action is allowed. These components do not
 * pre-judge it — they render whatever sentence comes back. So when two people press
 * join on the last seat at the same instant, the second one is told "this game just
 * filled up" by the database rather than being told by the UI that it worked.
 */

export function JoinButton({ gameId, disabled }: { gameId: string; disabled?: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <FormError>{error}</FormError>
      <Button
        weight="primary"
        size="lg"
        disabled={pending || disabled}
        className="w-full"
        onClick={() =>
          start(async () => {
            setError(null);
            const result = await joinGame(gameId);
            if (result.errors?.form) setError(result.errors.form);
          })
        }
      >
        {pending ? "Joining…" : "Join this game"}
        {pending ? null : <ArrowRightIcon size={17} />}
      </Button>
    </div>
  );
}

export function LeaveButton({ gameId, startsSoon }: { gameId: string; startsSoon: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  /**
   * Confirmed only when it is close to the start.
   *
   * A confirmation on every leave is nagging; a confirmation when three other
   * people are about to be short a player is the point at which somebody should
   * be made to read one sentence.
   */
  function go(safety: boolean) {
    start(async () => {
      setError(null);
      const result = await leaveGame(gameId, safety);
      if (result.errors?.form) {
        setError(result.errors.form);
        setConfirming(false);
      }
    });
  }

  if (confirming || !startsSoon) {
    return (
      <div>
        <FormError>{error}</FormError>
        {confirming ? (
          <p className="mb-3 text-sm leading-relaxed text-warn">
            This game starts within twelve hours. Leaving now posts a note in the thread and goes on
            your record.
          </p>
        ) : null}
        <Button weight="secondary" size="md" disabled={pending} onClick={() => go(false)}>
          {pending ? "Leaving…" : confirming ? "Yes, leave the game" : "Leave this game"}
        </Button>

        {/*
          THE DOOR.

          The moment leaving late carries a cost, staying carries pressure, and
          the person under that pressure is the one who has started to feel
          uneasy about meeting a stranger at a court at night. So there is a way
          out that costs nothing, at any notice.

          It says as little as possible on the way out: the host sees an ordinary
          drop-out with no hint of why, the thread says nothing, and only a
          moderator is told. See migration 00016.
        */}
        <button
          type="button"
          disabled={pending}
          onClick={() => go(true)}
          className="mt-4 block rounded text-left text-sm text-ink-faint underline underline-offset-4 hover:text-ink-soft"
        >
          Something about this does not feel right
        </button>
        <p className="mt-1 text-xs leading-relaxed text-ink-faint">
          Leaves the game with nothing on your record and tells a moderator quietly. Nobody else is
          told anything.
        </p>
      </div>
    );
  }

  return (
    <Button weight="quiet" size="md" onClick={() => setConfirming(true)}>
      Leave this game
    </Button>
  );
}

export function CancelGameControl({ gameId }: { gameId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <Button weight="quiet" size="md" onClick={() => setOpen(true)}>
        Cancel this game
      </Button>
    );
  }

  return (
    <div className="rounded-card border border-hairline bg-paper p-4">
      <FormError>{error}</FormError>
      <p className="flex items-start gap-2 text-sm leading-relaxed text-ink">
        <AlertIcon size={16} className="mt-0.5 shrink-0 text-warn" />
        <span>
          Everybody in the game is told, in the thread and in their alerts. A cancelled game cannot be
          reopened. Post a new one instead.
        </span>
      </p>

      <label htmlFor="cancel-reason" className="mt-4 block text-sm font-medium text-ink">
        Why? <span className="font-normal text-ink-faint">optional, and they will see it</span>
      </label>
      <textarea
        id="cancel-reason"
        rows={2}
        maxLength={200}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="The court flooded."
        className={textareaClasses(false, "mt-2")}
      />

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          weight="secondary"
          size="md"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setError(null);
              const result = await cancelGame(gameId, reason);
              if (result.errors?.form) setError(result.errors.form);
              else setOpen(false);
            })
          }
        >
          {pending ? "Cancelling…" : "Cancel the game"}
        </Button>
        <Button weight="quiet" size="md" disabled={pending} onClick={() => setOpen(false)}>
          Keep it
        </Button>
      </div>
    </div>
  );
}

/**
 * Marking who turned up.
 *
 * This is where reliability comes from, so it is the host's deliberate act and
 * nothing is inferred. An unmarked game counts for and against nobody.
 */
export function AttendanceControl({
  gameId,
  playerId,
  mine,
}: {
  gameId: string;
  playerId: string;
  /** What YOU said, not what the group concluded. Null means you have not said. */
  mine: "played" | "no_show" | null;
}) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<"played" | "no_show" | null>(mine);

  /**
   * Pressing the answer you already gave withdraws it.
   *
   * It has to be possible. You are being asked about somebody's reputation from
   * memory, and a person who realises they misremembered, or who tapped the
   * wrong row, must be able to take it back. 'unknown' is how the database
   * spells no opinion, and it deletes the row rather than recording one.
   */
  const set = (next: "played" | "no_show") =>
    start(async () => {
      const previous = state;
      const target = state === next ? null : next;
      setState(target); // Optimistic: people mark three others in a row.
      const result = await markAttendance(gameId, playerId, target ?? "unknown");
      if (result.errors?.form) setState(previous);
    });

  return (
    <span className="flex gap-1.5">
      <button
        type="button"
        disabled={pending}
        onClick={() => set("played")}
        aria-pressed={state === "played"}
        className={cn(
          "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
          state === "played"
            ? "border-live bg-live-wash text-live"
            : "border-hairline text-ink-faint hover:border-edge hover:text-ink",
        )}
      >
        <CheckIcon size={13} className="mr-1 inline align-[-2px]" />
        Played
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => set("no_show")}
        aria-pressed={state === "no_show"}
        className={cn(
          "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
          state === "no_show"
            ? "border-warn bg-warn-wash text-warn"
            : "border-hairline text-ink-faint hover:border-edge hover:text-ink",
        )}
      >
        Missed it
      </button>
    </span>
  );
}

export { buttonClasses };

/**
 * THE WAITING LIST.
 *
 * Leads with the position, because first in first out is only fair if you can
 * see where you stand: somebody who knows they are second keeps the evening
 * free, and somebody who knows they are ninth does not. Promotion is automatic
 * and can happen at any notice, so getting off the list is one tap and sits
 * right next to the number.
 */
export function WaitlistControl({
  gameId,
  position,
  waiting,
}: {
  gameId: string;
  /** Your place in the queue, or null when you are not on it. */
  position: number | null;
  waiting: number;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(fn: (id: string) => Promise<{ errors?: Record<string, string> }>) {
    start(async () => {
      setError(null);
      const result = await fn(gameId);
      if (result.errors?.form) setError(result.errors.form);
    });
  }

  if (position !== null) {
    return (
      <div className="flex flex-col gap-3">
        <FormError>{error}</FormError>
        <p className="text-sm leading-relaxed text-ink-soft">
          You are <span className="num font-medium text-ink">{position}</span> of{" "}
          <span className="num font-medium text-ink">{waiting}</span> on the waiting list. If a place
          comes free you go straight into the game and we tell you, so keep the time free or step off
          the list.
        </p>
        <Button weight="quiet" size="md" disabled={pending} onClick={() => run(leaveWaitlist)}>
          {pending ? "Leaving…" : "Leave the waiting list"}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <FormError>{error}</FormError>
      <p className="text-sm leading-relaxed text-ink-soft">
        Every seat is taken.{" "}
        {waiting > 0 ? (
          <>
            <span className="num">{waiting}</span>{" "}
            {waiting === 1 ? "person is" : "people are"} waiting for one.
          </>
        ) : (
          "Nobody is waiting for one yet."
        )}{" "}
        If somebody drops out, the longest waiter goes in automatically.
      </p>
      <Button weight="secondary" size="md" disabled={pending} onClick={() => run(joinWaitlist)}>
        {pending ? "Joining…" : "Join the waiting list"}
      </Button>
    </div>
  );
}
