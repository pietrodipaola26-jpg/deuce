"use client";

import { useActionState, useId, useState } from "react";

import { SportLevelPicker } from "@/components/game/sport-level-picker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/pieces";
import { Field, FormError, inputClasses, textareaClasses } from "@/components/ui/field";
import { updateProfile, type FormState } from "@/lib/actions/profile";
import type { Profile } from "@/lib/auth/session";
import { cn } from "@/lib/cn";

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

/**
 * Editing your profile.
 *
 * The same fields as onboarding, in one screen rather than three — somebody
 * changing their level already knows what they are doing and does not need a wizard.
 *
 * Changing your level does not touch games you are already in. Deuce checks the
 * range when you join, once, and re-evaluating old seats would throw people out of
 * games their host was happy to have them in.
 */
export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateProfile, {});

  const [languages, setLanguages] = useState<string[]>(profile.languages);

  // Controlled for the same reason as onboarding: React resets a form after its
  // action runs, so defaultValue fields lose their contents on a failed save.
  const [firstName, setFirstName] = useState(profile.first_name ?? "");
  const [programme, setProgramme] = useState(profile.programme ?? "");
  const [studyYear, setStudyYear] = useState(profile.study_year ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [lastInitial, setLastInitial] = useState(profile.last_initial ?? "");

  const ids = useId();
  const errors = state.errors ?? {};

  return (
    <form action={action}>
      <FormError>{errors.form}</FormError>

      {state.ok ? (
        <p role="status" className="mb-6 rounded-field bg-live-wash px-4 py-3 text-sm text-live">
          Saved.
        </p>
      ) : null}

      {languages.map((l) => (
        <input key={l} type="hidden" name="languages" value={l} />
      ))}

      <div className="flex flex-col gap-6">
        <Card className="p-5">
          <div className="grid gap-5 sm:grid-cols-[1.6fr_1fr]">
            <Field id={`${ids}-first`} label="First name" error={errors.firstName}>
              <input
                id={`${ids}-first`}
                name="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                maxLength={40}
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
                name="lastInitial"
                value={lastInitial}
                onChange={(e) => setLastInitial(e.target.value.replace(/[^A-Za-z]/g, "").slice(0, 1))}
                maxLength={1}
                className={inputClasses(Boolean(errors.lastInitial), "num uppercase")}
              />
            </Field>
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <Field id={`${ids}-prog`} label="Programme" optional error={errors.programme}>
              <input
                id={`${ids}-prog`}
                name="programme"
                value={programme}
                onChange={(e) => setProgramme(e.target.value)}
                maxLength={60}
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
          >
            <textarea
              id={`${ids}-bio`}
              name="bio"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={280}
              className={textareaClasses(Boolean(errors.bio))}
            />
          </Field>
        </Card>

        <Card className="p-5">
          <fieldset>
            <legend className="text-sm font-medium text-ink">What do you play, and how well?</legend>
            <p className="mt-1 text-sm leading-relaxed text-ink-faint">
              A level for each sport you play, because almost nobody is the same standard at both.
              This is what decides which games you can join. Changing it does not affect games you
              are already in.
            </p>
            <div className="mt-4">
              <SportLevelPicker
                initialTennis={profile.tennis_level}
                initialPadel={profile.padel_level}
                error={errors.sports ?? errors.tennisLevel ?? errors.padelLevel}
              />
            </div>
          </fieldset>

          <fieldset className="mt-6">
            <legend className="text-sm font-medium text-ink">
              Languages
              <span className="ml-1.5 font-normal text-ink-faint">optional</span>
            </legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {COMMON_LANGUAGES.map((lang) => {
                const on = languages.includes(lang);
                return (
                  <button
                    key={lang}
                    type="button"
                    onClick={() =>
                      setLanguages((c) =>
                        on ? c.filter((x) => x !== lang) : c.length < 6 ? [...c, lang] : c,
                      )
                    }
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
        </Card>

        <div>
          <Button weight="primary" size="lg" type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save your profile"}
          </Button>
        </div>
      </div>
    </form>
  );
}
