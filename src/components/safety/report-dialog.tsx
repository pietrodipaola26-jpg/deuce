"use client";

import { useActionState, useState } from "react";

import { ShieldIcon } from "@/components/brand/icons";
import { Button } from "@/components/ui/button";
import { FormError, textareaClasses } from "@/components/ui/field";
import { submitReport, type ActionState } from "@/lib/actions/games";
import { cn } from "@/lib/cn";

/**
 * REPORTING SOMEBODY.
 *
 * Two taps from the game itself, which is the only place somebody will reach for
 * it. A report form buried in a settings page is a report form nobody uses.
 *
 * It never says "are you sure". The cost of a spurious report is a moderator's
 * minute; the cost of a friction-laden one is the thing this product exists to
 * prevent. It also tells the truth about what happens next, because "we take your
 * safety seriously" tells somebody nothing they can act on.
 */

const REASONS = [
  { id: "no_show", label: "They did not turn up" },
  { id: "conduct", label: "How they behaved" },
  { id: "safety", label: "I felt unsafe" },
  { id: "spam", label: "Spam or soliciting" },
  { id: "other", label: "Something else" },
] as const;

export function ReportDialog({
  subjectId,
  subjectName,
  gameId,
}: {
  subjectId: string;
  subjectName: string;
  gameId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ActionState, FormData>(submitReport, {});
  const [reason, setReason] = useState<string>("conduct");

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded text-xs font-medium text-ink-faint underline underline-offset-4 hover:text-danger"
      >
        Report {subjectName}
      </button>
    );
  }

  if (state.ok) {
    return (
      <p className="flex items-start gap-2 rounded-field bg-live-wash px-3 py-2.5 text-xs leading-relaxed text-live">
        <ShieldIcon size={14} className="mt-px shrink-0" />
        {state.message}
      </p>
    );
  }

  return (
    <form action={action} className="rounded-card border border-hairline bg-paper p-4">
      <FormError>{state.errors?.form}</FormError>

      <p className="text-sm font-medium text-ink">Report {subjectName}</p>
      <p className="mt-1 text-xs leading-relaxed text-ink-faint">
        This goes to a student moderator. It is confidential. {subjectName.split(" ")[0]} is not told
        who reported them. It only shows on their profile if a moderator agrees with it.
      </p>

      <input type="hidden" name="subjectId" value={subjectId} />
      {gameId ? <input type="hidden" name="gameId" value={gameId} /> : null}
      <input type="hidden" name="reason" value={reason} />

      <fieldset className="mt-4">
        <legend className="text-xs font-medium text-ink">What happened?</legend>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {REASONS.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setReason(r.id)}
              aria-pressed={reason === r.id}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                reason === r.id
                  ? "border-court-text bg-court-wash text-court-text"
                  : "border-hairline bg-surface text-ink-soft hover:border-edge",
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </fieldset>

      <label htmlFor={`report-detail-${subjectId}`} className="mt-4 block text-xs font-medium text-ink">
        Anything a moderator should know
        <span className="ml-1 font-normal text-ink-faint">optional</span>
      </label>
      <textarea
        id={`report-detail-${subjectId}`}
        name="detail"
        rows={3}
        maxLength={1000}
        className={textareaClasses(false, "mt-2 text-sm")}
      />

      <div className="mt-4 flex gap-2">
        <Button weight="secondary" size="md" type="submit" disabled={pending}>
          {pending ? "Sending…" : "Send the report"}
        </Button>
        <Button weight="quiet" size="md" type="button" disabled={pending} onClick={() => setOpen(false)}>
          Never mind
        </Button>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-ink-faint">
        If you are in danger, contact the police on 112 first. Deuce is not an emergency service.
      </p>
    </form>
  );
}
