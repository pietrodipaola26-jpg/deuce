import { cn } from "@/lib/cn";

/**
 * ONE BUTTON, three weights.
 *
 * `primary` is the accent fill and it is rationed: one per screenful, and it is
 * always the same action — create an account. A page with three blue buttons
 * has no call to action, it has three suggestions.
 *
 * Every weight is the same height, the same radius and the same press
 * behaviour, so a row of mixed buttons sits on one line without adjustment.
 */

export type ButtonWeight = "primary" | "secondary" | "quiet" | "onBand";
export type ButtonSize = "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium " +
  "whitespace-nowrap transition-[transform,background-color,border-color,color] " +
  "duration-150 ease-[var(--ease-out)] active:translate-y-px " +
  "disabled:pointer-events-none disabled:opacity-55";

const WEIGHTS: Record<ButtonWeight, string> = {
  /*
   * The acid green measures 1.22:1 against white, so a filled primary button
   * has effectively no boundary on this page. The deep leaf border is what
   * makes it a control rather than a pale smudge, and it is the same green the
   * accent text uses, so the family stays closed. Ink on acid is 15:1.
   */
  primary: "bg-court text-on-court border border-court-text hover:bg-court-deep shadow-lift-1",
  secondary: "bg-surface text-ink border border-edge hover:bg-sunk",
  quiet: "bg-transparent text-ink-soft hover:text-ink hover:bg-sunk",
  /* For the dark band, where an acid fill would glare. */
  onBand: "bg-court text-on-court hover:bg-court-deep shadow-lift-2",
};

const SIZES: Record<ButtonSize, string> = {
  md: "h-10 px-4 text-[0.9375rem]",
  lg: "h-12 px-6 text-base",
};

export function buttonClasses(
  weight: ButtonWeight = "primary",
  size: ButtonSize = "md",
  extra?: string,
): string {
  return cn(BASE, WEIGHTS[weight], SIZES[size], extra);
}

export function Button({
  weight = "primary",
  size = "md",
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  weight?: ButtonWeight;
  size?: ButtonSize;
}) {
  return <button className={buttonClasses(weight, size, className)} {...rest} />;
}
