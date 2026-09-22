"use client";

import { useActionState, useId, useState } from "react";

import { AlertIcon, CheckIcon, ShieldIcon } from "@/components/brand/icons";
import { Avatar } from "@/components/player/avatar";
import { Button } from "@/components/ui/button";
import { Card, Chip } from "@/components/ui/pieces";
import { FormError, textareaClasses } from "@/components/ui/field";
import { resolveReport, type ModerationState } from "@/lib/actions/moderation";
import type { Report } from "@/lib/data/moderation";
import { formatDayMonth, formatFullDate, formatTime, playerName } from "@/lib/format";
import { cn } from "@/lib/cn";

const REASON_WORDS: Record<string, string> = {
  no_show: "Did not turn up",
  conduct: "Behaviour",
  safety: "Felt unsafe",
  spam: "Spam or soliciting",
  other: "Something else",
};

/**
 * ONE REPORT, WITH EVERYTHING NEEDED TO DECIDE ABOUT IT.
 *
 * Both names in full, the game it happened in, what the reporter wrote, and the
 * subject's record. The record is here rather than a click away because a first
 * complaint about somebody with forty games and none missed reads very
 * differently from a fourth complaint about somebody with two, and a moderator
 * deciding in a hurry should not have to go and find that out.
 *
 * The three buttons are equal in weight. None of them is styled as the obvious
 * one, because the right answer genuinely varies and an interface that nudges
 * towards a ban produces bans.
 */
export function ReportCard({
  report,
  stats,
  viewerId,
}: {
  report: Report;
  stats: { games_played: number | null; reliability: number | null; reports: number | null } | undefined;
  viewerId: string;
}) {
  const [state, action, pending] = useActionState<ModerationState, FormData>(resolveReport, {});
  const [outcome, setOutcome] = useState<string>("");
  const ids = useId();

  const open = report.status === "open";
  const aboutMe = report.subject?.id === viewerId;
  const byMe = report.reporter?.id === viewerId;

  return (
    <Card className={cn("p-5", !open && "opacity-80")}>
      {/* ── Who, and what kind ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Chip tone={open ? "live" : "plain"}>
          {open ? "Open" : report.outcome === "ban" ? "Account closed" : report.outcome === "warning" ? "Warning given" : "Dismissed"}
        </Chip>
        <span className="text-sm font-medium text-ink">
          {REASON_WORDS[report.reason] ?? report.reason}
        </span>
        <span className="num ml-auto text-xs text-ink-faint">
          {formatDayMonth(report.created_at)}
        </span>
      </div>

      {/* A moderator judging a report about themselves is allowed here, because
          with one moderator the alternative is a report nobody can ever close.
          It is said out loud rather than hidden. */}
      {aboutMe ? (
        <p className="mt-3 flex items-start gap-2 rounded-field bg-warn-wash px-3 py-2 text-xs leading-relaxed text-warn">
          <AlertIcon size={14} className="mt-px shrink-0" />
          This report is about you. You can still resolve it, and the decision is recorded under your
          name. Ask somebody else to look if you can.
        </p>
      ) : null}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="label text-[0.6875rem] text-ink-faint">Reported by</p>
          <div className="mt-2 flex items-center gap-2.5">
            {report.reporter ? <Avatar person={report.reporter} size={30} /> : null}
            <p className="text-sm font-medium text-ink">
              {report.reporter ? playerName(report.reporter) : "A deleted account"}
              {byMe ? <span className="font-normal text-ink-faint"> (you)</span> : null}
            </p>
          </div>
        </div>

        <div>
          <p className="label text-[0.6875rem] text-ink-faint">About</p>
          <div className="mt-2 flex items-center gap-2.5">
            {report.subject ? <Avatar person={report.subject} size={30} /> : null}
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">
                {report.subject ? playerName(report.subject) : "A deleted account"}
                {report.subject?.banned_at ? (
                  <span className="font-normal text-danger"> · already closed</span>
                ) : null}
              </p>
              <p className="num text-xs text-ink-faint">
                {stats
                  ? `${stats.games_played ?? 0} games · ${
                      stats.reliability === null ? "no record yet" : `${stats.reliability}% turned up`
                    } · ${stats.reports ?? 0} upheld before`
                  : "No record"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── The game it happened in ────────────────────────────────────────── */}
      {report.game ? (
        <p className="mt-4 rounded-field bg-paper px-3 py-2.5 text-sm text-ink-soft">
          <span className="font-medium text-ink">
            {report.game.sport === "tennis" ? "Tennis" : "Padel"} at {report.game.venue?.name}
          </span>
          <span className="text-ink-faint">
            {" "}
            · {formatFullDate(report.game.starts_at)}, {formatTime(report.game.starts_at)}
          </span>
        </p>
      ) : (
        <p className="mt-4 text-sm text-ink-faint">Not attached to a game.</p>
      )}

      {/* ── What they wrote ────────────────────────────────────────────────── */}
      {report.detail ? (
        <blockquote className="mt-4">
          <p className="label text-[0.6875rem] text-ink-faint">What they wrote</p>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-soft">
            &ldquo;{report.detail}&rdquo;
          </p>
        </blockquote>
      ) : (
        <p className="mt-4 text-sm text-ink-faint">They did not add any detail.</p>
      )}

      {/* ── Deciding, or what was decided ──────────────────────────────────── */}
      {open ? (
        <form action={action} className="mt-5 border-t border-hairline pt-5">
          <FormError>{state.error}</FormError>

          <input type="hidden" name="reportId" value={report.id} />
          <input type="hidden" name="outcome" value={outcome} />

          <fieldset>
            <legend className="text-sm font-medium text-ink">What are you doing about it?</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                { id: "warning", label: "Give a warning", tell: "They are told which rule and why." },
                { id: "ban", label: "Close the account", tell: "Immediate, and they are told why." },
                { id: "dismissed", label: "Dismiss", tell: "Only the reporter is told." },
              ].map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setOutcome(o.id)}
                  aria-pressed={outcome === o.id}
                  className={cn(
                    "rounded-card border-2 px-3 py-2 text-left transition-colors",
                    outcome === o.id
                      ? "border-court-text bg-court-wash"
                      : "border-hairline bg-surface hover:border-edge",
                  )}
                >
                  <span
                    className={cn(
                      "block text-[0.8125rem] font-medium",
                      outcome === o.id ? "text-court-text" : "text-ink",
                    )}
                  >
                    {o.label}
                  </span>
                  <span className="block text-[0.6875rem] text-ink-soft">{o.tell}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <label htmlFor={`${ids}-note`} className="mt-4 block text-sm font-medium text-ink">
            Why
          </label>
          <p className="mt-1 text-xs leading-relaxed text-ink-faint">
            This exact text is sent to the people involved, so write it to them. It is also the only
            record of why you decided this.
          </p>
          <textarea
            id={`${ids}-note`}
            name="note"
            rows={3}
            maxLength={1000}
            className={textareaClasses(false, "mt-2 text-sm")}
          />

          <Button
            weight="primary"
            size="md"
            type="submit"
            disabled={pending || !outcome}
            className="mt-4"
          >
            {pending ? "Saving…" : "Resolve this report"}
          </Button>
        </form>
      ) : (
        <div className="mt-5 border-t border-hairline pt-5">
          <p className="flex items-start gap-2 text-sm leading-relaxed text-ink-soft">
            <ShieldIcon size={15} className="mt-0.5 shrink-0 text-ink-faint" />
            <span>
              {report.resolution_note}
              {report.resolved_at ? (
                <span className="num block text-xs text-ink-faint">
                  Resolved {formatDayMonth(report.resolved_at)}
                </span>
              ) : null}
            </span>
          </p>
        </div>
      )}

      {state.ok ? (
        <p role="status" className="mt-4 flex items-start gap-2 rounded-field bg-live-wash px-3 py-2 text-sm text-live">
          <CheckIcon size={15} className="mt-0.5 shrink-0" />
          {state.message}
        </p>
      ) : null}
    </Card>
  );
}
