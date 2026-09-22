import type { SVGProps } from "react";

/**
 * THE ICON SET.
 *
 * Drawn here rather than installed. Three reasons, in order of how much they
 * matter: a set drawn to one spec looks like one set, the tennis and padel
 * glyphs do not exist in any general-purpose library worth using, and the whole
 * set costs less than the import statement for an icon package.
 *
 * ONE SPEC, followed by every glyph: 24px box, 1.7 stroke, round caps and
 * joins, no fills except where a shape is genuinely solid. Every icon is
 * `aria-hidden` and sits beside real text — none of them is ever the only
 * label for a control.
 */

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 20, children, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

/** A tennis ball: the circle and the two seams that make it unmistakable. */
export function TennisIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M4.5 6.2c3.6 2 5.4 5.1 5.3 9.6M19.5 6.2c-3.6 2-5.4 5.1-5.3 9.6" />
    </Icon>
  );
}

/** A padel racquet: the solid teardrop head, its perforations, and the grip. */
export function PadelIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 2.6c4.2 0 7.2 3 7.2 7 0 3.9-3 6.9-7.2 6.9s-7.2-3-7.2-6.9c0-4 3-7 7.2-7Z" />
      <path d="M12 16.5v4.9M10.2 21.4h3.6" />
      <circle cx="9.7" cy="8.4" r=".9" fill="currentColor" stroke="none" />
      <circle cx="14.3" cy="8.4" r=".9" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r=".9" fill="currentColor" stroke="none" />
    </Icon>
  );
}

/** A court seen from above, with the net across it. Used for surfaces. */
export function CourtIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="4" width="18" height="16" rx="1.5" />
      <path d="M3 12h18M8 4v16M16 4v16" />
    </Icon>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.2V12l3.2 2" />
    </Icon>
  );
}

export function PinIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 21.5s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" />
      <circle cx="12" cy="10.3" r="2.6" />
    </Icon>
  );
}

export function EuroIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M16.5 6.4A6 6 0 0 0 7.2 9a7.6 7.6 0 0 0 0 6 6 6 0 0 0 9.3 2.6" />
      <path d="M4.8 10.4h7M4.8 13.6h7" />
    </Icon>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="9" cy="8.2" r="3.4" />
      <path d="M2.8 20.2a6.5 6.5 0 0 1 12.4 0" />
      <path d="M16.2 5.2a3.4 3.4 0 0 1 0 6.1M17.6 14.4a6.5 6.5 0 0 1 3.6 5.8" />
    </Icon>
  );
}

/** A shield with a tick. Every safety claim on the site carries this. */
export function ShieldIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 2.7 4.6 5.6v6c0 4.6 3.1 8.3 7.4 9.7 4.3-1.4 7.4-5.1 7.4-9.7v-6L12 2.7Z" />
      <path d="M8.9 11.9 11.2 14l4-4.4" />
    </Icon>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4.6 12.6 9.4 17.3 19.4 6.9" />
    </Icon>
  );
}

export function StarIcon({ size = 20, ...rest }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true" {...rest}>
      <path d="m12 3.4 2.62 5.5 5.88.8-4.28 4.2 1.05 5.98L12 17.05l-5.27 2.83 1.05-5.98L3.5 9.7l5.88-.8L12 3.4Z" />
    </svg>
  );
}

export function MessageIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M20.5 12.4c0 4-3.8 7.2-8.5 7.2a9.8 9.8 0 0 1-2.9-.43L4 21l1.3-3.7a6.8 6.8 0 0 1-1.8-4.5c0-4 3.8-7.2 8.5-7.2s8.5 3.2 8.5 7.2Z" />
    </Icon>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4.5 12h14.2M13.2 6.2 19 12l-5.8 5.8" />
    </Icon>
  );
}

export function FilterIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3.5 6.2h17M6.6 12h10.8M10 17.8h4" />
    </Icon>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3.5" y="5.2" width="17" height="15.3" rx="2" />
      <path d="M3.5 9.9h17M8.4 3.5v3.4M15.6 3.5v3.4" />
    </Icon>
  );
}

/** Indoor: a roof over a court. Answers "is it cancelled if it rains". */
export function IndoorIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3.2 10.6 12 3.9l8.8 6.7" />
      <path d="M5.6 12.6v7.5h12.8v-7.5" />
      <path d="M5.6 16.4h12.8" />
    </Icon>
  );
}

export function SunIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="4.1" />
      <path d="M12 2.6v2.1M12 19.3v2.1M4.4 4.4l1.5 1.5M18.1 18.1l1.5 1.5M2.6 12h2.1M19.3 12h2.1M4.4 19.6l1.5-1.5M18.1 5.9l1.5-1.5" />
    </Icon>
  );
}

export function AlertIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.6v5M12 15.9v.1" />
    </Icon>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="4.6" y="10.3" width="14.8" height="10.2" rx="2.2" />
      <path d="M8.2 10.3V7.6a3.8 3.8 0 0 1 7.6 0v2.7" />
    </Icon>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5.8 9.2 12 15.4l6.2-6.2" />
    </Icon>
  );
}

/** Sport glyph by id, so a caller never has to branch on the string. */
export function SportIcon({ sport, ...rest }: IconProps & { sport: "tennis" | "padel" }) {
  return sport === "tennis" ? <TennisIcon {...rest} /> : <PadelIcon {...rest} />;
}
