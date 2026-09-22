"use client";

import Link from "next/link";
import { useActionState, useId, useState } from "react";

import { ArrowRightIcon, CheckIcon, ShieldIcon } from "@/components/brand/icons";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/pieces";
import { Field, FormError, inputClasses } from "@/components/ui/field";
import { ELIGIBLE_DOMAINS, isEligibleEmail } from "@/lib/auth/domains";
import { requestSignInLink, verifyCode, type AuthState } from "@/lib/actions/auth";
import { cn } from "@/lib/cn";

/**
 * ONE FORM FOR SIGNING IN AND SIGNING UP.
 *
 * A student does not know or care which of the two they are doing, and asking
 * them to know is how you lose the ones who already have an account and have
 * forgotten. The server sends a link either way and creates the account if there
 * is not one. The two entry points differ only in the words around this form.
 *
 * THE SECOND SCREEN MATTERS AS MUCH AS THE FIRST. "Check your inbox" is where
 * sign-ins die: the mail is slow, or the link opens in a browser with no session,
 * or a mail client rewrites it. So that screen also takes the six-digit code from
 * the same email, says which address it went to, and offers to send another —
 * three answers to the three ways this actually fails.
 */
export function SignInForm({
  mode,
  initialEmail = "",
  next = "",
}: {
  mode: "signup" | "login";
  initialEmail?: string;
  next?: string;
}) {
  const [state, action, pending] = useActionState<AuthState, FormData>(requestSignInLink, {
    email: initialEmail,
  });
  const [codeState, codeAction, codePending] = useActionState<AuthState, FormData>(verifyCode, {});

  const [email, setEmail] = useState(initialEmail);
  const ids = useId();
  const emailId = `${ids}-email`;
  const codeId = `${ids}-code`;

  const looksEligible = email.trim() !== "" && isEligibleEmail(email);
  const sentTo = state.sent ? (state.email ?? email) : null;

  // ── After the code has been sent. ────────────────────────────────────────
  if (sentTo) {
    return (
      <Card className="p-6 sm:p-8">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-live-wash text-live">
          <CheckIcon size={28} />
        </span>

        <h2 className="mt-5 font-display text-2xl font-medium tracking-[-0.02em] text-ink">
          Check your Bocconi inbox
        </h2>
        <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-ink-soft">
          We sent a code to <span className="font-medium text-ink">{sentTo}</span>. Type it below and
          you are in. There is no password to set.
        </p>

        {/*
          The code is the whole flow, not a fallback.
          It is typed into the tab that asked for it, so it works when the mail
          app opens things in its own browser, it survives clients that rewrite
          links, and no link scanner can spend it before the person does.
        */}
        <form action={codeAction} className="mt-7">
          <input type="hidden" name="email" value={sentTo} />
          <input type="hidden" name="next" value={next} />

          <Field
            id={codeId}
            label="Your code"
            error={codeState.error ?? undefined}
            hint="From the email that just arrived."
          >
            <input
              id={codeId}
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              maxLength={10}
              placeholder="123456"
              aria-invalid={codeState.error ? true : undefined}
              className={inputClasses(
                Boolean(codeState.error),
                "num text-center text-2xl tracking-[0.25em]",
              )}
            />
          </Field>

          <button
            type="submit"
            disabled={codePending}
            className={buttonClasses("primary", "lg", "mt-5 w-full")}
          >
            {codePending ? "Checking…" : "Sign in"}
            {codePending ? null : <ArrowRightIcon size={17} />}
          </button>
        </form>

        <div className="mt-6 border-t border-hairline pt-5">
          <form action={action}>
            <input type="hidden" name="email" value={sentTo} />
            <input type="hidden" name="next" value={next} />
            <p className="text-xs leading-relaxed text-ink-faint">
              Nothing after a minute or two? Check the spam folder, then{" "}
              <button
                type="submit"
                disabled={pending}
                className="rounded font-medium text-court-text underline underline-offset-4 disabled:opacity-60"
              >
                send a new code
              </button>
              . The old one stops working as soon as a new one is sent.
            </p>
          </form>
        </div>
      </Card>
    );
  }

  // ── The first screen. ────────────────────────────────────────────────────
  return (
    <Card className="p-6 sm:p-8">
      <form action={action}>
        <FormError>{state.error}</FormError>

        <h2 className="font-display text-2xl font-medium tracking-[-0.02em] text-ink">
          {mode === "signup" ? "Start with your Bocconi email" : "Sign in with your Bocconi email"}
        </h2>
        <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-ink-soft">
          {mode === "signup"
            ? "It is the whole of the check. Deuce is Bocconi only, and this is what makes everyone on it a fellow student rather than a stranger from the internet."
            : "We will send you a code by email. There is no password on Deuce. Controlling your Bocconi mailbox is how we know it is you."}
        </p>

        <input type="hidden" name="next" value={next} />

        <Field
          id={emailId}
          label="Email address"
          className="mt-7"
          hint={
            looksEligible ? (
              <span className="text-live">Recognised as a Bocconi address.</span>
            ) : (
              <>Ends in {ELIGIBLE_DOMAINS.map((d) => `@${d}`).join(" or ")}</>
            )
          }
        >
          <div className="relative">
            <input
              id={emailId}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              // Deliberately NOT autoFocus: this field is on screen at load, and
              // focusing it scrolls the heading away and puts a keyboard user
              // past the skip link before they have read anything.
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@studbocconi.it"
              aria-invalid={state.error ? true : undefined}
              className={inputClasses(Boolean(state.error), "pr-11")}
            />
            {looksEligible ? (
              <span
                className="absolute top-1/2 right-3.5 -translate-y-1/2 text-live"
                aria-hidden="true"
              >
                <CheckIcon size={19} />
              </span>
            ) : null}
          </div>
        </Field>

        <button
          type="submit"
          disabled={pending}
          className={buttonClasses("primary", "lg", "mt-7 w-full")}
        >
          {pending ? "Sending your code…" : mode === "signup" ? "Create my account" : "Send me a code"}
          {pending ? null : <ArrowRightIcon size={17} />}
        </button>

        <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-ink-faint">
          <ShieldIcon size={14} className="mt-px shrink-0" />
          Your address is never shown to another player and never sold. It is how Deuce knows you are
          at Bocconi, and how it reaches you about your own games.
        </p>
      </form>

      <p className="mt-6 border-t border-hairline pt-5 text-sm text-ink-faint">
        {mode === "signup" ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-court-text underline underline-offset-4">
              Sign in
            </Link>
            .
          </>
        ) : (
          <>
            First time here?{" "}
            <Link href="/signup" className="font-medium text-court-text underline underline-offset-4">
              Create an account
            </Link>
            . It is the same link either way.
          </>
        )}
      </p>

      {mode === "signup" ? (
        <p className={cn("mt-4 text-xs leading-relaxed text-ink-faint")}>
          By creating an account you agree to the{" "}
          <Link href="/legal/terms" className="underline underline-offset-4">
            terms
          </Link>{" "}
          and the{" "}
          <Link href="/legal/community" className="underline underline-offset-4">
            community rules
          </Link>
          . You confirm the rules again, explicitly, on the next screen.
        </p>
      ) : null}
    </Card>
  );
}
