import type { Metadata } from "next";
import Link from "next/link";

import { ReportForm } from "./report-form";
import { ShieldIcon } from "@/components/brand/icons";
import { Card, Eyebrow } from "@/components/ui/pieces";
import { requireMember } from "@/lib/auth/session";
import { listMyReports, listPeopleIHavePlayedWith } from "@/lib/data/players";
import { formatDayMonth } from "@/lib/format";
import { playerName } from "@/lib/format";

export const metadata: Metadata = {
  title: "Report a player",
  robots: { index: false, follow: false },
};

const STATUS_WORDS: Record<string, string> = {
  open: "With a moderator",
  actioned: "Upheld",
  dismissed: "Closed, no action",
};

const REASON_WORDS: Record<string, string> = {
  no_show: "Did not turn up",
  conduct: "Behaviour",
  safety: "Felt unsafe",
  spam: "Spam or soliciting",
  other: "Something else",
};

/**
 * A page for reporting somebody, reachable from the account menu.
 *
 * The two-tap report inside a game is still the fastest route and still the best
 * one, because it carries the game as context. This exists for the other moment:
 * somebody who has left the court, thought about it, and decided to say
 * something. That person should not have to go and find the game again.
 *
 * It also shows what happened to the reports you have already sent. A report that
 * disappears into silence teaches people not to bother sending the next one.
 */
export default async function ReportPage() {
  const { userId } = await requireMember();

  const [people, mine] = await Promise.all([
    listPeopleIHavePlayedWith(userId),
    listMyReports(userId),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 sm:px-8">
      <Eyebrow>Safety</Eyebrow>
      <h1 className="mt-3 font-display text-[2rem] leading-tight font-semibold tracking-[-0.03em] text-ink">
        Report a player.
      </h1>
      <p className="mt-4 text-[1.0625rem] leading-relaxed text-ink-soft">
        Tell us about somebody you played with. It goes to a student moderator, it is confidential,
        and it is the thing that keeps this worth turning up to.
      </p>

      <div className="mt-8">
        <ReportForm people={people} />
      </div>

      {mine.length > 0 ? (
        <section className="mt-12">
          <h2 className="font-display text-xl font-medium tracking-[-0.015em] text-ink">
            What you have reported
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Only you can see this list.
          </p>
          <Card className="mt-4 overflow-hidden">
            <ul className="divide-y divide-hairline">
              {mine.map((r) => (
                <li key={r.id} className="flex items-start gap-3 px-4 py-3.5">
                  <ShieldIcon size={16} className="mt-0.5 shrink-0 text-ink-faint" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink">
                      {r.subject ? playerName(r.subject) : "A player"}
                      <span className="font-normal text-ink-faint">
                        {" · "}
                        {REASON_WORDS[r.reason] ?? r.reason}
                      </span>
                    </p>
                    <p className="num mt-0.5 text-xs text-ink-faint">
                      {formatDayMonth(r.created_at)} · {STATUS_WORDS[r.status] ?? r.status}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ) : null}

      <p className="mt-10 text-sm leading-relaxed text-ink-faint">
        You can also report somebody from the game itself, which is quicker and gives the moderator
        the game as context. The{" "}
        <Link href="/legal/community" className="font-medium text-court-text underline underline-offset-4">
          community rules
        </Link>{" "}
        say what we do about each kind of report.
      </p>
    </div>
  );
}
