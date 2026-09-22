/**
 * Join class names, dropping anything falsy.
 *
 * Deliberately not `tailwind-merge`: this site's components own their classes
 * and never take a `className` that has to defeat an earlier utility, so the
 * 8 kB of merge machinery would buy nothing.
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
