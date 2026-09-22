"use client";

import { useState, useTransition } from "react";

import { AlertIcon } from "@/components/brand/icons";
import { Button } from "@/components/ui/button";
import { FormError, inputClasses } from "@/components/ui/field";
import { deleteAccount } from "@/lib/actions/profile";

/**
 * Deleting an account.
 *
 * Real and immediate, not a flag that hides you: the profile goes, and every
 * foreign key pointing at it cascades — seats, messages, ratings you gave,
 * notifications. The privacy page promises exactly this, so this control has to
 * actually do it.
 *
 * It asks you to type the word, which is the one piece of friction that belongs
 * here: this is the single irreversible action in the product.
 */
export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <Button weight="quiet" size="md" onClick={() => setOpen(true)}>
        Delete my account
      </Button>
    );
  }

  return (
    <div className="rounded-card border border-danger/30 bg-danger-wash p-4">
      <FormError>{error}</FormError>

      <p className="flex items-start gap-2 text-sm leading-relaxed text-danger">
        <AlertIcon size={16} className="mt-0.5 shrink-0" />
        <span>
          This is immediate and cannot be undone. Your profile, your seats in upcoming games, the
          messages you wrote, and the ratings you gave are all deleted. If you are hosting a game,
          cancel it first so the others are told.
        </span>
      </p>

      <label htmlFor="confirm-delete" className="mt-4 block text-sm font-medium text-ink">
        Type <span className="num">DELETE</span> to confirm
      </label>
      <input
        id="confirm-delete"
        value={confirmation}
        onChange={(e) => setConfirmation(e.target.value)}
        autoComplete="off"
        className={inputClasses(false, "mt-2 num")}
      />

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          weight="secondary"
          size="md"
          disabled={pending || confirmation !== "DELETE"}
          onClick={() =>
            start(async () => {
              setError(null);
              try {
                await deleteAccount();
              } catch (e) {
                setError(e instanceof Error ? e.message : "We could not delete your account.");
              }
            })
          }
        >
          {pending ? "Deleting…" : "Delete my account for good"}
        </Button>
        <Button weight="quiet" size="md" disabled={pending} onClick={() => setOpen(false)}>
          Keep my account
        </Button>
      </div>
    </div>
  );
}
