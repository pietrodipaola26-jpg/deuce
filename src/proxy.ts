import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/env";

/**
 * Runs before every document request.
 *
 * NAMED `proxy`, NOT `middleware`. The middleware file convention is deprecated
 * in Next.js 16 and renamed to proxy; the behaviour is identical.
 *
 * It does two things, and deliberately not a third:
 *
 *  1. REFRESHES THE SUPABASE SESSION. Server Components cannot write cookies, so
 *     without this the access token expires after an hour and the whole app
 *     silently logs people out mid-thread. This is the only place the refreshed
 *     cookies can be attached to a response.
 *
 *  2. REDIRECTS OPTIMISTICALLY. A signed-out request for a member page is sent
 *     to /login here so nobody waits for a render they are not allowed to see.
 *     This is NOT the authorisation check — the Next.js docs are explicit that
 *     proxy must not be used as one, and every protected page calls
 *     `requireMember()` itself. Row Level Security is the real boundary, and it
 *     is in the database.
 *
 * WHAT IT DOES NOT DO: fetch data, or make an authorisation decision this
 * application would be unsafe without.
 */

/** Everything under these prefixes is for members. */
const MEMBER_PREFIXES = [
  "/games",
  "/my-games",
  "/players",
  "/profile",
  "/notifications",
  "/onboarding",
  "/settings",
];

/** Signing in when already signed in just sends you to the feed. */
const AUTH_PAGES = ["/login", "/signup"];

export async function proxy(request: NextRequest) {
  // Must start as a pass-through built from the request, so cookies set by the
  // Supabase client below survive onto whatever response is finally returned.
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // This call is the refresh. Do not remove it, and do not replace it with
  // getSession(): only getUser() revalidates the token with the auth server.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && MEMBER_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // So the sign-in link can return them to the game they were trying to open.
    url.searchParams.set("next", pathname);
    return withSecurityHeaders(NextResponse.redirect(url), request);
  }

  if (user && AUTH_PAGES.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/games";
    url.search = "";
    return withSecurityHeaders(NextResponse.redirect(url), request);
  }

  return withSecurityHeaders(response, request);
}

/**
 * The header set every response carries.
 *
 * HSTS is conditional on purpose. Sent over http://localhost it pins the browser
 * to HTTPS for localhost across every project on the machine, and the pin
 * outlives the dev server — a genuinely painful, hard-to-diagnose footgun.
 */
function withSecurityHeaders(response: NextResponse, request: NextRequest): NextResponse {
  const isSecure = request.nextUrl.protocol === "https:";
  const h = response.headers;

  h.set("X-Content-Type-Options", "nosniff");
  h.set("Referrer-Policy", "strict-origin-when-cross-origin");
  h.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  );
  if (isSecure) {
    h.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
  h.set("Content-Security-Policy", contentSecurityPolicy());

  return response;
}

function contentSecurityPolicy(): string {
  const supabase = env.NEXT_PUBLIC_SUPABASE_URL;
  // Realtime is a WebSocket to the same host, so the ws(s) origin has to be
  // named explicitly — connect-src does not infer it from the http one.
  const socket = supabase.replace(/^http/, "ws");
  const dev = process.env.NODE_ENV !== "production";

  return [
    "default-src 'self'",
    // 'unsafe-inline' is required by the framework's hydration bootstrap script.
    // 'unsafe-eval' is dev-only: React Refresh needs it, production must not.
    `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
    // Tailwind v4 emits a stylesheet, but components set style attributes for
    // measured values (avatar tints, level-bar heights), which needs this.
    "style-src 'self' 'unsafe-inline'",
    // next/font self-hosts the Archivo and Figtree files at build time, so no
    // external font origin is needed here.
    "font-src 'self'",
    "img-src 'self' data: blob:",
    `connect-src 'self' ${supabase} ${socket}${dev ? " ws://127.0.0.1:* ws://localhost:*" : ""}`,
    "frame-ancestors 'none'",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export const config = {
  /**
   * Skips static assets and image optimisation: refreshing a session for a
   * request that returns a font file is pure latency.
   */
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)"],
};
