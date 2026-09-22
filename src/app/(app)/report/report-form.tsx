"use client";

import { useActionState, useId, useState } from "react";

import { AlertIcon, CheckIcon, ShieldIcon } from "@/components/brand/icons";
import { Avatar } from "@/components/player/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/pieces";
import { FormError, textareaClasses } from "@/components/ui/field";
import { submitReport, type ActionState } from "@/lib/actions/games";
import type { PlayedWith } from "@/lib/data/players";
import { playerName } from "@/lib/format";
import { cn } from "@/lib/cn";

/**
 * THE REPORT PAGE.
 *
 * The same action as the two-tap report inside a game, on a screen of its own —
 * for the times somebody sits down afterwards and decides to say something. That
 * is a different moment from the one in the thread, and it deserves more room:
 * the whole list of people you have played with, and space to write.
 *
 * ONLY PEOPLE YOU HAVE PLAYED WITH. You cannot report a name you saw in a feed.
 * A reporting form that accepts any member on campus is a harassment tool with a
 * shield icon on it, and the report would tell a moderator nothing they could
 * check.
 *
 * It says what happens next, in specifics. "We take your safety seriously" tells
 * nobody anything they can act on.
 */

const REASONS = [
  { id: "no_show", label: "They did not turn up", hint: "They had a seat and never came." },
  { id: "conduct", label: "How they behaved", hint: "Rude, aggressive, or unpleasant to play with." },
  { id: "safety", label: "I felt unsafe", hint: "Anything that made you want to leave." },
  { id: "spam", label: "Spam or soliciting", hint: "Selling, promoting, or messaging for something else." },
  { id: "other", label: "Something else", hint: "Tell us below." },
] as const;

export function ReportForm({ people }: { people: PlayedWith[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(submitReport, {});
  const [subjectId, setSubjectId] = useState<string>("");
  const [reason, setReason] = useState<string>("conduct");
  const ids = useId();

  const subject = people.find((p) => p.id === subjectId);

  if (state.ok) {
    return (
      <Card className="p-7 text-center sm:p-10">
        <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-live-wash text-live">
          <CheckIcon size={28} />
        </span>
        <h2 className="mt-6 font-display text-2xl font-medium tracking-[-0.02em] text-ink">
          Reported. Thank you for telling us.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-[0.9375rem] leading-relaxed text-ink-soft">
          {state.message}
        </p>
        <div className="mx-auto mt-8 max-w-md rounded-card bg-paper p-5 text-left">
          <p className="label text-[0.6875rem] text-ink-faint">What happens now</p>
          <ul className="mt-3 flex flex-col gap-2.5 text-sm leading-relaxed text-ink-soft">
            <li className="flex items-start gap-2.5">
              <ShieldIcon size={15} className="mt-0.5 shrink-0 text-court-text" />
              A student moderator reads it. Nobody else sees it, and the person you reported is never
              told who reported them.
            </li>
            <li className="flex items-start gap-2.5">
              <ShieldIcon size={15} className="mt-0.5 shrink-0 text-court-text" />
              It only appears on their public record if a moderator agrees with it. That is what stops
              reporting being used as a weapon.
            </li>
            <li className="flex items-start gap-2.5">
              <ShieldIcon size={15} className="mt-0.5 shrink-0 text-court-text" />
              We may email you if we need to ask something. Repeated upheld reports end an account.
            </li>
          </ul>
        </div>
      </Card>
    );
  }

  if (people.length === 0) {
    return (
      <Card className="p-7 text-center">
        <p className="font-display text-lg font-medium text-ink">
          You have not played with anybody yet.
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-soft">
          You can report somebody you have shared a game with, which is the only kind of report a
          moderator can actually check. If something is wrong before you have played, write to the
          moderators from the community rules page.
        </p>
      </Card>
    );
  }

  return (
    <form action={action}>
      <Card className="p-6 sm:p-8">
        <FormError>{state.errors?.form}</FormError>

        <input type="hidden" name="subjectId" value={subjectId} />
        <input type="hidden" name="reason" value={reason} />
        {subject ? <input type="hidden" name="gameId" value={subject.lastGameId} /> : null}

        {/* ── Who ─────────────────────────────────────────────────────────── */}
        <fieldset>
          <legend className="text-sm font-medium text-ink">Who are you reporting?</legend>
          <p className="mt-1 text-sm text-ink-faint">
            Everybody you have shared a game with.
          </p>

          <div className="mt-3 flex flex-col gap-2">
            {people.map((p) => {
              const on = subjectId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSubjectId(p.id)}
                  aria-pressed={on}
                  className={cn(
                    "flex items-center gap-3 rounded-card border-2 px-4 py-3 text-left transition-colors",
                    on ? "border-court-text bg-court-wash" : "border-hairline bg-surface hover:border-edge",
                  )}
                >
                  <Avatar person={p} size={34} />
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-sm font-medium", on ? "text-court-text" : "text-ink")}>
                      {playerName(p)}
                    </span>
                    <span className="block truncate text-xs text-ink-faint">{p.lastGameLabel}</span>
                  </span>
                </button>
              );
            })}
          </div>
          {state.errors?.subjectId ? (
            <p role="alert" className="mt-2 text-sm text-danger">
              Choose who you are reporting.
            </p>
          ) : null}
        </fieldset>

        {/* ── What ────────────────────────────────────────────────────────── */}
        <fieldset className="mt-8">
          <legend className="text-sm font-medium text-ink">What happened?</legend>
          <div className="mt-3 flex flex-col gap-2">
            {REASONS.map((r) => {
              const on = reason === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setReason(r.id)}
                  aria-pressed={on}
                  className={cn(
                    "rounded-card border-2 px-4 py-3 text-left transition-colors",
                    on ? "border-court-text bg-court-wash" : "border-hairline bg-surface hover:border-edge",
                  )}
                >
                  <span className={cn("block text-sm font-medium", on ? "text-court-text" : "text-ink")}>
                    {r.label}
                  </span>
                  <span className="block text-[0.8125rem] leading-relaxed text-ink-soft">{r.hint}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* ── The detail ──────────────────────────────────────────────────── */}
        <div className="mt-8">
          <label htmlFor={`${ids}-detail`} className="block text-sm font-medium text-ink">
            Tell us what happened
            <span className="ml-1.5 font-normal text-ink-faint">optional, and it helps a lot</span>
          </label>
          <p className="mt-1 text-sm leading-relaxed text-ink-faint">
            Dates, what was said, anything a moderator could check. Only moderators read this.
          </p>
          <textarea
            id={`${ids}-detail`}
            name="detail"
            rows={5}
            maxLength={1000}
            className={textareaClasses(false, "mt-3")}
          />
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Button weight="primary" size="lg" type="submit" disabled={pending || !subjectId}>
            {pending ? "Sending…" : "Send this report"}
          </Button>
          <p className="text-xs leading-relaxed text-ink-faint">
            Confidential. {subject ? playerName(subject).split(" ")[0] : "They"} will never be told who
            reported them.
          </p>
        </div>
      </Card>

      <p className="mt-6 flex items-start gap-2.5 rounded-card bg-warn-wash px-4 py-3 text-sm leading-relaxed text-warn">
        <AlertIcon size={17} className="mt-px shrink-0" />
        <span>
          If you are in danger right now, call 112. Deuce is not an emergency service and a report
          here is read by a student, not by the police.
        </span>
      </p>
    </form>
  );
}
