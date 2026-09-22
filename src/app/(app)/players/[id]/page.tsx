import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ShieldIcon } from "@/components/brand/icons";
import { PlayerCard } from "@/components/player/player-card";
import { ReportDialog } from "@/components/safety/report-dialog";
import { buttonClasses } from "@/components/ui/button";
import { Card, Eyebrow } from "@/components/ui/pieces";
import { requireMember } from "@/lib/auth/session";
import { getPlayer } from "@/lib/data/players";
import { playerName } from "@/lib/format";

export const metadata: Metadata = {
  title: "Player",
  // Never indexed. A member profile is for members, and the database agrees.
  robots: { index: false, follow: false },
};

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await requireMember();

  const player = await getPlayer(id);
  // An un-onboarded or non-existent profile is a 404 rather than an empty page:
  // RLS returns no row, and there is nothing honest to render.
  if (!player || !player.profile.onboarded_at) notFound();

  const isMe = player.profile.id === userId;
  const name = playerName(player.profile);

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <Link href="/games" className="rounded text-sm text-ink-soft hover:text-ink">
        ← All games
      </Link>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>{isMe ? "This is you, as others see you" : "Player"}</Eyebrow>
          <h1 className="mt-3 font-display text-[2rem] leading-tight font-semibold tracking-[-0.03em] text-ink">
            {name}
          </h1>
        </div>
        {isMe ? (
          <Link href="/profile" className={buttonClasses("secondary", "md")}>
            Edit your profile
          </Link>
        ) : null}
      </div>

      <PlayerCard profile={player.profile} stats={player.stats} className="mt-8" />

      <Card className="mt-6 p-5">
        <p className="flex items-center gap-2 text-sm font-medium text-ink">
          <ShieldIcon size={16} className="text-court-text" />
          What this record means
        </p>
        <ul className="mt-3 flex flex-col gap-2 text-xs leading-relaxed text-ink-soft">
          <li>
            The rating is the average of what the people in {isMe ? "your" : "their"} games gave
            afterwards. Individual ratings are never shown to anybody, not even to{" "}
            {isMe ? "you" : "them"}.
          </li>
          <li>
            &ldquo;Turned up&rdquo; is the share of finished games where the host marked{" "}
            {isMe ? "you" : "them"} present. A blank means no games have been marked yet, which is not
            the same as a perfect score.
          </li>
          <li>
            The report count only moves after a student moderator agrees with a report. An allegation
            on its own never appears here.
          </li>
        </ul>
      </Card>

      {!isMe ? (
        <div className="mt-6">
          <ReportDialog subjectId={player.profile.id} subjectName={name} />
        </div>
      ) : null}
    </div>
  );
}
