import Link from "next/link";

import { DeuceLogo } from "@/components/brand/logo";

/**
 * Chrome for the three screens somebody passes through on the way in: sign in,
 * create an account, and onboarding.
 *
 * NO NAVIGATION, deliberately. Every link on these screens is a way to abandon
 * the one thing the screen is for. The logo goes home, and that is the only exit.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-hairline">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-5 sm:px-8">
          <Link href="/" className="flex items-center rounded-field" aria-label="Deuce, home">
            <DeuceLogo size={26} />
          </Link>
        </div>
      </header>

      <main id="main" className="flex-1">
        {children}
      </main>

      <footer className="border-t border-hairline py-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 text-xs text-ink-faint sm:flex-row sm:justify-between sm:px-8">
          <p>
            An independent student project. Not affiliated with or endorsed by Università Bocconi.
          </p>
          <p className="flex gap-4">
            <Link href="/legal/terms" className="rounded hover:text-ink-soft">
              Terms
            </Link>
            <Link href="/legal/privacy" className="rounded hover:text-ink-soft">
              Privacy
            </Link>
            <Link href="/legal/cookies" className="rounded hover:text-ink-soft">
              Cookies
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
