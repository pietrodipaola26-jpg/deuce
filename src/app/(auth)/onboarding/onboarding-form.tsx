"use client";

import Link from "next/link";
import { useActionState, useEffect, useId, useRef, useState } from "react";

import { ArrowRightIcon } from "@/components/brand/icons";
import { SportLevelPicker } from "@/components/game/sport-level-picker";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/pieces";
import { Field, FormError, inputClasses, textareaClasses } from "@/components/ui/field";
import { completeOnboarding, type FormState } from "@/lib/actions/profile";
import { cn } from "@/lib/cn";

/**
 * ONBOARDING, in three steps rather than one long form.
 *
 * The split is deliberate. The second question in a sequence is answered far more
 * often than the second field in a wall, and the person has already spent a round
 * trip through their inbox to get here — this is the worst possible moment to show
 * them eleven inputs.
 *
 * It is one `<form>` across all three steps, with the earlier answers kept in the
 * DOM as they were typed. That means the browser holds the state, nothing is lost
 * going back, and the whole thing submits in a single action — no partial profile
 * exists in the database at any point.
 *
 * COMMON LANGUAGES ARE BUTTONS, not a text field. Half this audience arrived in
 * Milan weeks ago and "Speaks Spanish, English" is the detail that decides whether
 * they press join; asking them to type it in a comma-separated list is how you get
 * an empty column.
 */

const COMMON_LANGUAGES = [
  "Italian",
  "English",
  "Spanish",
  "French",
  "German",
  "Portuguese",
  "Chinese",
  "Arabic",
];

type Step = 1 | 2 | 3;

const STEP_LABELS: Record<Step, string> = {
  1: "Your name",
  2: "Your game",
  3: "The rules",
};

export function OnboardingForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(completeOnboarding, {});
  const [step, setStep] = useState<Step>(1);

  const [firstName, setFirstName] = useState("");
  const [lastInitial, setLastInitial] = useState("");
  const [levels, setLevels] = useState<{ tennis: number | null; padel: number | null }>({
    tennis: null,
    padel: null,
  });
  const [languages, setLanguages] = useState<string[]>([]);

  /**
   * Controlled, including the two tick boxes.
   *
   * React resets a form once its action has run, so anything left uncontrolled is
   * wiped the moment a submission comes back with an error — which is exactly
   * when the person needs their answers to still be there. Somebody who forgot to
   * confirm their age should not also lose the bio they just wrote.
   */
  const [programme, setProgramme] = useState("");
  const [studyYear, setStudyYear] = useState("");
  const [bio, setBio] = useState("");
  const [confirmedAge, setConfirmedAge] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  /**
   * Re-asserts the drawn tick boxes from state after every render.
   *
   * React resets a form once its action has run, which clears a checkbox's DOM
   * `checked` directly. React does not know that happened, so if its state still
   * says true it renders no change and the box stays visibly empty while the form
   * submits "on" — the interface telling the person the opposite of what it is
   * about to do.
   *
   * The submitted value comes from the hidden inputs above, which React owns, so
   * this only puts the drawing back in step. Writing to a DOM node is what an
   * effect is for; the forbidden thing is setting state in one, which this does
   * not do.
   */
  const ageBox = useRef<HTMLInputElement>(null);
  const termsBox = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ageBox.current) ageBox.current.checked = confirmedAge;
    if (termsBox.current) termsBox.current.checked = acceptedTerms;
  });

  const ids = useId();
  const errors = state.errors ?? {};

  // Client-side gating only. The action validates everything again, and the
  // database refuses an incomplete profile outright.
  function goToTwo() {
    if (firstName.trim() && /^[A-Za-z]$/.test(lastInitial.trim())) setStep(2);
  }
  function goToThree() {
    // Neither sport is compulsory and at least one is. The action checks this
    // again, and so does the database.
    if (levels.tennis !== null || levels.padel !== null) setStep(3);
  }

  function toggle<T>(list: T[], value: T): T[] {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  }

  return (
    <div>
      <Progress step={step} />

      <Card className="mt-6 p-6 sm:p-8">
        <form action={action}>
          <FormError>{errors.form}</FormError>

          {/* Every answer stays in the form across steps, so going back loses
              nothing and the whole profile is written in one statement. */}
          <input type="hidden" name="firstName" value={firstName} />
          <input type="hidden" name="lastInitial" value={lastInitial} />
          {languages.map((l) => (
            <input key={l} type="hidden" name="languages" value={l} />
          ))}

          {/* ── 1. Who are you ─────────────────────────────────────────────── */}
          <section className={cn(step === 1 ? "block" : "hidden")} aria-hidden={step !== 1}>
            <h2 className="font-display text-2xl font-medium tracking-[-0.02em] text-ink">
              What should other players call you?
            </h2>
            <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-ink-soft">
              You are signed in as <span className="font-medium text-ink">{email}</span>. That address
              is never shown to anybody.
            </p>

            <div className="mt-7 grid gap-5 sm:grid-cols-[1.6fr_1fr]">
              <Field id={`${ids}-first`} label="First name" error={errors.firstName}>
                <input
                  id={`${ids}-first`}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                  maxLength={40}
                  placeholder="Mara"
                  className={inputClasses(Boolean(errors.firstName))}
                />
              </Field>

              <Field
                id={`${ids}-initial`}
                label="Surname initial"
                error={errors.lastInitial}
                hint="One letter."
              >
                <input
                  id={`${ids}-initial`}
                  value={lastInitial}
                  onChange={(e) => setLastInitial(e.target.value.replace(/[^A-Za-z]/g, "").slice(0, 1))}
                  maxLength={1}
                  placeholder="V"
                  className={inputClasses(Boolean(errors.lastInitial), "num uppercase")}
                />
              </Field>
            </div>

            <p className="mt-3 text-sm text-ink-faint">
              You will appear as{" "}
              <span className="font-medium text-ink">
                {firstName.trim() || "Mara"} {(lastInitial || "V").toUpperCase()}.
              </span>{" "}
              Deuce never shows a full surname, and never a photograph.
            </p>

            <button
              type="button"
              onClick={goToTwo}
              disabled={!firstName.trim() || !/^[A-Za-z]$/.test(lastInitial)}
              className={buttonClasses("primary", "lg", "mt-7 w-full")}
            >
              Continue
              <ArrowRightIcon size={17} />
            </button>
          </section>

          {/* ── 2. What do you play ────────────────────────────────────────── */}
          <section className={cn(step === 2 ? "block" : "hidden")} aria-hidden={step !== 2}>
            <h2 className="font-display text-2xl font-medium tracking-[-0.02em] text-ink">
              Tell us about your game
            </h2>
            <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-ink-soft">
              All of this is changeable later, and none of it locks you out of anything.
            </p>

            <fieldset className="mt-7">
              <legend className="text-sm font-medium text-ink">What do you play, and how well?</legend>
              <p className="mt-1 text-sm leading-relaxed text-ink-faint">
                Set a level for each sport you play. They are separate on purpose: almost nobody is
                the same standard at both, and this is what decides which games you can join.
                Be honest rather than modest. It is what stops you being matched into a game you
                will not enjoy.
              </p>
              <div className="mt-4">
                <SportLevelPicker
                  initialTennis={levels.tennis}
                  initialPadel={levels.padel}
                  error={errors.sports ?? errors.tennisLevel ?? errors.padelLevel}
                  onChange={setLevels}
                />
              </div>
            </fieldset>

            <fieldset className="mt-7">
              <legend className="text-sm font-medium text-ink">
                Which languages are you happy playing in?
                <span className="ml-1.5 font-normal text-ink-faint">optional</span>
              </legend>
              <p className="mt-1 text-sm text-ink-faint">
                This is the first thing an exchange student looks for.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {COMMON_LANGUAGES.map((lang) => {
                  const on = languages.includes(lang);
                  return (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setLanguages((c) => (on ? toggle(c, lang) : c.length < 6 ? toggle(c, lang) : c))}
                      aria-pressed={on}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-[0.8125rem] font-medium transition-colors",
                        on
                          ? "border-court-text bg-court text-on-court"
                          : "border-hairline bg-surface text-ink-soft hover:border-edge hover:text-ink",
                      )}
                    >
                      {lang}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="mt-8 flex gap-3">
              <button type="button" onClick={() => setStep(1)} className={buttonClasses("secondary", "lg")}>
                Back
              </button>
              <button
                type="button"
                onClick={goToThree}
                disabled={levels.tennis === null && levels.padel === null}
                className={buttonClasses("primary", "lg", "flex-1")}
              >
                Continue
                <ArrowRightIcon size={17} />
              </button>
            </div>
          </section>

          {/* ── 3. The rules, and the optional colour ──────────────────────── */}
          <section className={cn(step === 3 ? "block" : "hidden")} aria-hidden={step !== 3}>
            <h2 className="font-display text-2xl font-medium tracking-[-0.02em] text-ink">
              One last thing
            </h2>
            <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-ink-soft">
              Two optional details, and the rules everybody plays by.
            </p>

            <div className="mt-7 grid gap-5 sm:grid-cols-2">
              <Field id={`${ids}-prog`} label="Programme" optional error={errors.programme}>
                <input
                  id={`${ids}-prog`}
                  name="programme"
                  value={programme}
                  onChange={(e) => setProgramme(e.target.value)}
                  maxLength={60}
                  placeholder="MSc Finance"
                  className={inputClasses(Boolean(errors.programme))}
                />
              </Field>
              <Field id={`${ids}-year`} label="Year" optional error={errors.studyYear}>
                <input
                  id={`${ids}-year`}
                  name="studyYear"
                  value={studyYear}
                  onChange={(e) => setStudyYear(e.target.value)}
                  maxLength={30}
                  placeholder="2nd year"
                  className={inputClasses(Boolean(errors.studyYear))}
                />
              </Field>
            </div>

            <Field
              id={`${ids}-bio`}
              label="Anything you want people to know"
              optional
              className="mt-5"
              error={errors.bio}
              hint="One or two lines. This is where “I started in October and I am still bad” goes, and it works."
            >
              <textarea
                id={`${ids}-bio`}
                name="bio"
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={280}
                placeholder="Played for a club until I moved. Happy to hit with anyone who wants to rally."
                className={textareaClasses(Boolean(errors.bio))}
              />
            </Field>

            {/*
              TWO BOXES, NEVER ONE, AND NEVER PRE-TICKED.
              Consent has to be a positive act and a specific one: a box that
              arrives ticked is not consent under GDPR art. 4(11), and neither is
              a box that bundles an age declaration together with agreeing to a
              set of rules. Each is recorded with its own timestamp, and both are
              shown back to the member in Settings.
            */}
            <fieldset className="mt-7">
              <legend className="text-sm font-medium text-ink">Before you start</legend>

              {/*
                The VALUE is carried by hidden inputs, and the tick boxes are the
                control that sets them.

                React resets a form once its action has run, which clears a
                checkbox's DOM `checked` without telling React, so a controlled
                box and its own state silently disagree after a failed submit.
                Driving a hidden input from state instead keeps the submitted
                value and the drawn box in step, which is the same approach the
                level picker uses.
              */}
              <input type="hidden" name="confirmedAge" value={confirmedAge ? "on" : ""} />
              <input type="hidden" name="acceptedTerms" value={acceptedTerms ? "on" : ""} />

              <label className="mt-3 flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-ink-soft">
                <input
                  ref={ageBox}
                  type="checkbox"
                  defaultChecked={confirmedAge}
                  onChange={(e) => setConfirmedAge(e.target.checked)}
                  className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-[var(--color-court)]"
                />
                <span>
                  I am <span className="font-medium text-ink">18 or over</span>. Deuce sends people to
                  meet strangers at courts, sometimes late, so it is for adults only.
                </span>
              </label>
              {errors.confirmedAge ? (
                <p role="alert" className="mt-2 text-sm text-danger">
                  {errors.confirmedAge}
                </p>
              ) : null}

              <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-ink-soft">
                <input
                  ref={termsBox}
                  type="checkbox"
                  defaultChecked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-[var(--color-court)]"
                />
                <span>
                  I agree to play by the{" "}
                  <Link
                    href="/legal/community"
                    target="_blank"
                    className="font-medium text-court-text underline underline-offset-4"
                  >
                    community rules
                  </Link>{" "}
                  and the{" "}
                  <Link
                    href="/legal/terms"
                    target="_blank"
                    className="font-medium text-court-text underline underline-offset-4"
                  >
                    terms
                  </Link>
                  : turn up when I say I will, treat other players decently, and accept that missed
                  games and reports go on my record.
                </span>
              </label>
              {errors.acceptedTerms ? (
                <p role="alert" className="mt-2 text-sm text-danger">
                  {errors.acceptedTerms}
                </p>
              ) : null}
            </fieldset>

            <div className="mt-8 flex gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={pending}
                className={buttonClasses("secondary", "lg")}
              >
                Back
              </button>
              <button type="submit" disabled={pending} className={buttonClasses("primary", "lg", "flex-1")}>
                {pending ? "Setting you up…" : "Start playing"}
                {pending ? null : <ArrowRightIcon size={17} />}
              </button>
            </div>
          </section>
        </form>
      </Card>
    </div>
  );
}

function Progress({ step }: { step: Step }) {
  return (
    <ol className="flex items-center gap-2" aria-label={`Step ${step} of 3`}>
      {([1, 2, 3] as const).map((n) => {
        const state = n < step ? "done" : n === step ? "current" : "todo";
        return (
          <li key={n} className="flex flex-1 flex-col gap-2">
            <span
              className={cn(
                "h-1 rounded-full transition-colors",
                state === "todo" ? "bg-hairline" : "bg-court-text",
              )}
              aria-hidden="true"
            />
            <span
              className={cn(
                "label text-[0.6875rem]",
                state === "current" ? "text-court-text" : "text-ink-faint",
              )}
            >
              {STEP_LABELS[n]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
