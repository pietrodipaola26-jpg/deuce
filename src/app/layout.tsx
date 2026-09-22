import type { Metadata, Viewport } from "next";
import { Archivo, Figtree } from "next/font/google";

import { CookieNotice } from "@/components/site/cookie-notice";

import "./globals.css";

/**
 * TWO families, two jobs, and deliberately no monospace.
 *
 * DISPLAY  Archivo. A grotesque with athletic proportions, drawn wide and
 *          sturdy, at home on a jersey or a fixture list. It carries every
 *          headline, every label, and every NUMBER in the product.
 * TEXT     Figtree. Humanist, open and softly rounded. Warm without being cute,
 *          and it disappears while you read it, which is the job.
 *
 * Numbers use Archivo with `font-variant-numeric: tabular-nums` (the `.num`
 * utility) rather than a monospace face: a price in mono reads as a terminal, and
 * this is meant to read as a scoreboard.
 *
 * Both are variable and subset to latin, so the whole weight axis costs one file
 * rather than four. next/font downloads and self-hosts them at build time, which
 * is why the Content-Security-Policy needs no external font origin.
 */
const archivo = Archivo({ subsets: ["latin"], variable: "--font-archivo", display: "swap" });
const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000"),
  title: {
    default: "Deuce · Tennis and padel at Bocconi",
    template: "%s · Deuce",
  },
  description:
    "Every tennis and padel game at Bocconi in one place. Level, court, time, price, and who is already playing. Join with your Bocconi email.",
  openGraph: {
    title: "Deuce · Tennis and padel at Bocconi",
    description:
      "The game is already posted. See the level, the court, the time and who is playing, then press join.",
    type: "website",
    locale: "en_GB",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { themeColor: "#fafcf8" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${figtree.variable}`}>
      <body className="min-h-dvh antialiased">
        {/* First thing in the tab order, visible the moment it is focused. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-full focus:bg-band focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-on-band"
        >
          Skip to content
        </a>
        {children}
        <CookieNotice />
      </body>
    </html>
  );
}
