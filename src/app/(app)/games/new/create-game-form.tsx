"use client";

import { useActionState, useId, useMemo, useRef, useState } from "react";

import { ArrowRightIcon, IndoorIcon, PadelIcon, SunIcon, TennisIcon } from "@/components/brand/icons";
import { LevelMeter } from "@/components/game/level-meter";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/pieces";
import { Field, FormError, inputClasses, textareaClasses } from "@/components/ui/field";
import { createGame, createVenue, type ActionState } from "@/lib/actions/games";
import type { Venue } from "@/lib/data/games";
import { LEVELS, sportLabel, sportsPlayed, type SportId, type SportLevels } from "@/lib/game/level";
import { roofForGame, roofLabel } from "@/lib/game/roof";
import { cn } from "@/lib/cn";

/**
 * POSTING A GAME.
 *
 * The constraint on this product is supply: a feed with no games in it is the only
 * way Deuce fails. So this form is built to be finished, not to be comprehensive —
 * one screen, sensible defaults for everything, and the two fields that actually
 * need thought (the level range and the note) given room.
 *
 * THE SPORT DRIVES THE REST. Choosing padel sets the surface to turf and the seats
 * to four, because that is the only shape padel comes in — the database has check
 * constraints saying exactly that, and a form that lets you violate them only to
 * report an error afterwards is a worse form.
 *
 * COURTS CAN BE ADDED HERE. The curated list will never be complete, and a host who
 * cannot name their court cannot post their game. An added court is marked
 * unverified everywhere it appears.
 */

const PROVIDES = ["Balls", "A spare racquet", "Two spare racquets", "Water", "Bibs"];

export function CreateGameForm({
  venues,
  myLevels,
  defaultStart,
}: {
  venues: Venue[];
  /** The host's own level in each sport. See the note on hosting below. */
  myLevels: SportLevels;
  /** Tomorrow at 18:00 Milan time, worked out on the server. See format.ts. */
  defaultStart: string;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createGame, {});

  /**
   * Only the sports the host actually plays.
   *
   * A host is seated in their own game automatically, which skips the level
   * check that joining goes through — so hosting a sport you have no level for
   * would put somebody in a game they have no standing in. The database refuses
   * it outright; this just means the form never offers it. Onboarding requires a
   * level for at least one sport, so this list is never empty.
   */
  const playable = sportsPlayed(myLevels);
  const firstPlayable: SportId = playable[0] ?? "padel";

  const [sport, setSport] = useState<SportId>(firstPlayable);
  const myLevelFor = (s: SportId) => (s === "tennis" ? myLevels.tennis_level : myLevels.padel_level) ?? 3;

  const [surface, setSurface] = useState<"clay" | "hard" | "padel" | "grass">(
    firstPlayable === "padel" ? "padel" : "clay",
  );
  const [spots, setSpots] = useState(firstPlayable === "padel" ? 4 : 2);
  const [indoor, setIndoor] = useState(firstPlayable === "padel");
  const [venueId, setVenueId] = useState("");
  const [levelMin, setLevelMin] = useState(Math.max(1, myLevelFor(firstPlayable) - 1));
  const [levelMax, setLevelMax] = useState(Math.min(5, myLevelFor(firstPlayable) + 1));
  const [provides, setProvides] = useState<string[]>(["Balls"]);
  const [addingVenue, setAddingVenue] = useState(false);

  const ids = useId();
  const errors = state.errors ?? {};

  /**
   * The start date, read rather than held in state.
   *
   * Whether a court has a roof over it depends on the month: most Milan clay
   * clubs are domed from October to April. So picking a court has to know which
   * day the host chose, and changing the day has to revisit the roof. A ref does
   * that without making this input controlled, which is what broke it the last
   * time React 19 reset the form after an action.
   */
  const whenRef = useRef<HTMLInputElement>(null);

  /** Only courts whose surface can host the chosen sport. */
  const eligibleVenues = useMemo(
    () =>
      venues.filter((v) =>
        sport === "padel" ? v.surface === "padel" : v.surface !== "padel",
      ),
    [venues, sport],
  );

  function chooseSport(next: SportId) {
    setSport(next);
    setVenueId("");
    // The level range follows the sport, because the host's own standard is
    // different in each and a range centred on the wrong one is a bad default.
    setLevelMin(Math.max(1, myLevelFor(next) - 1));
    setLevelMax(Math.min(5, myLevelFor(next) + 1));
    if (next === "padel") {
      setSurface("padel");
      setSpots(4);
      setIndoor(true);
    } else {
      setSurface("clay");
      setIndoor(false);
    }
  }

  function chooseVenue(id: string) {
    setVenueId(id);
    const v = venues.find((x) => x.id === id);
    if (v) {
      // The court knows its own surface, and the court plus the date knows the
      // roof. Copying both saves two questions and removes the commonest way to
      // post a wrong game. The host can still override the roof below.
      setSurface(v.surface);
      setIndoor(roofForGame(v, whenRef.current?.value));
    }
  }

  /** A court domed only in winter changes answer when the host changes the day. */
  function chooseWhen(value: string) {
    const v = venues.find((x) => x.id === venueId);
    if (v) setIndoor(roofForGame(v, value));
  }

  if (addingVenue) {
    return <AddVenueForm onDone={() => setAddingVenue(false)} />;
  }

  return (
    <form action={action}>
      <FormError>{errors.form}</FormError>

      <input type="hidden" name="sport" value={sport} />
      <input type="hidden" name="surface" value={surface} />
      <input type="hidden" name="spots" value={spots} />
      <input type="hidden" name="venueId" value={venueId} />
      <input type="hidden" name="levelMin" value={levelMin} />
      <input type="hidden" name="levelMax" value={levelMax} />
      {indoor ? <input type="hidden" name="indoor" value="on" /> : null}
      {provides.map((p) => (
        <input key={p} type="hidden" name="provides" value={p} />
      ))}

      <div className="flex flex-col gap-6">
        {/* ── Sport ───────────────────────────────────────────────────────── */}
        <Card className="p-5">
          <fieldset>
            <legend className="text-sm font-medium text-ink">What are you playing?</legend>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {(
                [
                  { id: "tennis" as const, label: "Tennis", icon: <TennisIcon size={22} /> },
                  { id: "padel" as const, label: "Padel", icon: <PadelIcon size={22} /> },
                ] as const
              )
                .filter((s) => playable.includes(s.id))
                .map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => chooseSport(s.id)}
                  aria-pressed={sport === s.id}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-card border-2 px-4 py-5 transition-colors",
                    sport === s.id
                      ? "border-court-text bg-court-wash text-court-text"
                      : "border-hairline bg-surface text-ink-soft hover:border-edge",
                  )}
                >
                  {s.icon}
                  <span className="text-sm font-medium">{s.label}</span>
                </button>
              ))}
            </div>
            {playable.length === 1 ? (
              <p className="mt-3 text-sm leading-relaxed text-ink-faint">
                You have only set a {sportLabel(firstPlayable).toLowerCase()} level.{" "}
                <a href="/profile" className="font-medium text-court-text underline underline-offset-4">
                  Add the other on your profile
                </a>{" "}
                if you want to host both.
              </p>
            ) : null}
          </fieldset>

          <fieldset className="mt-6">
            <legend className="text-sm font-medium text-ink">How many players in total?</legend>
            <p className="mt-1 text-sm text-ink-faint">
              {sport === "padel"
                ? "Padel is always four, including you."
                : "Two for singles, four for doubles. Including you."}
            </p>
            <div className="mt-3 flex gap-2">
              {[2, 4].map((n) => {
                const allowed = sport === "tennis" || n === 4;
                return (
                  <button
                    key={n}
                    type="button"
                    disabled={!allowed}
                    onClick={() => setSpots(n)}
                    aria-pressed={spots === n}
                    className={cn(
                      "rounded-full border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-40",
                      spots === n
                        ? "border-court-text bg-court text-on-court"
                        : "border-hairline bg-surface text-ink-soft hover:border-edge",
                    )}
                  >
                    <span className="num">{n}</span> players
                  </button>
                );
              })}
            </div>
            {errors.spots ? (
              <p role="alert" className="mt-2 text-sm text-danger">
                {errors.spots}
              </p>
            ) : null}
          </fieldset>
        </Card>

        {/* ── Court ───────────────────────────────────────────────────────── */}
        <Card className="p-5">
          <Field
            id={`${ids}-venue`}
            label="Which court?"
            error={errors.venueId}
            hint="Pick the club. The surface and the roof come with it, worked out for the day you chose."
          >
            <select
              id={`${ids}-venue`}
              value={venueId}
              onChange={(e) => chooseVenue(e.target.value)}
              className={inputClasses(Boolean(errors.venueId), "appearance-none pr-10")}
            >
              <option value="">Choose a court…</option>
              {eligibleVenues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} · {v.area} · {roofLabel(v)}
                  {v.is_verified ? "" : " (added by a player)"}
                </option>
              ))}
            </select>
          </Field>

          <p className="mt-3 text-sm text-ink-faint">
            Not listed?{" "}
            <button
              type="button"
              onClick={() => setAddingVenue(true)}
              className="rounded font-medium text-court-text underline underline-offset-4"
            >
              Add the court
            </button>
            .
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="text-sm text-ink-soft">
              {indoor ? <IndoorIcon size={16} className="mr-1 inline align-[-3px]" /> : <SunIcon size={16} className="mr-1 inline align-[-3px]" />}
              {indoor ? "Indoor" : "Outdoor"}
            </span>
            <button
              type="button"
              onClick={() => setIndoor((v) => !v)}
              className="rounded-full border border-hairline px-2.5 py-1 text-xs font-medium text-ink-soft hover:border-edge"
            >
              Change
            </button>
            {errors.surface ? (
              <span role="alert" className="text-sm text-danger">
                {errors.surface}
              </span>
            ) : null}
          </div>
        </Card>

        {/* ── When ────────────────────────────────────────────────────────── */}
        <Card className="p-5">
          <div className="grid gap-5 sm:grid-cols-[1.4fr_1fr]">
            <Field
              id={`${ids}-when`}
              label="When?"
              error={errors.startsAt}
              hint="Milan time."
            >
              <input
                id={`${ids}-when`}
                ref={whenRef}
                name="startsAt"
                type="datetime-local"
                defaultValue={defaultStart}
                onChange={(e) => chooseWhen(e.target.value)}
                className={inputClasses(Boolean(errors.startsAt))}
              />
            </Field>

            <Field id={`${ids}-mins`} label="How long?" error={errors.minutes}>
              <select
                id={`${ids}-mins`}
                name="minutes"
                defaultValue={sport === "padel" ? "90" : "60"}
                className={inputClasses(Boolean(errors.minutes), "appearance-none pr-10")}
              >
                {[30, 45, 60, 75, 90, 120, 150, 180].map((m) => (
                  <option key={m} value={m}>
                    {m} minutes
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field
            id={`${ids}-price`}
            label="Cost per player"
            className="mt-5"
            error={errors.priceEuros}
            hint="The court fee split evenly, in euros. Deuce takes no cut, and nothing is paid through Deuce."
          >
            <div className="relative">
              <span className="num absolute top-1/2 left-4 -translate-y-1/2 text-ink-faint">€</span>
              <input
                id={`${ids}-price`}
                name="priceEuros"
                inputMode="decimal"
                defaultValue="9"
                className={inputClasses(Boolean(errors.priceEuros), "num pl-9")}
              />
            </div>
          </Field>
        </Card>

        {/* ── Level ───────────────────────────────────────────────────────── */}
        <Card className="p-5">
          <fieldset>
            <legend className="text-sm font-medium text-ink">Who is this game for?</legend>
            <p className="mt-1 text-sm leading-relaxed text-ink-faint">
              Deuce will not let anybody outside this range join, so a wide range fills faster and a
              narrow one plays better. Your {sportLabel(sport).toLowerCase()} level is{" "}
              {myLevelFor(sport)}.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-4">
              <LevelMeter min={levelMin} max={levelMax} />
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="label text-[0.6875rem] text-ink-faint">Lowest</p>
                <div className="mt-2 flex gap-1.5">
                  {LEVELS.map((l) => (
                    <button
                      key={l.value}
                      type="button"
                      onClick={() => {
                        setLevelMin(l.value);
                        if (l.value > levelMax) setLevelMax(l.value);
                      }}
                      aria-pressed={levelMin === l.value}
                      aria-label={`Lowest level ${l.value}, ${l.name}`}
                      className={cn(
                        "num h-9 w-9 rounded-full border text-sm font-medium transition-colors",
                        levelMin === l.value
                          ? "border-court-text bg-court text-on-court"
                          : "border-hairline bg-surface text-ink-soft hover:border-edge",
                      )}
                    >
                      {l.value}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="label text-[0.6875rem] text-ink-faint">Highest</p>
                <div className="mt-2 flex gap-1.5">
                  {LEVELS.map((l) => (
                    <button
                      key={l.value}
                      type="button"
                      onClick={() => {
                        setLevelMax(l.value);
                        if (l.value < levelMin) setLevelMin(l.value);
                      }}
                      aria-pressed={levelMax === l.value}
                      aria-label={`Highest level ${l.value}, ${l.name}`}
                      className={cn(
                        "num h-9 w-9 rounded-full border text-sm font-medium transition-colors",
                        levelMax === l.value
                          ? "border-court-text bg-court text-on-court"
                          : "border-hairline bg-surface text-ink-soft hover:border-edge",
                      )}
                    >
                      {l.value}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {errors.levelMin ? (
              <p role="alert" className="mt-2 text-sm text-danger">
                {errors.levelMin}
              </p>
            ) : null}
          </fieldset>
        </Card>

        {/* ── The words, and the kit ──────────────────────────────────────── */}
        <Card className="p-5">
          <Field
            id={`${ids}-note`}
            label="Anything the others should know"
            optional
            error={errors.note}
            hint="This is the part that fills the game. “Two of us started this term, so genuinely no pressure on level” works better than anything the interface can say for you."
          >
            <textarea
              id={`${ids}-note`}
              name="note"
              rows={3}
              maxLength={280}
              placeholder="Relaxed game. We usually get food after at the place next door."
              className={textareaClasses(Boolean(errors.note))}
            />
          </Field>

          <fieldset className="mt-5">
            <legend className="text-sm font-medium text-ink">
              What are you bringing?
              <span className="ml-1.5 font-normal text-ink-faint">optional</span>
            </legend>
            <p className="mt-1 text-sm text-ink-faint">
              &ldquo;Host brings a spare racquet&rdquo; is the line that gets a beginner to press join.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {PROVIDES.map((p) => {
                const on = provides.includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() =>
                      setProvides((c) => (on ? c.filter((x) => x !== p) : [...c, p].slice(0, 6)))
                    }
                    aria-pressed={on}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-[0.8125rem] font-medium transition-colors",
                      on
                        ? "border-court-text bg-court text-on-court"
                        : "border-hairline bg-surface text-ink-soft hover:border-edge hover:text-ink",
                    )}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </Card>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button weight="primary" size="lg" type="submit" disabled={pending || !venueId}>
            {pending ? "Posting your game…" : "Post this game"}
            {pending ? null : <ArrowRightIcon size={17} />}
          </Button>
          <p className="text-xs leading-relaxed text-ink-faint">
            You are in it automatically, and you are responsible for the court booking. You can cancel
            it, and everybody gets told.
          </p>
        </div>
      </div>
    </form>
  );
}

/** Adding a court, inline, because the alternative is not posting the game. */
function AddVenueForm({ onDone }: { onDone: () => void }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createVenue, {});
  const ids = useId();
  const errors = state.errors ?? {};

  if (state.ok) {
    return (
      <Card className="p-5">
        <p className="text-sm font-medium text-live">{state.message}</p>
        <button type="button" onClick={onDone} className={buttonClasses("primary", "md", "mt-4")}>
          Back to the game
        </button>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <form action={action}>
        <FormError>{errors.form}</FormError>

        <h2 className="font-display text-xl font-medium tracking-[-0.015em] text-ink">Add a court</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          It will be available to everybody, marked as added by a player until a moderator confirms it.
          Only add courts that really exist.
        </p>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <Field id={`${ids}-name`} label="Club name" error={errors.name}>
            <input
              id={`${ids}-name`}
              name="name"
              maxLength={80}
              placeholder="Canottieri Olona 1894"
              className={inputClasses(Boolean(errors.name))}
            />
          </Field>
          <Field id={`${ids}-area`} label="Area of Milan" error={errors.area}>
            <input
              id={`${ids}-area`}
              name="area"
              maxLength={60}
              placeholder="San Cristoforo"
              className={inputClasses(Boolean(errors.area))}
            />
          </Field>
        </div>

        <Field
          id={`${ids}-address`}
          label="Street address"
          optional
          className="mt-5"
          error={errors.address}
          hint="Optional, and the one thing somebody who has never been cannot work out for themselves."
        >
          <input
            id={`${ids}-address`}
            name="address"
            maxLength={160}
            placeholder="Alzaia Naviglio Grande 146, 20144"
            className={inputClasses(Boolean(errors.address))}
          />
        </Field>

        <Field
          id={`${ids}-travel`}
          label="How do you get there from campus?"
          optional
          className="mt-5"
          error={errors.travel}
          hint="The detail people actually ask for. “2.8 km from campus, about 12 min by bike”."
        >
          <input
            id={`${ids}-travel`}
            name="travel"
            maxLength={120}
            className={inputClasses(Boolean(errors.travel))}
          />
        </Field>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <Field id={`${ids}-surf`} label="Surface" error={errors.surface}>
            <select
              id={`${ids}-surf`}
              name="surface"
              defaultValue="padel"
              className={inputClasses(Boolean(errors.surface), "appearance-none pr-10")}
            >
              <option value="padel">Turf (padel)</option>
              <option value="clay">Clay</option>
              <option value="hard">Hard</option>
              <option value="grass">Grass</option>
            </select>
          </Field>
          <fieldset>
            <legend className="text-sm font-medium text-ink">Is it covered?</legend>
            <p className="mt-1 text-sm text-ink-faint">
              Most Milan clay clubs go under a dome from October to April.
            </p>
            <div className="mt-3 flex flex-col gap-2">
              {(
                [
                  { id: "indoor", label: "Indoors all year" },
                  { id: "winter", label: "Outdoors, covered in winter" },
                  { id: "open", label: "Outdoors all year" },
                ] as const
              ).map((r) => (
                <label
                  key={r.id}
                  className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-soft"
                >
                  <input
                    type="radio"
                    name="roof"
                    value={r.id}
                    defaultChecked={r.id === "indoor"}
                    className="h-[18px] w-[18px] accent-[var(--color-court)]"
                  />
                  {r.label}
                </label>
              ))}
            </div>
            {errors.roof ? (
              <p role="alert" className="mt-2 text-sm text-danger">
                {errors.roof}
              </p>
            ) : null}
          </fieldset>
        </div>

        <div className="mt-6 flex gap-3">
          <Button weight="secondary" size="lg" type="button" disabled={pending} onClick={onDone}>
            Back
          </Button>
          <Button weight="primary" size="lg" type="submit" disabled={pending} className="flex-1">
            {pending ? "Adding…" : "Add the court"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
