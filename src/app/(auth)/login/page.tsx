import type { Metadata } from "next";

import { SignInForm } from "@/components/auth/sign-in-form";
import { Eyebrow } from "@/components/ui/pieces";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: true },
};

const MESSAGES: Record<string, string> = {
  no_profile:
    "Your account exists but its profile is missing. Sign in again, and tell us if it keeps happening.",
  expired: "That link had expired. Here is a fresh one.",
  invalid: "That link could not be used. Ask for another one.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[]; error?: string | string[]; email?: string | string[] }>;
}) {
  const params = await searchParams;

  const rawNext = Array.isArray(params.next) ? params.next[0] : params.next;
  // Only ever a path on this site. An absolute URL here would turn the sign-in
  // redirect into an open redirect.
  const next = typeof rawNext === "string" && rawNext.startsWith("/") && !rawNext.startsWith("//")
    ? rawNext
    : "";

  const rawError = Array.isArray(params.error) ? params.error[0] : params.error;
  const notice = typeof rawError === "string" ? MESSAGES[rawError] : undefined;

  const rawEmail = Array.isArray(params.email) ? params.email[0] : params.email;
  const initialEmail = typeof rawEmail === "string" ? rawEmail.slice(0, 254) : "";

  return (
    <div className="mx-auto max-w-md px-5 py-14 sm:px-8 lg:py-20">
      <Eyebrow>Welcome back</Eyebrow>
      <h1 className="mt-4 font-display text-[2rem] leading-[1.08] font-semibold tracking-[-0.03em] text-ink">
        Sign in to Deuce.
      </h1>

      {notice ? (
        <p className="mt-5 rounded-field bg-warn-wash px-4 py-3 text-sm leading-relaxed text-warn">
          {notice}
        </p>
      ) : null}

      <div className="mt-7">
        <SignInForm mode="login" next={next} initialEmail={initialEmail} />
      </div>
    </div>
  );
}
