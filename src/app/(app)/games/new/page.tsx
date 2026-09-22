import type { Metadata } from "next";

import { CreateGameForm } from "./create-game-form";
import { Eyebrow } from "@/components/ui/pieces";
import { requireMember } from "@/lib/auth/session";
import { listVenues } from "@/lib/data/games";
import { defaultGameStart } from "@/lib/format";

export const metadata: Metadata = {
  title: "Post a game",
  robots: { index: false, follow: false },
};

export default async function NewGamePage() {
  const { profile } = await requireMember();
  const venues = await listVenues();

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <Eyebrow>Host</Eyebrow>
      <h1 className="mt-4 font-display text-[2rem] leading-[1.06] font-semibold tracking-[-0.03em] text-ink sm:text-[2.5rem]">
        Post a game.
      </h1>
      <p className="mt-4 max-w-xl text-[1.0625rem] leading-relaxed text-ink-soft">
        The person who posts picks the court, the time and the level, which is a better deal than it
        sounds. You book the court; everyone pays their share at the venue.
      </p>

      <div className="mt-10">
        <CreateGameForm venues={venues} myLevels={profile} defaultStart={defaultGameStart()} />
      </div>
    </div>
  );
}
