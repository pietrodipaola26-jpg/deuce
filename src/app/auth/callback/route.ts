import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Where the emailed sign-in link lands.
 *
 * Supabase sends either a `code` (PKCE) or a `token_hash` + `type` depending on
 * how the project is configured, so both are handled — a callback that supports
 * only one of them works until somebody changes a setting in the dashboard and
 * then fails for everybody at once, with no code change to blame.
 *
 * The session cookie is set here, by a Route Handler, because this is one of the
 * few places in the App Router that is allowed to write cookies.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  /**
   * Where to send them afterwards. Only ever a path on this site: an attacker who
   * could put an absolute URL in here would have an open redirect that arrives in
   * somebody's inbox from us, which is a phishing primitive rather than a bug.
   */
  const requested = searchParams.get("next") ?? "";
  const next = requested.startsWith("/") && !requested.startsWith("//") ? requested : "";

  const supabase = await createClient();

  let failed: string | null = null;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) failed = error.message;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "email" | "magiclink" | "signup" | "recovery" | "invite" | "email_change",
    });
    if (error) failed = error.message;
  } else {
    failed = "no credential in callback";
  }

  if (failed) {
    console.error("[auth] callback failed", failed);
    const url = new URL("/login", origin);
    url.searchParams.set("error", /expire/i.test(failed) ? "expired" : "invalid");
    return NextResponse.redirect(url);
  }

  /**
   * A brand-new account has a profile row with no name and no level, so it goes
   * to onboarding; a returning member goes where they were headed. Deciding it
   * here rather than letting the feed bounce them saves a redirect on the single
   * most important navigation in the product.
   */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarded_at")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.onboarded_at) {
      const url = new URL("/onboarding", origin);
      if (next) url.searchParams.set("next", next);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.redirect(new URL(next || "/games", origin));
}
