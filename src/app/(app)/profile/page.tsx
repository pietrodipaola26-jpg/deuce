import type { Metadata } from "next";
import Link from "next/link";

import { ProfileForm } from "./profile-form";
import { PlayerStats } from "@/components/player/stats";
import { Card, Eyebrow } from "@/components/ui/pieces";
import { requireMember } from "@/lib/auth/session";
import { getPlayer } from "@/lib/data/players";

export const metadata: Metadata = {
  title: "Your profile",
  robots: { index: false, follow: false },
};

export default async function ProfilePage() {
  const { userId, profile } = await requireMember();
  const me = await getPlayer(userId);

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <Eyebrow>Your profile</Eyebrow>
      <h1 className="mt-3 font-display text-[2rem] leading-tight font-semibold tracking-[-0.03em] text-ink">
        What other players see.
      </h1>
      <p className="mt-4 max-w-xl text-[1.0625rem] leading-relaxed text-ink-soft">
        Your email address is never on this page and never shown to anybody. Deuce holds no photograph
        of you. Your avatar is your initials.
      </p>

      <Card className="mt-8 p-5">
        <p className="label text-[0.6875rem] text-ink-faint">Your record</p>
        <PlayerStats stats={me?.stats ?? null} className="mt-3" />
        <p className="mt-4 text-xs leading-relaxed text-ink-faint">
          You cannot edit any of this, and neither can anybody else. It comes from games you played and
          what the people in them said afterwards.{" "}
          <Link href={`/players/${userId}`} className="underline underline-offset-4">
            See your profile as others see it
          </Link>
          .
        </p>
      </Card>

      <div className="mt-8">
        <ProfileForm profile={profile} />
      </div>
    </div>
  );
}
