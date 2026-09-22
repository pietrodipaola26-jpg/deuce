import type { Metadata } from "next";
import Link from "next/link";

import { SignInForm } from "@/components/auth/sign-in-form";
import { CheckIcon, StarIcon, UsersIcon } from "@/components/brand/icons";
import { Eyebrow } from "@/components/ui/pieces";

export const metadata: Metadata = {
  title: "Create your account",
  description:
    "Join Deuce with your Bocconi email. Free, no password, and it is the only way to post or join a game.",
  // A signup form has nothing to offer a search result, and indexing it splits
  // the ranking of the page that does the selling.
  robots: { index: false, follow: true },
};

const REASSURANCE = [
  { icon: <CheckIcon size={16} />, text: "Free, and no cut of what you pay for a court" },
  { icon: <UsersIcon size={16} />, text: "Only people with a Bocconi mailbox can see you" },
  { icon: <StarIcon size={14} />, text: "Change your level or sport whenever you like" },
];

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string | string[]; next?: string | string[] }>;
}) {
  const params = await searchParams;

  // Carried over from the landing page's one-field form. Taken as a default for
  // an input the person can still edit — never trusted, and validated on the
  // server either way.
  const rawEmail = Array.isArray(params.email) ? params.email[0] : params.email;
  const initialEmail = typeof rawEmail === "string" ? rawEmail.slice(0, 254) : "";

  const rawNext = Array.isArray(params.next) ? params.next[0] : params.next;
  const next = typeof rawNext === "string" && rawNext.startsWith("/") ? rawNext : "";

  return (
    <div className="mx-auto grid max-w-5xl gap-12 px-5 py-14 sm:px-8 lg:grid-cols-[1fr_1.05fr] lg:gap-16 lg:py-20">
      <div className="lg:pt-6">
        <Eyebrow>Create your account</Eyebrow>
        <h1 className="mt-4 font-display text-[2.25rem] leading-[1.06] font-semibold tracking-[-0.03em] text-ink sm:text-[2.75rem]">
          The last thing between you and a game.
        </h1>
        <p className="mt-5 max-w-md text-[1.0625rem] leading-relaxed text-ink-soft">
          You need an account to see who is playing and to join them, and that is the only reason it
          exists. Nothing you enter is shown to another player except your first name, your level and
          the sports you play.
        </p>

        <ul className="mt-8 flex flex-col gap-3">
          {REASSURANCE.map((r) => (
            <li key={r.text} className="flex items-start gap-3 text-[0.9375rem] text-ink-soft">
              <span className="mt-0.5 shrink-0 text-court-text">{r.icon}</span>
              {r.text}
            </li>
          ))}
        </ul>

        <p className="mt-10 text-sm text-ink-faint">
          Wondering what is inside?{" "}
          <Link href="/#inside" className="font-medium text-court-text underline underline-offset-4">
            See what you get
          </Link>
          .
        </p>
      </div>

      <div>
        <SignInForm mode="signup" initialEmail={initialEmail} next={next} />
      </div>
    </div>
  );
}
