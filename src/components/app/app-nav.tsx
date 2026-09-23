"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { DeuceLogo } from "@/components/brand/logo";
import { Avatar } from "@/components/player/avatar";
import { buttonClasses } from "@/components/ui/button";
import { signOutAction } from "@/lib/actions/auth";
import { cn } from "@/lib/cn";

/**
 * The signed-in nav.
 *
 * Different from the public one on purpose: a member does not need to be sold
 * the product, they need to get to the four places it has. The primary action is
 * hosting, because the constraint on this product is supply — a feed with no
 * games in it is the only way Deuce fails.
 *
 * NO DEAD ENDS. Every item here goes somewhere that exists and works.
 */
const LINKS = [
  { href: "/games", label: "Games" },
  { href: "/my-games", label: "My games" },
  { href: "/notifications", label: "Alerts" },
] as const;

export function AppNav({
  person,
  unread,
  isModerator = false,
  unseenReports = 0,
}: {
  person: { first_name: string | null; last_initial: string | null; tint: number };
  unread: number;
  /** Draws the moderation entry. The page refuses non-moderators by itself. */
  isModerator?: boolean;
  /** Open reports not yet looked at. Always 0 for anybody but a moderator. */
  unseenReports?: number;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-50 border-b border-hairline bg-paper">
      <nav aria-label="Main" className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-5 sm:px-8">
        <Link href="/games" className="flex items-center rounded-field" aria-label="Deuce, home">
          <DeuceLogo size={26} showWord={false} />
        </Link>

        <ul className="hidden items-center gap-1 sm:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={isActive(l.href) ? "page" : undefined}
                className={cn(
                  "relative inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm transition-colors",
                  isActive(l.href)
                    ? "bg-sunk font-medium text-ink"
                    : "text-ink-soft hover:text-ink hover:bg-sunk",
                )}
              >
                {l.label}
                {l.href === "/notifications" ? <CountBadge count={unread} /> : null}
              </Link>
            </li>
          ))}
        </ul>

        <div className="ml-auto flex items-center gap-2">
          <Link href="/games/new" className={buttonClasses("primary", "md")}>
            Post a game
          </Link>

          {/* A details/summary menu: keyboard accessible and correctly announced
              with no JavaScript of its own beyond the toggle state. */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-haspopup="menu"
              className="relative rounded-full focus-visible:outline-2"
            >
              <Avatar person={person} size={36} />
              {/* On the avatar because the queue lives behind this menu, and a
                  moderator should see it without opening anything. */}
              {unseenReports > 0 ? (
                <span className="absolute -top-1 -right-1 ring-2 ring-paper rounded-full">
                  <CountBadge count={unseenReports} small />
                </span>
              ) : null}
              <span className="sr-only">
                Your account
                {unseenReports > 0
                  ? `, ${unseenReports} report${unseenReports === 1 ? "" : "s"} waiting`
                  : ""}
              </span>
            </button>

            {open ? (
              <>
                {/* Click-away layer, so the menu closes the way people expect. */}
                <button
                  type="button"
                  aria-hidden="true"
                  tabIndex={-1}
                  onClick={() => setOpen(false)}
                  className="fixed inset-0 z-10 cursor-default"
                />
                <div
                  role="menu"
                  className="absolute right-0 z-20 mt-2 w-52 overflow-hidden rounded-card border border-hairline bg-surface py-1 shadow-lift-3"
                >
                  <MenuLink href="/profile" onNavigate={() => setOpen(false)}>
                    Your profile
                  </MenuLink>
                  {/* Reporting, not "Your games": the games live in the main nav
                      a few pixels away, and this menu is the one place somebody
                      who has left a court and thought about it will look. */}
                  <MenuLink href="/report" onNavigate={() => setOpen(false)}>
                    Report a player
                  </MenuLink>
                  <MenuLink href="/settings" onNavigate={() => setOpen(false)}>
                    Settings
                  </MenuLink>
                  {isModerator ? (
                    <>
                      <div className="my-1 h-px bg-hairline" />
                      <MenuLink href="/moderator" onNavigate={() => setOpen(false)}>
                        <span className="flex items-center gap-2">
                          Moderation
                          <CountBadge count={unseenReports} small />
                        </span>
                      </MenuLink>
                      {/* No badge. A number is not an alert, and a badge here
                          would have you opening it out of reflex. */}
                      <MenuLink href="/numbers" onNavigate={() => setOpen(false)}>
                        Numbers
                      </MenuLink>
                    </>
                  ) : null}
                  <div className="my-1 h-px bg-hairline" />
                  <form action={signOutAction}>
                    <button
                      type="submit"
                      role="menuitem"
                      className="w-full px-4 py-2.5 text-left text-sm text-ink-soft hover:bg-sunk hover:text-ink"
                    >
                      Log out
                    </button>
                  </form>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </nav>

      {/* The same destinations on a phone, where they will not fit beside the
          logo. Not a hamburger: three links do not need to be hidden. */}
      <div className="flex gap-1 overflow-x-auto border-t border-hairline px-4 py-2 sm:hidden">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            aria-current={isActive(l.href) ? "page" : undefined}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm",
              isActive(l.href) ? "bg-sunk font-medium text-ink" : "text-ink-soft",
            )}
          >
            {l.label}
            {l.href === "/notifications" ? <CountBadge count={unread} small /> : null}
          </Link>
        ))}
      </div>
    </header>
  );
}

/**
 * The count badge.
 *
 * One component for both alerts and moderation, because they mean the same
 * thing to a reader: this many things are waiting for you. Two different
 * treatments would imply a difference that does not exist.
 *
 * Acid green rather than red. Red is this product's error colour, and a waiting
 * report is not an error; it is work. The number carries the urgency.
 */
function CountBadge({ count, small = false }: { count: number; small?: boolean }) {
  if (count <= 0) return null;
  return (
    <span
      className={cn(
        "num inline-flex items-center justify-center rounded-full bg-court px-1 font-semibold text-on-court",
        small ? "h-[17px] min-w-[17px] text-[0.625rem]" : "h-[18px] min-w-[18px] text-[0.6875rem]",
      )}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}

function MenuLink({
  href,
  children,
  onNavigate,
}: {
  href: Route;
  children: React.ReactNode;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onNavigate}
      className="block px-4 py-2.5 text-sm text-ink-soft hover:bg-sunk hover:text-ink"
    >
      {children}
    </Link>
  );
}
