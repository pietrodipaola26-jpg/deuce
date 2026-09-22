import Link from "next/link";

import {
  ArrowRightIcon,
  CheckIcon,
  IndoorIcon,
  LockIcon,
  MessageIcon,
  PadelIcon,
  PinIcon,
  ShieldIcon,
  TennisIcon,
  UsersIcon,
} from "@/components/brand/icons";
import { LevelMeter } from "@/components/game/level-meter";
import { SurfaceMark } from "@/components/game/surface-mark";
import { buttonClasses } from "@/components/ui/button";
import { Card, Chip, Eyebrow, Rule } from "@/components/ui/pieces";
import { LEVELS } from "@/lib/game/level";
import { cn } from "@/lib/cn";

/**
 * THE LANDING PAGE.
 *
 * One job: a Bocconi student with an account by the end of it. Every section is
 * here because it removes a specific reason not to sign up, and anything that did
 * not remove one was cut.
 *
 *   HERO        names the real obstacle, which is not finding a court
 *   THE ASK     shows the group chat failing, because everyone recognises it
 *   HOW         three steps, so nobody wonders what happens after the email
 *   INSIDE      what you actually get: levels, a record, a game thread
 *   FOR YOU     the two people this is for, addressed one at a time
 *   SAFETY      the objection that stops a signup dead if left unanswered
 *   FAQ         the small ones: cost, level, racquet, courts
 *
 * WHAT IT DOES NOT DO. Claim a member count it does not have, show university
 * logos it has no right to, invent testimonials, or run a countdown. The one
 * illustrated game below is drawn from the product's own vocabulary and labelled
 * as an example rather than dressed up as live activity — real games are behind
 * the sign-in, because the privacy page promises that nobody sees anything at all
 * before they have an account, and that promise is kept in the database.
 */
export default function LandingPage() {
  return (
    <>
      <Hero />
      <TheAsk />
      <HowItWorks />
      <Inside />
      <ForYou />
      <Safety />
      <Faq />
    </>
  );
}

/**
 * THE EXAMPLES ON THIS PAGE.
 *
 * Invented, and labelled as invented wherever they appear. A visitor deciding
 * whether to hand over a university email is entitled to see what they would be
 * joining, and an empty product cannot show them that, so these stand in.
 *
 * WHAT THEY ARE NOT ALLOWED TO BE. They are never presented as live activity,
 * never as a member count, and never as a testimonial. The captions say
 * "example" in plain words rather than in grey six point type at the bottom of
 * the page, and nothing here claims anybody has said anything about Deuce.
 *
 * Kept in one place so the same people appear consistently across the card, the
 * profile and the thread, which is what makes it read as one product rather than
 * three unrelated mockups. The real database ships empty.
 */
const EXAMPLE = {
  host: { name: "Tomás R.", initials: "TR", tint: "#E8F0E4" },
  players: [
    { name: "Nadia H.", initials: "NH", tint: "#F5E7EC" },
    { name: "Luca P.", initials: "LP", tint: "#E3F0F6" },
  ],
} as const;

/* ══ Hero ═══════════════════════════════════════════════════════════════════ */

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* The court, drawn as the faintest possible diagram. Atmosphere, carrying
          no information, and hidden from assistive tech. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 flex justify-center text-court-text opacity-[0.10]"
      >
        <svg
          viewBox="0 0 400 300"
          className="h-full w-[120%] max-w-none"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
        >
          <rect x="40" y="20" width="320" height="260" />
          <rect x="40" y="70" width="320" height="160" />
          <path d="M40 150h320M120 70v160M280 70v160M200 20v40M200 240v40" />
        </svg>
      </div>

      <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 pt-16 pb-20 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:pt-24 lg:pb-28">
        <div>
          <Eyebrow>Bocconi only · Tennis &amp; padel · Milan</Eyebrow>

          <h1 className="mt-5 text-balance font-display text-[2.6rem] leading-[1.03] font-semibold tracking-[-0.035em] text-ink sm:text-[3.5rem]">
            The hardest part of a game isn&rsquo;t the tennis.
            <br />
            <span className="relative inline-block text-court-text">
              It&rsquo;s asking.
              <span
                aria-hidden="true"
                className="absolute inset-x-0 -bottom-1 h-[6px] rounded-full bg-court"
              />
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-[1.0625rem] leading-relaxed text-ink-soft">
            Deuce puts every tennis and padel game at Bocconi in one place. The level, the court, the
            time, the price, and who is already playing. You press join. Nobody has to send that
            message to a group chat of four hundred people.
          </p>

          {/* Email first, and a plain GET form on purpose: it works with no
              JavaScript, it is one field instead of five, and the address carries
              through to /signup so the commitment grows one step at a time. */}
          <form action="/signup" method="get" className="mt-8 max-w-lg">
            <label htmlFor="hero-email" className="sr-only">
              Your Bocconi email address
            </label>
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <input
                id="hero-email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="name@studbocconi.it"
                className="h-12 flex-1 rounded-full border border-edge bg-surface px-5 text-base text-ink placeholder:text-ink-faint focus:border-court-text"
              />
              <button type="submit" className={buttonClasses("primary", "lg")}>
                Create your account
                <ArrowRightIcon size={17} />
              </button>
            </div>
            <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-faint">
              <span className="inline-flex items-center gap-1.5">
                <CheckIcon size={13} /> Free, and always will be
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckIcon size={13} /> @studbocconi.it or @unibocconi.it
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckIcon size={13} /> No password to remember
              </span>
            </p>
          </form>
        </div>

        {/* The product, before a single word of explanation. */}
        <div className="relative">
          <ExampleGameCard />
          <p className="mt-3 text-center text-[0.6875rem] text-ink-faint">
            An example game. Real ones are behind the log in.
          </p>
        </div>
      </div>
    </section>
  );
}

/**
 * AN EXAMPLE GAME CARD.
 *
 * This is the product, so the landing page shows it doing its job rather than
 * describing it. The game is invented and the caption underneath says so.
 *
 * WHAT IT ANSWERS, and why each line is on it. A student does not fail to play
 * because they cannot find a court. They fail because a message saying "anyone
 * for padel thursday?" leaves six questions unanswered, and asking six follow up
 * questions in front of four hundred people is the thing they will not do:
 *
 *   What sport, and on what surface      icon, dot, word
 *   Am I good enough                     the level meter, in numbers AND words
 *   When, and for how long               the largest thing on the card
 *   Where, and how do I get there        venue, area, and the actual tram
 *   What will it cost                    per player, split, no Deuce fee
 *   Who is already going                 avatars, and the empty seats left
 *
 * The host's note is the only free text, and it is where "genuinely no pressure
 * on level" lives. That sentence fills games better than anything the interface
 * can say on a host's behalf.
 */
function ExampleGameCard() {
  return (
    <Card as="article" className="flex flex-col overflow-hidden">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-hairline px-5 py-3">
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-ink">
          <PadelIcon size={17} className="text-ink-soft" />
          Padel
        </span>
        <span className="h-3.5 w-px shrink-0 bg-hairline" aria-hidden="true" />
        <SurfaceMark surface="padel" />
        <span className="inline-flex items-center gap-1.5 text-sm text-ink-soft">
          <IndoorIcon size={16} />
          Indoor
        </span>
        <span className="ml-auto">
          <Chip tone="live">1 spot left</Chip>
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-baseline gap-3">
          <p className="num text-[1.75rem] leading-none font-medium tracking-tight text-ink">18:30</p>
          <p className="text-sm text-ink-soft">
            <span className="font-medium text-ink">Tuesday</span>
            <span className="text-ink-faint"> · 90 min</span>
          </p>
        </div>

        <div>
          <p className="font-display text-[1.0625rem] leading-snug font-medium text-ink">
            Padel Club Ripamonti
          </p>
          <p className="mt-1 inline-flex items-start gap-1.5 text-sm text-ink-soft">
            <PinIcon size={15} className="mt-0.5 shrink-0 text-ink-faint" />
            <span>
              Ripamonti<span className="text-ink-faint"> · 12 min by tram 24 from Bocconi</span>
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-field bg-paper px-3 py-2.5">
          <LevelMeter min={2} max={3} />
          <span className="num text-sm font-medium text-ink">€9 each</span>
        </div>

        <div className="flex gap-3">
          <ExampleAvatar person={EXAMPLE.host} size={30} />
          <p className="text-sm leading-relaxed text-ink-soft">
            <span className="font-medium text-ink">{EXAMPLE.host.name}</span>{" "}
            <span className="text-ink-faint">hosting</span>
            <br />
            &ldquo;Relaxed game. Two of us started this term, so genuinely no pressure on
            level.&rdquo;
          </p>
        </div>

        <p className="text-xs text-ink-faint">Host brings: balls, two spare racquets</p>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-hairline pt-4">
          <span className="flex items-center gap-2.5">
            <span className="inline-flex items-center">
              {[EXAMPLE.host, ...EXAMPLE.players].map((p, i) => (
                <span key={p.initials} style={{ marginLeft: i === 0 ? 0 : -8.4 }}>
                  <ExampleAvatar person={p} size={30} ring />
                </span>
              ))}
              <span
                className="inline-block h-[30px] w-[30px] rounded-full border border-dashed border-edge bg-paper ring-2 ring-surface"
                style={{ marginLeft: -8.4 }}
                aria-hidden="true"
              />
            </span>
            <span className="num text-xs text-ink-faint">3/4</span>
          </span>
          <Link href="/signup" className={buttonClasses("primary", "md")}>
            Join game
          </Link>
        </div>
      </div>
    </Card>
  );
}

/**
 * An avatar for the invented people above.
 *
 * Separate from the real `Avatar` component because that one takes a database
 * row. Same rule applies: initials on a tint, never a photograph, and the tints
 * are the measured ones that carry ink at better than 14:1.
 */
function ExampleAvatar({
  person,
  size = 30,
  ring = false,
}: {
  person: { name: string; initials: string; tint: string };
  size?: number;
  ring?: boolean;
}) {
  return (
    <span
      className={cn(
        "num inline-flex shrink-0 items-center justify-center rounded-full font-medium text-ink",
        ring && "ring-2 ring-surface",
      )}
      style={{ width: size, height: size, backgroundColor: person.tint, fontSize: Math.max(10, size * 0.34) }}
      title={person.name}
    >
      <span aria-hidden="true">{person.initials}</span>
      <span className="sr-only">{person.name}</span>
    </span>
  );
}

/* ══ The ask ════════════════════════════════════════════════════════════════ */

function TheAsk() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
      <Rule />
      <div className="grid gap-12 pt-16 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <div>
          <Eyebrow>Why this exists</Eyebrow>
          <h2 className="mt-4 font-display text-3xl leading-[1.12] font-semibold tracking-[-0.025em] text-ink sm:text-[2.5rem]">
            You are already in the group chat. That is the problem.
          </h2>
          <p className="mt-5 text-[1.0625rem] leading-relaxed text-ink-soft">
            There is no shortage of people at Bocconi who want to play. There is a shortage of anyone
            willing to be the one who asks. So the message either never gets sent, or it gets sent
            and sits there, and the plan dies from lack of coordination, not lack of interest.
          </p>

          <ul className="mt-8 flex flex-col gap-4">
            {[
              "Four hundred people, and no idea which of them plays, or how well.",
              "Nobody wants to be the one who asks and gets left on read.",
              "And if somebody does reply, you still don’t know the level, the court, or the cost.",
            ].map((line) => (
              <li key={line} className="flex gap-3 text-[0.9375rem] leading-relaxed text-ink-soft">
                <span
                  className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-danger"
                  aria-hidden="true"
                />
                {line}
              </li>
            ))}
          </ul>
        </div>

        {/* The comparison, shown rather than argued. No brand is imitated: this is
            a generic group chat, because the point is the silence, not the app it
            happened in. */}
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col">
            <p className="label mb-2.5 text-[0.6875rem] text-ink-faint">The usual way</p>
            <Card className="flex flex-1 flex-col gap-3 p-4">
              <p className="text-xs font-medium text-ink-faint">A sports group chat</p>
              <div className="rounded-card rounded-br-sm bg-sunk px-3 py-2 text-[0.8125rem] leading-relaxed text-ink">
                anyone for padel thursday??
              </div>
              <p className="text-right text-[0.625rem] text-ink-faint">You</p>
              <div className="mt-auto flex flex-col items-center gap-1 py-6 text-center">
                <p className="label text-[0.625rem] text-ink-faint">No replies</p>
                <p className="text-xs text-ink-faint">Read by everyone</p>
              </div>
            </Card>
          </div>

          <div className="flex flex-col">
            <p className="label mb-2.5 text-[0.6875rem] text-court-text">With Deuce</p>
            {/* The same Thursday, answered. Example games, captioned as such
                under the pair. */}
            <Card className="flex flex-1 flex-col gap-3 overflow-hidden p-4 pt-0">
              <span className="-mx-4 h-1.5 bg-court" aria-hidden="true" />
              <p className="text-xs font-medium text-ink-faint">Thursday, near campus</p>
              {[
                { sport: "padel" as const, area: "Famagosta", level: "3 to 4", time: "21:00" },
                { sport: "tennis" as const, area: "On campus", level: "1 to 2", time: "20:00" },
                { sport: "padel" as const, area: "Ripamonti", level: "2 to 3", time: "18:30" },
              ].map((g) => (
                <div
                  key={g.area + g.time}
                  className="flex items-center gap-2.5 rounded-field bg-paper px-3 py-2.5"
                >
                  {g.sport === "tennis" ? (
                    <TennisIcon size={16} className="shrink-0 text-ink-soft" />
                  ) : (
                    <PadelIcon size={16} className="shrink-0 text-ink-soft" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.8125rem] leading-tight text-ink">
                      {g.area}
                    </span>
                    <span className="num block text-[0.6875rem] text-ink-faint">
                      Level {g.level}
                    </span>
                  </span>
                  <span className="num shrink-0 text-xs text-ink-faint">{g.time}</span>
                </div>
              ))}
              <p className="mt-auto pt-2 text-center text-xs leading-relaxed text-ink-soft">
                Nothing to ask. <span className="font-medium text-ink">Press join.</span>
              </p>
            </Card>
          </div>
        </div>

        <p className="mt-4 text-right text-[0.6875rem] text-ink-faint">
          Both examples. Deuce is new at Bocconi and would rather say so.
        </p>
      </div>
    </section>
  );
}

/* ══ How it works ═══════════════════════════════════════════════════════════ */

const STEPS = [
  {
    n: "01",
    title: "Prove you are at Bocconi",
    body: "One link sent to your @studbocconi.it or @unibocconi.it address. There is no password to invent, and that single check is what makes everyone else on Deuce a fellow student rather than a stranger from the internet.",
  },
  {
    n: "02",
    title: "Find a game you fit",
    body: "Filter by sport, surface, level, and what it costs. Every game shows its level range in plain words, so you never have to guess whether you are good enough.",
  },
  {
    n: "03",
    title: "Turn up and play",
    body: "Joining opens the game thread: where the court is, which entrance, who is bringing balls. Afterwards everyone rates everyone, and that record follows you.",
  },
];

function HowItWorks() {
  return (
    <section id="how" className="relative scroll-mt-20 overflow-hidden bg-band py-20 sm:py-24">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex justify-center text-on-band opacity-[0.11]"
      >
        <svg
          viewBox="0 0 400 240"
          className="h-full w-[130%] max-w-none"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.1"
        >
          <rect x="30" y="16" width="340" height="208" />
          <rect x="30" y="58" width="340" height="124" />
          <path d="M30 120h340M110 58v124M290 58v124M200 16v30M200 194v30" />
        </svg>
      </div>

      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <p className="label text-[0.6875rem] text-on-band-soft">How it works</p>
        <h2 className="mt-4 max-w-2xl font-display text-3xl leading-[1.12] font-semibold tracking-[-0.025em] text-on-band sm:text-[2.5rem]">
          Three steps, and none of them is sending a message to a stranger.
        </h2>

        {/*
          A SEQUENCE, not three boxes side by side.
          These steps happen in order and they are not interchangeable, so they
          are drawn as an ordered list running down the page with the numbers
          doing the work. Three equal icon tiles in a row would say the opposite.
        */}
        <ol className="mt-14 flex flex-col divide-y divide-band-2 border-t border-band-2">
          {STEPS.map((s) => (
            <li key={s.n} className="grid gap-x-6 gap-y-3 py-8 md:grid-cols-[auto_18rem_1fr] md:items-baseline">
              <span className="num text-2xl leading-none font-medium text-court">{s.n}</span>
              <h3 className="font-display text-xl leading-snug font-medium tracking-[-0.015em] text-on-band">
                {s.title}
              </h3>
              <p className="max-w-xl text-[0.9375rem] leading-relaxed text-on-band-soft">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ══ Inside ═════════════════════════════════════════════════════════════════ */

function Inside() {
  return (
    <section id="inside" className="scroll-mt-20 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="max-w-2xl">
          <Eyebrow>What you get</Eyebrow>
          <h2 className="mt-4 font-display text-3xl leading-[1.12] font-semibold tracking-[-0.025em] text-ink sm:text-[2.5rem]">
            Everything you would have had to ask for, on the card.
          </h2>
        </div>

        <div className="mt-14 grid gap-10 lg:grid-cols-[1fr_1.15fr] lg:gap-14">
          <div>
            <h3 className="font-display text-xl font-medium tracking-[-0.015em] text-ink">
              A level scale you can actually place yourself on
            </h3>
            <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-ink-soft">
              Not a rating you have never been given. Five descriptions, and you pick the one that
              sounds like you. Games show the range they want, so nobody arrives to a mismatch, and
              Deuce will not let you join a game outside your range by accident.
            </p>

            <ol className="mt-7 flex flex-col divide-y divide-hairline overflow-hidden rounded-card border border-hairline bg-surface">
              {LEVELS.map((l) => (
                <li key={l.value} className="flex items-start gap-4 px-4 py-3.5">
                  <span className="num mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-court text-sm font-semibold text-on-court">
                    {l.value}
                  </span>
                  <span>
                    <span className="text-sm font-medium text-ink">{l.name}</span>
                    <span className="block text-[0.8125rem] leading-relaxed text-ink-soft">
                      {l.tell}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <div>
            <h3 className="font-display text-xl font-medium tracking-[-0.015em] text-ink">
              And a record that says who you are playing with
            </h3>
            <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-ink-soft">
              Games played, rating from the people who played them, how often they turned up, and
              every missed game and report. Two of those five numbers can only go the wrong way, which is
              exactly why the other three are worth anything.
            </p>

            {/* An example profile, carrying the five numbers a real one carries.
                Captioned as an example directly underneath. */}
            <Card className="mt-7 p-5">
              <div className="flex items-start gap-3.5">
                <ExampleAvatar person={{ name: "Elena K.", initials: "EK", tint: "#E6F1F0" }} size={48} />
                <div className="min-w-0 flex-1">
                  <p className="font-display text-lg leading-tight font-medium text-ink">Elena K.</p>
                  <p className="mt-0.5 text-sm text-ink-soft">
                    MSc Data Science <span className="text-ink-faint">· 1st year</span>
                  </p>
                  <p className="mt-1 text-xs text-ink-faint">Speaks German, English, Italian</p>
                </div>
                <span className="hidden shrink-0 gap-1.5 sm:flex">
                  <Chip>
                    <TennisIcon size={13} />
                    Tennis <span className="num">3</span>
                  </Chip>
                </span>
              </div>

              <div className="mt-4 flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="w-14 shrink-0 text-xs text-ink-faint">Tennis</span>
                  <LevelMeter min={3} max={3} />
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="w-14 shrink-0 text-xs text-ink-faint">Padel</span>
                  <LevelMeter min={2} max={2} />
                </div>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-ink-soft">
                &ldquo;I host most weeks. If you are new and nervous about the level, say so in the
                thread. It is genuinely fine.&rdquo;
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
                {[
                  { v: "4.6", l: "Rating · 21 games rated" },
                  { v: "25", l: "Games played" },
                  { v: "100%", l: "Turned up" },
                  { v: "0", l: "Missed games" },
                  { v: "0", l: "Reports" },
                ].map((t) => (
                  <div key={t.l} className="rounded-field bg-paper px-3 py-2.5">
                    <p className="num text-lg leading-none font-medium text-ink">{t.v}</p>
                    <p className="mt-1.5 text-xs leading-tight text-ink-faint">{t.l}</p>
                  </div>
                ))}
              </div>

              <p className="mt-4 border-t border-hairline pt-4 text-xs leading-relaxed text-ink-faint">
                An example profile. Two of those five numbers can only go the wrong way, which is
                exactly why the other three are worth reading, and nobody can edit any of them.
              </p>
            </Card>
          </div>
        </div>

        <div className="mt-16 grid gap-10 lg:grid-cols-[1fr_1.05fr] lg:gap-14">
          <div className="lg:pt-4">
            <h3 className="font-display text-xl font-medium tracking-[-0.015em] text-ink">
              And a thread for the game, not a number for a stranger
            </h3>
            <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-ink-soft">
              Joining opens the conversation. It exists for that one game, everyone in it is verified
              and going to the same court, and it closes a day afterwards. No phone numbers change
              hands. There are no direct messages on Deuce at all.
            </p>

            <ul className="mt-6 flex flex-col gap-2.5">
              {[
                "Filter the week by sport, surface, level and availability",
                "Every game names its court, its surface and what it costs",
                "Report any player from the game itself, in two taps",
              ].map((l) => (
                <li key={l} className="flex items-start gap-2.5 text-sm text-ink-soft">
                  <CheckIcon size={15} className="mt-0.5 shrink-0 text-court-text" />
                  {l}
                </li>
              ))}
            </ul>

            <Link href="/signup" className={buttonClasses("primary", "lg", "mt-8")}>
              Create your account
              <ArrowRightIcon size={17} />
            </Link>
          </div>

          <ExampleThread />
        </div>
      </div>
    </section>
  );
}

/**
 * AN EXAMPLE GAME THREAD.
 *
 * The conversation is invented and captioned as invented. It is here because the
 * thread is the part of Deuce that is hardest to describe and easiest to show:
 * the argument is not "we have chat", it is that the awkward part is over before
 * anybody arrives at the court.
 *
 * The lines were chosen to carry the three rules without stating them. Somebody
 * says which entrance, because that is what a thread is actually for. Somebody
 * admits they are new, and is told it is fine, because that exchange is the
 * whole product. Nobody swaps a phone number, because they cannot.
 */
function ExampleThread() {
  const lines = [
    {
      kind: "system" as const,
      text: "This thread opened when the game filled. It closes 24 hours after you play.",
    },
    {
      who: EXAMPLE.host,
      text: "Court 3 is booked. It is the entrance on the left, not the big gate. Everyone gets that wrong the first time.",
      time: "16:02",
    },
    {
      who: EXAMPLE.players[0],
      text: "First padel game ever for me, so apologies in advance.",
      time: "16:09",
    },
    {
      who: EXAMPLE.players[1],
      text: "I was exactly this in October. You will be fine, honestly. Tomás brings spare racquets too.",
      time: "16:11",
    },
    {
      who: { name: "You", initials: "YT", tint: "#FCF0DC" },
      text: "Taking the 24 from Bocconi at 18:05 if anyone wants to go together?",
      time: "16:20",
      mine: true,
    },
  ];

  return (
    <div>
      <div className="flex flex-col overflow-hidden rounded-shell border border-hairline bg-surface shadow-lift-1">
        <div className="flex items-center gap-3 border-b border-hairline bg-paper px-4 py-3">
          <span
            className="inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[6px] bg-court"
            aria-hidden="true"
          >
            <span className="h-[11px] w-[2px] rounded-full bg-on-court opacity-45" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">Padel · Ripamonti · Tue 18:30</p>
            <p className="truncate text-xs text-ink-faint">4 players · verified Bocconi students</p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-live-wash px-2 py-1 text-[0.6875rem] font-medium text-live">
            <LockIcon size={11} />
            Game only
          </span>
        </div>

        <ol className="flex flex-col gap-3 p-4">
          {lines.map((line, i) =>
            "kind" in line ? (
              <li
                key={i}
                className="py-0.5 text-center text-[0.6875rem] leading-relaxed text-ink-faint"
              >
                {line.text}
              </li>
            ) : (
              <li key={i} className={cn("flex items-end gap-2", line.mine && "flex-row-reverse")}>
                <ExampleAvatar person={line.who} size={26} />
                <div className={cn("max-w-[78%]", line.mine && "text-right")}>
                  <p
                    className={cn(
                      "rounded-card px-3 py-2 text-[0.8125rem] leading-relaxed",
                      line.mine
                        ? "rounded-br-sm bg-band text-on-band"
                        : "rounded-bl-sm bg-paper text-ink",
                    )}
                  >
                    {line.text}
                  </p>
                  <p className="num mt-1 px-1 text-[0.625rem] text-ink-faint">
                    {line.who.name.split(" ")[0]} · {line.time}
                  </p>
                </div>
              </li>
            ),
          )}
        </ol>

        {/* Clearly a picture of a composer: no input to focus, and no placeholder
            inviting a stranger to type into a dead box. */}
        <div className="mt-auto flex items-center gap-2 border-t border-hairline bg-paper px-4 py-3">
          <span className="flex-1 rounded-full border border-hairline bg-surface px-3.5 py-2 text-[0.8125rem] text-ink-faint">
            Message the game
          </span>
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sunk text-ink-faint">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
              <path d="M3.2 20.4 21 12 3.2 3.6 3.2 10.2 15 12 3.2 13.8Z" />
            </svg>
          </span>
        </div>
      </div>

      <p className="mt-3 text-center text-[0.6875rem] text-ink-faint">
        An example thread. Yours opens the moment you join a game.
      </p>
    </div>
  );
}

/* ══ For you ════════════════════════════════════════════════════════════════ */

const AUDIENCES = [
  {
    tag: "Just arrived",
    title: "You landed in Milan three weeks ago.",
    body: "You are in four group chats full of names you do not recognise, and every one of them is a wall you would have to introduce yourself to. On Deuce the introduction has already happened: the game is posted, the level is written down, and joining is a button rather than a sentence you have to compose.",
    lines: [
      "See who speaks your language before you commit",
      "Games near campus, with the tram that gets you there",
      "One semester is enough time, so start this week",
    ],
  },
  {
    tag: "Been here a while",
    title: "You have been here three years and still play alone.",
    body: "The people who would be good company are the ones you never had a reason to talk to. A court is the reason. Ninety minutes of tennis does more for knowing somebody than a term of sitting near them in a lecture hall, and you never have to make conversation to start it.",
    lines: [
      "Filter to your level and stop playing down",
      "Regulars become regulars, and the same names come back",
      "Host your own once you know how it works",
    ],
  },
];

function ForYou() {
  return (
    <section className="bg-sunk py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Eyebrow>Who it is for</Eyebrow>
        <h2 className="mt-4 max-w-2xl font-display text-3xl leading-[1.12] font-semibold tracking-[-0.025em] text-ink sm:text-[2.5rem]">
          Two people, and the same obstacle.
        </h2>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {AUDIENCES.map((a) => (
            <Card key={a.tag} className="flex flex-col p-7">
              {/* The tag used to be a pill sitting above the heading. It is a
                  label for the heading, so it is set as one rather than as a
                  badge. */}
              <p className="label text-[0.6875rem] text-ink-faint">{a.tag}</p>
              <h3 className="mt-3 font-display text-xl leading-snug font-medium tracking-[-0.015em] text-ink">
                {a.title}
              </h3>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-soft">{a.body}</p>
              <ul className="mt-6 flex flex-col gap-2.5">
                {a.lines.map((l) => (
                  <li key={l} className="flex items-start gap-2.5 text-sm text-ink-soft">
                    <CheckIcon size={15} className="mt-0.5 shrink-0 text-court-text" />
                    {l}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══ Safety ═════════════════════════════════════════════════════════════════ */

const SAFETY = [
  {
    icon: <ShieldIcon size={20} />,
    title: "Bocconi mailboxes only",
    body: "Every account is verified against @studbocconi.it or @unibocconi.it. Not a claim in a profile, but a link clicked in a mailbox only a Bocconi member can open. The database refuses any other address outright.",
  },
  {
    icon: <UsersIcon size={20} />,
    title: "Everyone carries a record",
    body: "Games played, rating, reliability, missed games and reports, all visible before you join. Somebody with no history shows as new, plainly, rather than as perfect.",
  },
  {
    icon: <LockIcon size={20} />,
    title: "No direct messages, ever",
    body: "Conversation belongs to a game and closes a day after it. Nobody gets your number, and nobody can open a private channel to you out of a feed. There is no direct message feature to abuse.",
  },
  {
    icon: <MessageIcon size={20} />,
    title: "Report in two taps",
    body: "Any player, any game, from the game itself. Reports go to student moderators, and a report only appears on somebody's public record once a moderator has agreed with it.",
  },
];

function Safety() {
  return (
    <section id="safety" className="scroll-mt-20 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="max-w-2xl">
          <Eyebrow>Safety</Eyebrow>
          <h2 className="mt-4 font-display text-3xl leading-[1.12] font-semibold tracking-[-0.025em] text-ink sm:text-[2.5rem]">
            You are meeting a stranger at a court. We take that seriously.
          </h2>
          <p className="mt-5 text-[1.0625rem] leading-relaxed text-ink-soft">
            Everything below is a rule the product enforces, not a promise in a paragraph. If Deuce
            cannot enforce it, it is not on this list.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {SAFETY.map((s) => (
            <Card key={s.title} className="p-6">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-court text-on-court">
                {s.icon}
              </span>
              <h3 className="mt-4 font-display text-lg font-medium tracking-[-0.015em] text-ink">
                {s.title}
              </h3>
              <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-soft">{s.body}</p>
            </Card>
          ))}
        </div>

        <Card id="privacy" className="mt-6 scroll-mt-20 p-6">
          <h3 className="font-display text-lg font-medium tracking-[-0.015em] text-ink">
            What Deuce stores, and what it shows
          </h3>
          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            <div>
              <p className="label text-[0.6875rem] text-ink-faint">Other players see</p>
              <ul className="mt-3 flex flex-col gap-2 text-sm text-ink-soft">
                {[
                  "Your first name and last initial",
                  "Your level, sports and languages",
                  "Your record: games, rating, reliability, reports",
                  "Your programme and year, broadly",
                ].map((x) => (
                  <li key={x} className="flex items-start gap-2.5">
                    <CheckIcon size={15} className="mt-0.5 shrink-0 text-court-text" />
                    {x}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="label text-[0.6875rem] text-ink-faint">Nobody sees</p>
              <ul className="mt-3 flex flex-col gap-2 text-sm text-ink-soft">
                {[
                  "Your email address",
                  "Your surname, photo or phone number",
                  "Your timetable, course codes or student number",
                  "Anything at all before you have an account",
                ].map((x) => (
                  <li key={x} className="flex items-start gap-2.5">
                    <span
                      className="mt-[0.4rem] h-1.5 w-1.5 shrink-0 rounded-full bg-ink-faint"
                      aria-hidden="true"
                    />
                    {x}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-5 text-xs leading-relaxed text-ink-faint">
            Deuce holds no photographs of anybody, anywhere. An avatar is your initials on a colour.
          </p>
        </Card>
      </div>
    </section>
  );
}

/* ══ FAQ ════════════════════════════════════════════════════════════════════ */

const FAQS = [
  {
    q: "What does it cost?",
    a: "Deuce is free and takes no cut. You split the court fee with the people you play, which is usually €8 to €13 each depending on the venue and the hour. Every game shows its own number before you join.",
  },
  {
    q: "I am genuinely bad. Is this for me?",
    a: "Yes, and the level scale exists precisely so you do not have to guess. Level 1 is “you have barely held a racquet”. Games say which levels they want, and plenty of them are hosted by people who started three months ago.",
  },
  {
    q: "I do not own a racquet.",
    a: "Most hosts bring a spare and the card says so before you join, so look for “host brings”. Padel racquets in particular are almost always available at the club.",
  },
  {
    q: "Do I have to book the court?",
    a: "Only if you host. Joining a game means the court is already booked and you turn up and pay your share. Hosting is one screen, and you can do it from your first week.",
  },
  {
    q: "Is there a password?",
    a: "No. You sign in with a link sent to your Bocconi address, or a code from the same email. That is also how Deuce knows you are at Bocconi, which is why there is no password to lose.",
  },
  {
    q: "Is it only for exchange students?",
    a: "No. It is for anyone with a Bocconi mailbox: exchange, undergraduate, master’s, PhD and staff. Exchange students tend to arrive first because they have the least time to waste.",
  },
  {
    q: "What if somebody does not turn up?",
    a: "The host marks it, and it goes on that player’s record permanently. Reliability is public on every profile, which is the main reason people turn up.",
  },
  {
    q: "Can I delete my account?",
    a: "Yes, from Settings, and it is immediate and complete rather than a flag that hides you. Your seats, messages and ratings go with it.",
  },
];

function Faq() {
  return (
    <section id="faq" className="scroll-mt-20 bg-sunk py-20 sm:py-24">
      <div className="mx-auto max-w-3xl px-5 sm:px-8">
        <Eyebrow>Questions</Eyebrow>
        <h2 className="mt-4 font-display text-3xl leading-[1.12] font-semibold tracking-[-0.025em] text-ink sm:text-[2.5rem]">
          The ones people actually ask.
        </h2>

        {/* Native <details>: keyboard accessible, announced correctly, and it
            works before a single byte of JavaScript arrives. */}
        <div className="mt-10 flex flex-col divide-y divide-hairline border-y border-hairline">
          {FAQS.map((f) => (
            <details key={f.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left">
                <span className="font-display text-[1.0625rem] font-medium text-ink">{f.q}</span>
                <span
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sunk text-ink-soft transition-transform group-open:rotate-45"
                  aria-hidden="true"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="15"
                    height="15"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                  >
                    <path d="M12 5.5v13M5.5 12h13" />
                  </svg>
                </span>
              </summary>
              <p className="mt-3 max-w-2xl pr-10 text-[0.9375rem] leading-relaxed text-ink-soft">
                {f.a}
              </p>
            </details>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center gap-4 text-center">
          <p className="text-[0.9375rem] text-ink-soft">Still reading? That is a yes.</p>
          <Link href="/signup" className={buttonClasses("primary", "lg")}>
            Create your account
            <ArrowRightIcon size={17} />
          </Link>
        </div>
      </div>
    </section>
  );
}
