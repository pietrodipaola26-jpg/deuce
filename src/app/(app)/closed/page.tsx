import type { Metadata } from "next";
import Link from "next/link";

import { AlertIcon } from "@/components/brand/icons";
import { Button } from "@/components/ui/button";
import { Card, Eyebrow } from "@/components/ui/pieces";
import { signOutAction } from "@/lib/actions/auth";
import { getProfile, requireUser } from "@/lib/auth/session";
import { formatDayMonth } from "@/lib/format";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Account closed", robots: { index: false, follow: false } };

/**
 * Where a banned account lands.
 *
 * It exists so that being banned is an explanation rather than a malfunction.
 * `is_member()` refuses a banned account every row in the database, so without
 * this page they would reach a feed with nothing in it, no games, no profiles,
 * and no reason given, and would reasonably report it as broken.
 *
 * The reason shown is the moderator's own words, which is the same text the
 * decision notification carried. Nothing is hidden behind a support address.
 */
export default async function ClosedPage() {
  await requireUser();
  const profile = await getProfile();

  // Not banned? Nothing to see. Sent back to the product.
  if (!profile?.banned_at) redirect("/games");

  return (
    <div className="mx-auto max-w-xl px-5 py-16 sm:px-8">
      <Eyebrow>Your account</Eyebrow>
      <h1 className="mt-3 font-display text-[2rem] leading-tight font-semibold tracking-[-0.03em] text-ink">
        This account has been closed.
      </h1>

      <Card className="mt-8 p-5">
        <p className="flex items-start gap-2.5 text-sm leading-relaxed text-ink">
          <AlertIcon size={17} className="mt-0.5 shrink-0 text-danger" />
          <span>
            A student moderator closed this account on{" "}
            <span className="num">{formatDayMonth(profile.banned_at)}</span>. You cannot join or post
            games, and other members can no longer see you.
          </span>
        </p>

        {profile.banned_reason ? (
          <div className="mt-4 border-t border-hairline pt-4">
            <p className="label text-[0.6875rem] text-ink-faint">The reason given</p>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{profile.banned_reason}</p>
          </div>
        ) : null}
      </Card>

      <p className="mt-6 text-sm leading-relaxed text-ink-soft">
        If you think this is a mistake, reply to the email the decision arrived in and a different
        moderator will look at it. You can read the{" "}
        <Link href="/legal/community" className="font-medium text-court-text underline underline-offset-4">
          community rules
        </Link>{" "}
        at any time.
      </p>

      <form action={signOutAction} className="mt-8">
        <Button weight="secondary" size="md" type="submit">
          Log out
        </Button>
      </form>
    </div>
  );
}
