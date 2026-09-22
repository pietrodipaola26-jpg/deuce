import { LEVEL_MAX, LEVEL_MIN, levelFor, levelRangeLabel } from "@/lib/game/level";
import { cn } from "@/lib/cn";

/**
 * THE LEVEL METER.
 *
 * Five segments, and the ones inside the game's range are filled. It answers
 * the only question a nervous player has — "am I good enough for this?" — in
 * the time it takes to glance, and it answers it in three ways at once: the
 * filled bars, the numbers, and the name of the level in words.
 *
 * The words are the part that matters. "Level 2" is a number a beginner cannot
 * calibrate; "Learning" is a description they can recognise themselves in.
 */
export function LevelMeter({
  min,
  max,
  className,
  showWords = true,
}: {
  min: number;
  max: number;
  className?: string;
  showWords?: boolean;
}) {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  const segments = Array.from({ length: LEVEL_MAX - LEVEL_MIN + 1 }, (_, i) => i + LEVEL_MIN);

  const words =
    lo === hi ? levelFor(lo).name : `${levelFor(lo).name} to ${levelFor(hi).name}`;

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="flex items-end gap-[3px]" aria-hidden="true">
        {segments.map((n) => {
          const on = n >= lo && n <= hi;
          return (
            <span
              key={n}
              className={cn(
                "w-[5px] rounded-[2px] transition-colors",
                // Deep leaf rather than acid: acid green and the hairline track
                // are within 1.05:1 of each other, so acid bars simply vanish.
                on ? "bg-court-text" : "bg-hairline",
              )}
              // A rising staircase, so the bars read as "more skill" rather than
              // as a five-segment battery.
              style={{ height: 7 + n * 2.5 }}
            />
          );
        })}
      </span>
      <span className="text-sm text-ink-soft">
        <span className="num font-medium text-ink">Level {levelRangeLabel(lo, hi)}</span>
        {showWords ? <span className="text-ink-faint"> · {words}</span> : null}
      </span>
    </div>
  );
}
