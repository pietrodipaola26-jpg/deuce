import type { Metadata } from "next";
import Link from "next/link";

import { DeleteAccount } from "./delete-account";
import { ShieldIcon } from "@/components/brand/icons";
import { Button } from "@/components/ui/button";
import { Card, Eyebrow } from "@/components/ui/pieces";
import { signOutAction } from "@/lib/actions/auth";
import { requireMember } from "@/lib/auth/session";
import { getUser } from "@/lib/auth/session";
import { formatDayMonth } from "@/lib/format";
import { LEGAL_DOCS } from "@/content/legal";

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
};

/** All the documents share one revision date, so any of them will do. */
const LEGAL_UPDATED = LEGAL_DOCS[0]?.updated ?? "";

export default async function SettingsPage() {
  const { profile } = await requireMember();
  const user = await getUser();

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 sm:px-8">
      <Eyebrow>Settings</Eyebrow>
      <h1 className="mt-3 font-display text-[2rem] leading-tight font-semibold tracking-[-0.03em] text-ink">
        Your account.
      </h1>

      <Card className="mt-8 p-5">
        <p className="label text-[0.6875rem] text-ink-faint">Signed in as</p>
        <p className="mt-2 text-sm font-medium text-ink">{user?.email}</p>
        <p className="mt-2 text-xs leading-relaxed text-ink-faint">
          This address is how Deuce knows you are at Bocconi, and it is never shown to another player.
          There is no password on Deuce, so there is nothing here to change. You sign in with a link
          each time.
        </p>
        {profile.created_at ? (
          <p className="num mt-3 text-xs text-ink-faint">
            Member since {formatDayMonth(profile.created_at)}
          </p>
        ) : null}
      </Card>

      {/*
        THE CONSENT RECORD.
        A consent you cannot go and look at is a consent you cannot meaningfully
        withdraw, and a claim nobody can check. Each one is listed with the date
        it was given and the document it was given against, so a member can see
        whether the wording has changed since they agreed to it.
      */}
      <Card className="mt-6 p-5">
        <p className="label text-[0.6875rem] text-ink-faint">What you agreed to</p>
        <ul className="mt-3 flex flex-col divide-y divide-hairline">
          <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3 first:pt-0">
            <span className="text-sm text-ink">You confirmed you are 18 or over</span>
            <span className="num text-xs text-ink-faint">
              {profile.age_confirmed_at ? formatDayMonth(profile.age_confirmed_at) : "Not recorded"}
            </span>
          </li>
          <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
            <span className="text-sm text-ink">
              You accepted the{" "}
              <Link href="/legal/community" className="text-court-text underline underline-offset-4">
                community rules
              </Link>{" "}
              and{" "}
              <Link href="/legal/terms" className="text-court-text underline underline-offset-4">
                terms
              </Link>
            </span>
            <span className="num text-xs text-ink-faint">
              {profile.terms_accepted_at ? formatDayMonth(profile.terms_accepted_at) : "Not recorded"}
            </span>
          </li>
          <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3 last:pb-0">
            <span className="text-sm text-ink">
              Cookies: one session cookie, no tracking (
              <Link href="/legal/cookies" className="text-court-text underline underline-offset-4">
                the full list
              </Link>
              )
            </span>
            <span className="text-xs text-ink-faint">Nothing to consent to</span>
          </li>
        </ul>
        <p className="mt-4 text-xs leading-relaxed text-ink-faint">
          Those documents were last changed on {LEGAL_UPDATED}. If we change anything that matters,
          you are told in the app before it takes effect. Withdrawing consent means deleting your
          account, because there is no version of Deuce that works without these.
        </p>
      </Card>

      <Card className="mt-6 p-5">
        <p className="label text-[0.6875rem] text-ink-faint">Your data</p>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Everything Deuce holds about you is on your profile page, and you can change all of it there.
          What you cannot change is your record, because it belongs to the people you played with.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/profile"
            className="rounded text-sm font-medium text-court-text underline underline-offset-4"
          >
            Edit your profile
          </Link>
          <Link
            href="/legal/privacy"
            className="rounded text-sm font-medium text-court-text underline underline-offset-4"
          >
            What we store, in full
          </Link>
        </div>
      </Card>

      <Card className="mt-6 p-5">
        <p className="flex items-center gap-2 text-sm font-medium text-ink">
          <ShieldIcon size={16} className="text-court-text" />
          Safety
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Report a player from the game you played them in. That is the fastest route, and it gives the
          moderator the context. The community rules say what happens next.
        </p>
        <Link
          href="/legal/community"
          className="mt-3 inline-block rounded text-sm font-medium text-court-text underline underline-offset-4"
        >
          Read the community rules
        </Link>
      </Card>

      <div className="mt-10 flex flex-col gap-6 border-t border-hairline pt-8">
        <form action={signOutAction}>
          <Button weight="secondary" size="md" type="submit">
            Log out
          </Button>
        </form>

        <div>
          <p className="text-sm font-medium text-ink">Leaving for good</p>
          <p className="mt-1 mb-3 text-xs leading-relaxed text-ink-faint">
            No exit interview, and no reactivation window. It is immediate.
          </p>
          <DeleteAccount />
        </div>
      </div>
    </div>
  );
}
