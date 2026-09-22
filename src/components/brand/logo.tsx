import { cn } from "@/lib/cn";

/**
 * THE DEUCE MARK - the deployed app's mark, brought across unchanged.
 *
 * Deuce is 40 all. The tie. The moment the game is level and neither player can
 * finish it alone. That is the whole product in one word, so the mark is built
 * from it rather than from a ball:
 *
 *   a vertical seam down the middle   the net
 *   two counter posed dots            two players, level, one each side
 *
 * It reads at 16px, which is the only real test a favicon has to pass, and it
 * carries no tennis ball, no racquet silhouette and no swoosh.
 *
 * The dots sit at opposite diagonals rather than mirrored across the net. A
 * mirror would read as a reflection; opposed corners read as two people who
 * have taken position.
 */
export function DeuceMark({
  size = 28,
  className,
  title,
}: {
  size?: number;
  className?: string;
  /** Decorative marks next to a wordmark should not be announced twice. */
  title?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={cn("shrink-0", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <rect width="32" height="32" rx="9" fill="currentColor" />
      {/* The net. Inset top and bottom so it reads as a net rather than as a
          division of the whole tile. */}
      <rect
        x="15"
        y="4.5"
        width="2"
        height="23"
        rx="1"
        fill="var(--color-on-court)"
        opacity="0.45"
      />
      {/* Two players, level, opposed. */}
      <circle cx="9.5" cy="11.5" r="3.25" fill="var(--color-on-court)" />
      <circle cx="22.5" cy="20.5" r="3.25" fill="var(--color-on-court)" />
    </svg>
  );
}

/**
 * The lockup. The wordmark is set in the display face at a tight tracking,
 * because "Deuce" at default tracking reads as five separate letters rather
 * than one word.
 *
 * `onBand` flips the word to white for the dark section, where ink on band
 * would be invisible. The tile itself needs no flip: acid green is the one
 * colour that holds on both grounds.
 */
export function DeuceLogo({
  size = 28,
  className,
  showWord = true,
  onBand = false,
}: {
  size?: number;
  className?: string;
  showWord?: boolean;
  onBand?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <DeuceMark size={size} className="text-court" />
      {showWord ? (
        <span
          className={cn(
            "font-display font-semibold leading-none tracking-[-0.045em]",
            onBand ? "text-on-band" : "text-ink",
          )}
          style={{ fontSize: size * 0.82 }}
        >
          Deuce
        </span>
      ) : (
        // Only when the word is not drawn. Rendering both gives a screen reader
        // "Deuce Deuce" on every page.
        <span className="sr-only">Deuce</span>
      )}
    </span>
  );
}
