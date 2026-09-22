"use client";

import { useState } from "react";

import { PadelIcon, TennisIcon } from "@/components/brand/icons";
import { LEVELS, levelFor, type SportId } from "@/lib/game/level";
import { cn } from "@/lib/cn";

/**
 * PICKING A LEVEL, ONE SPORT AT A TIME.
 *
 * Used by onboarding and by the profile page, so the question is asked the same
 * way in both places and the answer cannot mean two different things.
 *
 * WHY TWO ANSWERS AND NOT ONE. Somebody who has played tennis since they were
 * eight and picked up a padel racquet in October is not the same standard at
 * both. A single number forced them to misrepresent one: whichever way they set
 * it, one set of hosts got a player out of their depth and the other lost one
 * who would have been welcome.
 *
 * NEITHER IS COMPULSORY, AND AT LEAST ONE IS. A sport is switched on by choosing
 * a level for it and off by pressing that level again — so "I do not play padel"
 * and "I am a padel beginner" are different states, which is the distinction the
 * whole feature exists for. The form refuses to submit with both switched off,
 * and so does the database.
 *
 * It renders its own hidden inputs, so a form only has to place it.
 */
export function SportLevelPicker({
  initialTennis = null,
  initialPadel = null,
  error,
  onChange,
}: {
  initialTennis?: number | null;
  initialPadel?: number | null;
  error?: string;
  /** So a parent can enable its own Continue button. */
  onChange?: (state: { tennis: number | null; padel: number | null }) => void;
}) {
  const [tennis, setTennis] = useState<number | null>(initialTennis);
  const [padel, setPadel] = useState<number | null>(initialPadel);

  function set(sport: SportId, value: number | null) {
    const next = sport === "tennis" ? { tennis: value, padel } : { tennis, padel: value };
    setTennis(next.tennis);
    setPadel(next.padel);
    onChange?.(next);
  }

  return (
    <div>
      {/* Empty string rather than an omitted field: the server reads "" as "does
          not play this sport", and an absent key would be indistinguishable from
          a malformed submission. */}
      <input type="hidden" name="tennisLevel" value={tennis ?? ""} />
      <input type="hidden" name="padelLevel" value={padel ?? ""} />

      <div className="flex flex-col gap-4">
        <SportPanel
          sport="tennis"
          label="Tennis"
          icon={<TennisIcon size={20} />}
          value={tennis}
          onSet={(v) => set("tennis", v)}
        />
        <SportPanel
          sport="padel"
          label="Padel"
          icon={<PadelIcon size={20} />}
          value={padel}
          onSet={(v) => set("padel", v)}
        />
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <p className="mt-3 text-sm leading-relaxed text-ink-faint">
        Play both? Set each one separately. Press a level again to say you do not play that sport.
      </p>
    </div>
  );
}

function SportPanel({
  label,
  icon,
  value,
  onSet,
}: {
  sport: SportId;
  label: string;
  icon: React.ReactNode;
  value: number | null;
  onSet: (v: number | null) => void;
}) {
  const on = value !== null;

  return (
    <div
      className={cn(
        "rounded-card border-2 p-4 transition-colors",
        on ? "border-court-text bg-court-wash" : "border-hairline bg-surface",
      )}
    >
      <div className="flex items-center gap-2.5">
        <span className={cn("shrink-0", on ? "text-court-text" : "text-ink-faint")}>{icon}</span>
        <p className={cn("text-sm font-medium", on ? "text-court-text" : "text-ink")}>{label}</p>
        <span className="ml-auto text-xs text-ink-faint">
          {on ? `Level ${value}` : "You do not play this"}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {LEVELS.map((l) => {
          const selected = value === l.value;
          return (
            <button
              key={l.value}
              type="button"
              // Pressing the chosen level again clears it, which is how a sport
              // is switched off.
              onClick={() => onSet(selected ? null : l.value)}
              aria-pressed={selected}
              aria-label={`${label} level ${l.value}, ${l.name}`}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.8125rem] font-medium transition-colors",
                selected
                  ? "border-court-text bg-court text-on-court"
                  : "border-hairline bg-surface text-ink-soft hover:border-edge hover:text-ink",
              )}
            >
              <span className="num">{l.value}</span> {l.name}
            </button>
          );
        })}
      </div>

      {/* The description of the chosen level only, rather than all five at once:
          ten blocks of explanatory text is a wall nobody reads. */}
      <p className="mt-3 min-h-[2.5rem] text-[0.8125rem] leading-relaxed text-ink-soft">
        {on ? levelFor(value).tell : `Choose a level if you play ${label.toLowerCase()}.`}
      </p>
    </div>
  );
}
