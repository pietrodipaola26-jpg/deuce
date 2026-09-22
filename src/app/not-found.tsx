import Link from "next/link";

import { buttonClasses } from "@/components/ui/button";
import { DeuceLogo } from "@/components/brand/logo";
import { Eyebrow } from "@/components/ui/pieces";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-hairline">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-5 sm:px-8">
          <Link href="/" className="flex items-center rounded-field" aria-label="Deuce, home">
            <DeuceLogo size={26} />
          </Link>
        </div>
      </header>

      <div className="mx-auto flex max-w-xl flex-1 flex-col items-center px-5 py-28 text-center sm:px-8">
        <Eyebrow>Out</Eyebrow>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-[-0.03em] text-ink">
          That page is not here.
        </h1>
        <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-soft">
          Wrong side of the line. It may also be a game that was cancelled, or one you are not in.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/games" className={buttonClasses("primary", "lg")}>
            This week&rsquo;s games
          </Link>
          <Link href="/" className={buttonClasses("secondary", "lg")}>
            Back to the start
          </Link>
        </div>
      </div>
    </div>
  );
}
