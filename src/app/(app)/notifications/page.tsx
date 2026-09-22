import type { Metadata } from "next";
import Link from "next/link";

import {
  AlertIcon,
  CheckIcon,
  MessageIcon,
  ShieldIcon,
  StarIcon,
  UsersIcon,
} from "@/components/brand/icons";
import { Button } from "@/components/ui/button";
import { Card, Eyebrow } from "@/components/ui/pieces";
import { EmptyState } from "@/components/ui/field";
import { buttonClasses } from "@/components/ui/button";
import { markNotificationsRead } from "@/lib/actions/games";
import { requireMember } from "@/lib/auth/session";
import { listNotifications } from "@/lib/data/players";
import { formatAgo } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Alerts",
  robots: { index: false, follow: false },
};

const ICONS = {
  game_joined: <UsersIcon size={17} />,
  game_left: <AlertIcon size={17} />,
  game_cancelled: <AlertIcon size={17} />,
  game_message: <MessageIcon size={17} />,
  game_full: <CheckIcon size={17} />,
  rating_received: <StarIcon size={15} />,
  report_filed: <ShieldIcon size={17} />,
  report_resolved: <ShieldIcon size={17} />,
  moderation_decision: <ShieldIcon size={17} />,
} as const;

/**
 * Alerts.
 *
 * Written by database triggers and functions at the moment the thing happened, not
 * assembled by polling — somebody joining your game inserts the row that tells you,
 * inside the same transaction that took the seat. So the two can never disagree.
 *
 * Every row links to the game it is about, because an alert you cannot act on is
 * just a nudge.
 */
export default async function NotificationsPage() {
  const { userId } = await requireMember();
  const notifications = await listNotifications(userId);
  const unread = notifications.filter((n) => !n.read_at).length;

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Alerts</Eyebrow>
          <h1 className="mt-3 font-display text-[2rem] leading-tight font-semibold tracking-[-0.03em] text-ink">
            What happened while you were out.
          </h1>
        </div>
        {unread > 0 ? (
          <form action={markNotificationsRead}>
            <Button weight="secondary" size="md" type="submit">
              Mark all as read
            </Button>
          </form>
        ) : null}
      </div>

      {notifications.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="Nothing yet."
            action={
              <Link href="/games" className={buttonClasses("primary", "lg")}>
                Find a game
              </Link>
            }
          >
            When somebody joins your game, writes in a thread you are in, or rates you, it shows up
            here.
          </EmptyState>
        </div>
      ) : (
        <Card className="mt-8 overflow-hidden">
          <ul className="divide-y divide-hairline">
            {notifications.map((n) => {
              const body = (
                <div className="flex items-start gap-3 px-4 py-3.5">
                  <span
                    className={cn(
                      "mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                      n.read_at ? "bg-sunk text-ink-faint" : "bg-court text-on-court",
                    )}
                  >
                    {ICONS[n.kind]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "text-sm leading-relaxed",
                        n.read_at ? "text-ink-soft" : "font-medium text-ink",
                      )}
                    >
                      {n.body}
                    </p>
                    <p className="num mt-1 text-xs text-ink-faint">{formatAgo(n.created_at)}</p>
                  </div>
                  {!n.read_at ? (
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-court-text" aria-label="Unread" />
                  ) : null}
                </div>
              );

              return (
                <li key={n.id}>
                  {n.game_id ? (
                    <Link href={`/games/${n.game_id}`} className="block hover:bg-paper">
                      {body}
                    </Link>
                  ) : (
                    body
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
