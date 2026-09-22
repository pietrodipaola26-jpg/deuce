import { cn } from "@/lib/cn";

/**
 * One field, one label, one error, in one place.
 *
 * Every input in Deuce goes through this so that three things are impossible to
 * forget: the label is a real `<label>` bound to the control, the error is
 * announced (`role="alert"`) rather than only drawn red, and `aria-describedby`
 * points at whichever of the hint or the error is actually on screen.
 */
export function Field({
  id,
  label,
  hint,
  error,
  children,
  className,
  optional = false,
}: {
  id: string;
  label: string;
  hint?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
  className?: string;
  optional?: boolean;
}) {
  return (
    <div className={cn("flex flex-col", className)}>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
        {optional ? <span className="ml-1.5 font-normal text-ink-faint">optional</span> : null}
      </label>
      <div className="mt-2">{children}</div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-2 text-sm leading-relaxed text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-2 text-sm leading-relaxed text-ink-faint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** The one input style, so a form never invents a second one. */
export function inputClasses(hasError?: boolean, extra?: string): string {
  return cn(
    "h-12 w-full rounded-field border bg-surface px-4 text-base text-ink placeholder:text-ink-faint",
    hasError ? "border-danger" : "border-edge focus:border-court-text",
    extra,
  );
}

export function textareaClasses(hasError?: boolean, extra?: string): string {
  return cn(
    "w-full rounded-field border bg-surface px-4 py-3 text-base leading-relaxed text-ink placeholder:text-ink-faint",
    hasError ? "border-danger" : "border-edge focus:border-court-text",
    extra,
  );
}

/** A form-level failure. The one error somebody cannot fix by looking harder. */
export function FormError({ children }: { children?: string | null }) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className="mb-6 rounded-field bg-danger-wash px-4 py-3 text-sm leading-relaxed text-danger"
    >
      {children}
    </p>
  );
}

/** Empty states. A feed with nothing in it still has to say something useful. */
export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-card border border-hairline bg-surface px-6 py-14 text-center">
      <p className="font-display text-lg font-medium text-ink">{title}</p>
      {children ? (
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-soft">{children}</p>
      ) : null}
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}
