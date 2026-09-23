import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Card, Eyebrow } from "@/components/ui/pieces";
import { requireMember } from "@/lib/auth/session";
import { getCourts, getHosts, getNumbers, getWeekly, type Metric } from "@/lib/data/numbers";
import { playerName } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Numbers",
  robots: { index: false, follow: false },
};

/**
 * THE NUMBERS.
 *
 * One page, one reader. Not a dashboard for a team and not analytics: no third
 * party, no script, nothing recorded about anybody that the application was not
 * already writing in the course of working. See migration 00018.
 *
 * ORDERED BY HOW THE PRODUCT FAILS, not by what is flattering. Supply first,
 * because a feed with no games in it is the only way Deuce dies. Demand second,
 * because a game nobody joins is the next way. Health last, because reliability
 * only matters once the first two are happening at all.
 *
 * EVERY FIGURE CARRIES LAST WEEK NEXT TO IT. A number on its own is a fact; a
 * number against the week before is the only version that tells you to do
 * something. Where a metric describes a state rather than an event there is no
 * comparison, and the page says nothing rather than inventing one.
 */
export default async function NumbersPage() {
  const { profile } = await requireMember();
  if (!profile.is_moderator) notFound();

  const [n, hosts, courts, weekly] = await Promise.all([
    getNumbers(),
    getHosts(),
    getCourts(),
    getWeekly(),
  ]);

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-10 sm:py-14">
      <Eyebrow>Private</Eyebrow>
      <h1 className="mt-2 font-display text-3xl font-medium tracking-[-0.02em] text-ink">
        The numbers
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
        Nobody else can open this page. Weeks run Monday to Sunday in Milan time. Moderator accounts
        are not counted as members, so your own signup is not adoption, but games you host do count,
        because a real game is real supply whoever posted it.
      </p>

      {/* ── Supply ──────────────────────────────────────────────────────── */}
      <Section title="Supply" note="A feed with no games in it is the only way this fails.">
        <Grid>
          <Stat m={n.get("games_created")} label="Games posted" />
          <Stat m={n.get("games_played")} label="Games played" />
          <Stat m={n.get("games_cancelled")} label="Cancelled" invert />
          <Stat m={n.get("hosts")} label="People hosting" />
        </Grid>
        <Spark
          points={weekly.map((w) => w.games_created)}
          labels={weekly.map((w) => w.week_start)}
          caption="Games posted, last eight weeks"
        />
      </Section>

      {/* ── Demand ──────────────────────────────────────────────────────── */}
      <Section title="Demand" note="A game nobody joins is the next way.">
        <Grid>
          <Stat m={n.get("joins")} label="Seats taken" />
          <Stat m={n.get("games_filled")} label="Games that filled" />
          <Stat m={n.get("games_short")} label="Went off short" invert />
          <Stat m={n.get("views")} label="Game pages opened" />
          <Stat m={n.get("waiting_now")} label="Waiting right now" />
          <Stat
            m={n.get("median_minutes_to_fill")}
            label="Median minutes to fill"
            hint="From posting to the last seat going"
          />
        </Grid>
        <p className="mt-4 text-xs leading-relaxed text-ink-faint">
          Openings exclude the host and anybody already in the game, and are counted without any
          identity attached, so this can say how often a game was looked at and never by whom.
        </p>
      </Section>

      {/* ── Health ──────────────────────────────────────────────────────── */}
      <Section title="Health" note="Only worth reading once the two above are moving.">
        <Grid>
          <Stat m={n.get("signups")} label="Signed up" />
          <Stat m={n.get("onboarded")} label="Finished onboarding" />
          <Stat m={n.get("played_once")} label="Played once" />
          <Stat m={n.get("played_twice")} label="Played twice" />
          <Stat m={n.get("messages")} label="Messages sent" />
          <Stat m={n.get("no_shows")} label="No shows" invert />
          <Stat m={n.get("late_withdrawals")} label="Left inside 12h" invert />
          <Stat m={n.get("safety_exits")} label="Safety exits" hint="A count only, never names" />
        </Grid>
      </Section>

      {/* ── The two lists ───────────────────────────────────────────────── */}
      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-display text-lg font-medium text-ink">Who is hosting</h2>
          <p className="mt-1 text-sm text-ink-faint">
            One name carrying everything is a hobby, not a network.
          </p>
          <Table
            rows={hosts.map((h) => ({
              key: h.player_id,
              left: playerName(h),
              right: `${h.played} of ${h.games}`,
            }))}
            right="played of posted"
            empty="Nobody has hosted yet."
          />
        </Card>

        <Card className="p-5">
          <h2 className="font-display text-lg font-medium text-ink">Which courts get used</h2>
          <p className="mt-1 text-sm text-ink-faint">
            Whether the eighteen clubs were worth the research.
          </p>
          <Table
            rows={courts.map((c) => ({
              key: `${c.name}-${c.area}`,
              left: c.name,
              sub: c.area,
              right: `${c.played} of ${c.games}`,
            }))}
            right="played of posted"
            empty="No games at any court yet."
          />
        </Card>
      </div>
    </div>
  );
}

/* ── Pieces ─────────────────────────────────────────────────────────────── */

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-xl font-medium tracking-[-0.015em] text-ink">{title}</h2>
      <p className="mt-1 text-sm text-ink-faint">{note}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{children}</div>;
}

/**
 * One number, with last week beside it.
 *
 * `invert` is for the metrics where up is bad. Cancellations rising is not good
 * news and must not be drawn in the same colour as games rising, or the page
 * teaches you to skim it wrongly.
 */
function Stat({
  m,
  label,
  hint,
  invert = false,
}: {
  m: Metric | undefined;
  label: string;
  hint?: string;
  invert?: boolean;
}) {
  const all = m?.all_time ?? 0;
  const now = m?.this_week ?? null;
  const before = m?.last_week ?? null;

  let comparison: React.ReactNode = null;
  if (now !== null && before !== null) {
    const delta = now - before;
    const tone =
      delta === 0 ? "text-ink-faint" : (delta > 0) !== invert ? "text-live" : "text-warn";
    comparison = (
      <p className={cn("mt-1.5 text-xs leading-tight", tone)}>
        <span className="num">{now}</span> this week
        {delta === 0 ? ", same as last" : delta > 0 ? `, up from ${before}` : `, down from ${before}`}
      </p>
    );
  }

  return (
    <div className="rounded-field bg-paper px-3 py-2.5">
      <p className="num text-2xl leading-none font-medium text-ink">{all}</p>
      <p className="mt-1.5 text-xs leading-tight text-ink-soft">{label}</p>
      {comparison}
      {hint ? <p className="mt-1 text-[11px] leading-tight text-ink-faint">{hint}</p> : null}
    </div>
  );
}

/**
 * A sparkline, drawn by hand.
 *
 * Eight numbers do not justify a charting library: Recharts is about a hundred
 * kilobytes of JavaScript to draw what is, in the end, a polyline. This is the
 * polyline. It is inline SVG with no dependency, no client component, and no
 * hydration, because it never changes after it is rendered.
 */
function Spark({
  points,
  labels,
  caption,
}: {
  points: number[];
  labels: string[];
  caption: string;
}) {
  const W = 320;
  const H = 44;
  const max = Math.max(1, ...points);
  const step = points.length > 1 ? W / (points.length - 1) : W;

  // Two pixels of padding top and bottom so a maximum is not clipped by the edge
  // of the box and a zero still sits on a visible baseline.
  const xy = points.map((v, i) => ({
    x: i * step,
    y: H - 2 - (v / max) * (H - 4),
  }));
  const coords = xy.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`);
  const tip = xy.at(-1);
  const last = points.at(-1) ?? 0;

  return (
    <figure className="mt-4 rounded-field bg-paper px-3 py-3">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        role="img"
        aria-label={`${caption}. Values: ${points.join(", ")}.`}
        className="overflow-visible"
      >
        <polyline
          points={coords.join(" ")}
          fill="none"
          stroke="var(--color-court-text)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {tip ? <circle cx={tip.x} cy={tip.y} r="3" fill="var(--color-court-text)" /> : null}
      </svg>
      <figcaption className="mt-2 flex items-baseline justify-between text-xs text-ink-faint">
        <span>{caption}</span>
        <span className="num text-ink-soft">
          {labels.at(-1) ? `week of ${labels.at(-1)}: ${last}` : null}
        </span>
      </figcaption>
    </figure>
  );
}

function Table({
  rows,
  right,
  empty,
}: {
  rows: { key: string; left: string; sub?: string; right: string }[];
  right: string;
  empty: string;
}) {
  if (rows.length === 0) {
    return <p className="mt-4 text-sm text-ink-faint">{empty}</p>;
  }
  return (
    <ul className="mt-4 divide-y divide-hairline">
      <li className="flex justify-between pb-2 text-xs text-ink-faint">
        <span>Name</span>
        <span>{right}</span>
      </li>
      {rows.map((r) => (
        <li key={r.key} className="flex items-baseline justify-between gap-3 py-2.5 text-sm">
          <span className="text-ink">
            {r.left}
            {r.sub ? <span className="block text-xs text-ink-faint">{r.sub}</span> : null}
          </span>
          <span className="num shrink-0 text-ink-soft">{r.right}</span>
        </li>
      ))}
    </ul>
  );
}
