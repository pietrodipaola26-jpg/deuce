import Link from "next/link";

import { ArrowRightIcon } from "@/components/brand/icons";
import { DeuceLogo } from "@/components/brand/logo";
import { buttonClasses } from "@/components/ui/button";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/#how", label: "How it works" },
      { href: "/#inside", label: "Games and levels" },
      { href: "/#faq", label: "Questions" },
    ],
  },
  {
    title: "Trust",
    links: [
      { href: "/#safety", label: "How we keep it safe" },
      { href: "/legal/community", label: "Community rules" },
      { href: "/legal/privacy", label: "What we store" },
      { href: "/legal/cookies", label: "Cookies" },
      { href: "/legal/terms", label: "Terms" },
    ],
  },
] as const;

/**
 * THE FOOTER, on the product's own ground.
 *
 * It carries the closing call to action in one line rather than a whole screen —
 * the smallest thing that still closes — and it is dark because a near-black
 * court green base under a mostly white page is the oldest trick there is for
 * making a site feel like it belongs to a brand, at the cost of no white above
 * the fold.
 */
export function SiteFooter({ signedIn = false }: { signedIn?: boolean }) {
  return (
    <footer className="mt-24 bg-band">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        <div className="flex flex-col items-start gap-5 border-b border-band-2 pb-12 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-lg text-balance font-display text-2xl leading-snug font-semibold tracking-[-0.02em] text-on-band sm:text-[1.75rem]">
            There is a game this week you are good enough for.
          </p>
          <Link href={signedIn ? "/games" : "/signup"} className={buttonClasses("onBand", "lg")}>
            {signedIn ? "See this week's games" : "Create your account"}
            <ArrowRightIcon size={17} />
          </Link>
        </div>

        <div className="flex flex-col gap-10 pt-12 md:flex-row md:justify-between">
          <div className="max-w-xs">
            <DeuceLogo size={26} onBand />
            <p className="mt-4 text-sm leading-relaxed text-on-band-soft">
              Tennis and padel at Bocconi, without the group chat. Built by students, in Milan.
            </p>
          </div>

          <div className="flex gap-12 sm:gap-20">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <p className="label text-[0.6875rem] text-on-band-soft">{col.title}</p>
                <ul className="mt-4 flex flex-col gap-2.5">
                  {col.links.map((l) => (
                    <li key={l.href + l.label}>
                      <Link
                        href={l.href}
                        className="rounded text-sm text-on-band-soft transition-colors hover:text-on-band"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 h-px w-full bg-band-2" aria-hidden="true" />

        <div className="mt-6 flex flex-col gap-3 text-xs leading-relaxed text-on-band-soft sm:flex-row sm:items-center sm:justify-between">
          {/*
            Said plainly, and near the top of the small print rather than buried
            in it. The product is built on a Bocconi mailbox and named after the
            campus it serves, which is exactly the situation where a reader is
            entitled to assume an endorsement that does not exist.
          */}
          <p className="max-w-lg">
            Deuce is an independent student project. It is not affiliated with, endorsed by, or
            operated by Università Bocconi.
          </p>
          <p className="num">© {new Date().getFullYear()} Deuce · Milan</p>
        </div>
      </div>
    </footer>
  );
}
