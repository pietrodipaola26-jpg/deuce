import { cn } from "@/lib/cn";

/**
 * The small repeated parts. Kept in one file because each is four lines and a
 * folder of four-line files is harder to read than the file.
 */

/**
 * A section label. Set in mono, spaced out, small — it reads as a column header
 * on a results sheet, which is the reference the whole site is built on.
 */
export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "label text-[0.6875rem] text-ink-faint",
        className,
      )}
    >
      {children}
    </p>
  );
}

/** A hairline that reads as a painted court line rather than a CSS border. */
export function Rule({ className }: { className?: string }) {
  return <div className={cn("court-rule w-full", className)} aria-hidden="true" />;
}

/**
 * A small piece of metadata: icon, then text. The icon is decoration and the
 * text is the label — never the other way round.
 */
export function Meta({
  icon,
  children,
  className,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm text-ink-soft", className)}>
      <span className="text-ink-faint">{icon}</span>
      {children}
    </span>
  );
}

/** A chip. Quiet by default; `tone="accent"` for the one that is selected. */
export function Chip({
  children,
  tone = "plain",
  className,
}: {
  children: React.ReactNode;
  tone?: "plain" | "accent" | "live";
  className?: string;
}) {
  const tones = {
    plain: "bg-sunk text-ink-soft",
    accent: "bg-court-wash text-court-text",
    live: "bg-live-wash text-live",
  } as const;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * A card. White on bone, hairline edge, soft lift. The single container the
 * whole site uses, so nothing has to invent its own box.
 */
export function Card({
  children,
  className,
  id,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  /** For cards that are a scroll target, such as the privacy panel. */
  id?: string;
  as?: "div" | "article" | "li" | "section";
}) {
  return (
    <Tag
      id={id}
      className={cn(
        "rounded-card border border-hairline bg-surface shadow-lift-1",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
