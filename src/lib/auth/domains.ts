/**
 * Who Deuce admits.
 *
 * Students get @studbocconi.it; faculty, PhD and staff get @unibocconi.it. Both
 * are Bocconi, so both are in.
 *
 * This mirrors `public.is_eligible_email()` in the schema on purpose. The
 * database is the authority — it refuses the account outright — and this copy
 * exists so the form can say something useful before a round trip. If the two
 * ever disagree, the database wins and the person sees its message.
 */
export const ELIGIBLE_DOMAINS = ["studbocconi.it", "unibocconi.it"] as const;

export function normaliseEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function domainOf(email: string): string {
  const at = normaliseEmail(email).lastIndexOf("@");
  return at === -1 ? "" : normaliseEmail(email).slice(at + 1);
}

export function isEligibleEmail(email: string): boolean {
  return (ELIGIBLE_DOMAINS as readonly string[]).includes(domainOf(email));
}

/**
 * Deliberately loose on shape, strict on domain.
 *
 * A regex that tries to be RFC-correct rejects real addresses and is the classic
 * way to lose a signup you never hear about. The domain check does the real work.
 */
const LOOSE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Returns an error sentence, or null when the address is fine. */
export function validateEmail(raw: string): string | null {
  const email = normaliseEmail(raw);
  if (!email) return "Enter your Bocconi email address.";
  if (!LOOSE_EMAIL.test(email)) return "That does not look like an email address.";
  if (!isEligibleEmail(email)) {
    const domain = domainOf(email);
    return domain
      ? `Deuce is Bocconi only, so ${domain} will not work. Use your @studbocconi.it or @unibocconi.it address.`
      : "Use your @studbocconi.it or @unibocconi.it address.";
  }
  return null;
}
