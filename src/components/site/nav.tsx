import Link from "next/link";

import { DeuceLogo } from "@/components/brand/logo";
import { buttonClasses } from "@/components/ui/button";

const LINKS = [
  { href: "/#how", label: "How it works" },
  { href: "/#inside", label: "What you get" },
  { href: "/#safety", label: "Safety" },
] as const;

/**
 * The public nav.
 *
 * TWO actions, and both are real. "Log in" is here because there are returning
 * members now — the thing a signup-stage site cannot honestly offer, and the
 * first small lie a visitor catches you in if it quietly lands on a signup form.
 * The primary button stays the one action that matters on a first visit.
 */
export function SiteNav({ signedIn = false }: { signedIn?: boolean }) {
  return (
    <header className="sticky top-0 z-50 border-b border-hairline bg-paper">
      <nav aria-label="Main" className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5 sm:px-8">
        <Link href="/" className="flex items-center rounded-field" aria-label="Deuce, home">
          <DeuceLogo size={26} />
        </Link>

        <ul className="ml-4 hidden items-center gap-6 md:flex">
          {LINKS.map((l) => (
            // The li is the flex item, and a list-item box carries its own
            // 24px line box — so it is made a flex container too, otherwise the
            // anchor inside rides that baseline instead of the bar's centre.
            <li key={l.href} className="flex items-center">
              <Link
                href={l.href}
                // inline-flex rather than the default inline: an inline anchor's
                // box includes its half-leading, which parks the text half a
                // pixel below the optical centre the logo and the button sit on.
                className="inline-flex items-center rounded text-sm text-ink-soft transition-colors hover:text-ink"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          {signedIn ? (
            <Link href="/games" className={buttonClasses("primary", "md")}>
              Open Deuce
            </Link>
          ) : (
            <>
              <Link href="/login" className={buttonClasses("quiet", "md")}>
                Log in
              </Link>
              <Link href="/signup" className={buttonClasses("primary", "md")}>
                Create account
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
