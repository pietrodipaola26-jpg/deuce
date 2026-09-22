import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { OnboardingForm } from "./onboarding-form";
import { ShieldIcon } from "@/components/brand/icons";
import { Eyebrow } from "@/components/ui/pieces";
import { getProfile, requireUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Set up your profile",
  robots: { index: false, follow: false },
};

/**
 * The one screen between a verified mailbox and a membership.
 *
 * Reachable only while signed in AND not yet onboarded: somebody who has already
 * done this is sent to the feed rather than shown a form that would overwrite
 * their profile with blanks.
 */
export default async function OnboardingPage() {
  const user = await requireUser();
  const profile = await getProfile();

  if (profile?.onboarded_at) redirect("/games");

  return (
    <div className="mx-auto grid max-w-5xl gap-12 px-5 py-14 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16 lg:py-20">
      <div className="lg:pt-6">
        <Eyebrow>Almost in</Eyebrow>
        <h1 className="mt-4 font-display text-[2.25rem] leading-[1.06] font-semibold tracking-[-0.03em] text-ink">
          Your mailbox checked out.
        </h1>
        <p className="mt-5 max-w-md text-[1.0625rem] leading-relaxed text-ink-soft">
          Now the part other players see. Three short steps, about forty seconds, and then the week&rsquo;s
          games.
        </p>

        <p className="mt-8 flex items-start gap-2.5 rounded-card bg-court-wash px-4 py-3 text-sm leading-relaxed text-court-text">
          <ShieldIcon size={16} className="mt-0.5 shrink-0" />
          <span>
            Your level is the one answer worth getting right. It decides which games you can join, and
            it is the reason nobody turns up to a mismatch.
          </span>
        </p>
      </div>

      <div>
        <OnboardingForm email={user.email ?? ""} />
      </div>
    </div>
  );
}
