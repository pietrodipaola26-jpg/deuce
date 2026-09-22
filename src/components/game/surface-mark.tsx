import { SURFACES, type SurfaceId } from "@/lib/game/surface";
import { cn } from "@/lib/cn";

/**
 * A surface, rendered as a dot plus its name.
 *
 * The dot is the scannable part and the name is the legible part. The name is
 * NEVER set in the surface colour — see the measured rule in globals.css: all
 * four surface colours clear 3:1 as a mark and none clears 4.5:1 as text.
 */
export function SurfaceMark({
  surface,
  className,
  size = 9,
}: {
  surface: SurfaceId;
  className?: string;
  size?: number;
}) {
  const s = SURFACES[surface];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm text-ink-soft", className)}>
      <span
        className="inline-block shrink-0 rounded-full"
        style={{ width: size, height: size, backgroundColor: s.swatch }}
        aria-hidden="true"
      />
      {s.name}
    </span>
  );
}
