import { playerInitials } from "@/lib/format";
import { cn } from "@/lib/cn";

/**
 * An avatar is initials on a stable tint. No photographs, anywhere.
 *
 * That is a product decision rather than a shortcut. A grid of student faces
 * turns a matchmaking platform into something it must not be, and the trust this
 * product is trying to build comes from a verified mailbox and a record of
 * turning up — not from what somebody looks like. Supabase Storage is switched
 * off in the stack config for the same reason.
 *
 * Initials are ink on a light tint measured well past 4.5:1, because the obvious
 * version of this component renders white initials on a pale pastel and the
 * initial simply vanishes.
 */

/** Avatar tints, indexed by `profiles.tint`. Light enough to carry ink text. */
export const TINTS = [
  "#E4EAFF",
  "#E8F0E4",
  "#FBE9E1",
  "#E6F1F0",
  "#EFE8F6",
  "#FCF0DC",
  "#E3F0F6",
  "#F5E7EC",
] as const;

export type AvatarPerson = {
  first_name: string | null;
  last_initial: string | null;
  tint: number;
};

export function Avatar({
  person,
  size = 36,
  className,
  ring = false,
}: {
  person: AvatarPerson;
  size?: number;
  className?: string;
  /** A surface-coloured ring, for overlapping stacks. */
  ring?: boolean;
}) {
  const name = person.first_name
    ? `${person.first_name}${person.last_initial ? ` ${person.last_initial}.` : ""}`
    : "A player";

  return (
    <span
      className={cn(
        "num inline-flex shrink-0 items-center justify-center rounded-full font-medium text-ink",
        ring && "ring-2 ring-surface",
        className,
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: TINTS[person.tint % TINTS.length],
        fontSize: Math.max(10, size * 0.34),
      }}
      title={name}
    >
      <span aria-hidden="true">{playerInitials(person)}</span>
      <span className="sr-only">{name}</span>
    </span>
  );
}

/**
 * Overlapping avatars, plus the empty seats still to fill.
 *
 * The empty seats are the point. Three faces says "three people are going";
 * three faces and a dashed circle says "there is a place for you", and that is
 * the difference between a feed you read and a feed you join.
 */
export function AvatarStack({
  people,
  spots,
  size = 30,
}: {
  people: AvatarPerson[];
  spots: number;
  size?: number;
}) {
  const empty = Math.max(0, spots - people.length);

  return (
    <span className="inline-flex items-center">
      {people.map((p, i) => (
        <span key={i} style={{ marginLeft: i === 0 ? 0 : -size * 0.28 }}>
          <Avatar person={p} size={size} ring />
        </span>
      ))}
      {Array.from({ length: empty }, (_, i) => (
        <span
          key={`empty-${i}`}
          className="inline-flex items-center justify-center rounded-full border border-dashed border-edge bg-paper ring-2 ring-surface"
          style={{
            width: size,
            height: size,
            marginLeft: people.length === 0 && i === 0 ? 0 : -size * 0.28,
          }}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}
