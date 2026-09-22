"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Button, buttonClasses } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/pieces";

/**
 * The last line of defence.
 *
 * It says what somebody can do next and nothing about what went wrong: an error
 * message from a database is not for a student to read, and a stack trace on a page
 * is a gift to whoever is probing it. The detail goes to the server log via the
 * digest, which is the only place it is useful.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] unhandled error", { digest: error.digest, message: error.message });
  }, [error]);

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-5 py-28 text-center sm:px-8">
      <Eyebrow>Let</Eyebrow>
      <h1 className="mt-4 font-display text-4xl font-semibold tracking-[-0.03em] text-ink">
        Something went wrong at our end.
      </h1>
      <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-soft">
        Not your fault, and nothing you did is lost. Try again. If it keeps happening, it is on us to
        fix.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button weight="primary" size="lg" onClick={reset}>
          Try that again
        </Button>
        <Link href="/games" className={buttonClasses("secondary", "lg")}>
          Back to the games
        </Link>
      </div>
      {error.digest ? (
        <p className="num mt-8 text-xs text-ink-faint">Reference {error.digest}</p>
      ) : null}
    </div>
  );
}
