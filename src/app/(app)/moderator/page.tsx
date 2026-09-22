import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ReportCard } from "./report-card";
import { ShieldIcon } from "@/components/brand/icons";
import { Card, Eyebrow, Rule } from "@/components/ui/pieces";
import { EmptyState } from "@/components/ui/field";
import { requireMember } from "@/lib/auth/session";
import { listReports, statsForReports } from "@/lib/data/moderation";

export const metadata: Metadata = {
  title: "Moderation",
  robots: { index: false, follow: false },
};

/**
 * THE MODERATOR'S QUEUE.
 *
 * NOT MERELY UNLINKED. A non-moderator who types this address gets a 404, and
 * even if that check were removed the database would return no reports, because
 * row-level security restricts the table to moderators. Hiding a menu item is
 * not access control; it is decoration on top of it.
 *
 * 404 rather than "you are not allowed": there is no reason to confirm to a
 * curious member that a moderation page exists.
 *
 * Open reports come first. Resolved ones stay visible underneath so that past
 * decisions, and the reasons written for them, can be read back. A moderator who
 * cannot see what they decided last month cannot be consistent.
 */
export default async function ModeratorPage() {
  const { userId, profile } = await requireMember();
  if (!profile.is_moderator) notFound();

  const reports = await listReports();
  const stats = await statsForReports(reports);

  const open = reports.filter((r) => r.status === "open");
  const resolved = reports.filter((r) => r.status !== "open");

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <Eyebrow>Moderation</Eyebrow>
      <h1 className="mt-3 font-display text-[2rem] leading-tight font-semibold tracking-[-0.03em] text-ink">
        {open.length === 0
          ? "Nothing waiting."
          : `${open.length} report${open.length === 1 ? "" : "s"} to look at.`}
      </h1>
      <p className="mt-4 max-w-xl text-[1.0625rem] leading-relaxed text-ink-soft">
        Every report on Deuce arrives here. A report only appears on somebody&rsquo;s public record
        once you uphold it, which is what stops reporting being used as a weapon, and means an
        unread queue protects nobody.
      </p>

      <Card className="mt-6 p-5">
        <p className="flex items-center gap-2 text-sm font-medium text-ink">
          <ShieldIcon size={16} className="text-court-text" />
          What each decision does
        </p>
        <ul className="mt-3 flex flex-col gap-2 text-xs leading-relaxed text-ink-soft">
          <li>
            <span className="font-medium text-ink">Warning.</span> Counts on their public record.
            They are told which rule and your reason. The reporter is told too.
          </li>
          <li>
            <span className="font-medium text-ink">Close the account.</span> Immediate and total.
            They keep their profile row so the record of games they played survives, but they cannot
            sign in to anything. Both people are told.
          </li>
          <li>
            <span className="font-medium text-ink">Dismiss.</span> Nothing on their record, and the
            subject is never told the report existed. Only the reporter hears back. On a campus this
            small, telling somebody they were reported can identify who reported them.
          </li>
        </ul>
      </Card>

      <section className="mt-10">
        <h2 className="font-display text-xl font-medium tracking-[-0.015em] text-ink">Waiting</h2>
        {open.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="No open reports.">
              When somebody reports a player, from a game or from the report page, it appears here
              with everything you need to decide.
            </EmptyState>
          </div>
        ) : (
          <ul className="mt-4 flex flex-col gap-5">
            {open.map((r) => (
              <li key={r.id}>
                <ReportCard
                  report={r}
                  stats={r.subject ? stats.get(r.subject.id) : undefined}
                  viewerId={userId}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {resolved.length > 0 ? (
        <section className="mt-14">
          <Rule className="mb-10" />
          <h2 className="font-display text-xl font-medium tracking-[-0.015em] text-ink">Decided</h2>
          <p className="mt-2 text-sm text-ink-soft">
            What you decided before, and the reasons you gave.
          </p>
          <ul className="mt-4 flex flex-col gap-5">
            {resolved.map((r) => (
              <li key={r.id}>
                <ReportCard
                  report={r}
                  stats={r.subject ? stats.get(r.subject.id) : undefined}
                  viewerId={userId}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
