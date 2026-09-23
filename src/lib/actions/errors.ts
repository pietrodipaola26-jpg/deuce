"use server";

import { messageOf, reportError } from "@/lib/errors";

/**
 * CLIENT ERRORS, WHICH THE SERVER HOOK CANNOT SEE.
 *
 * onRequestError covers the server. A component that throws while rendering in
 * somebody's browser reaches error.tsx, whose console.error lands in that
 * person's console and nowhere else. This is how it gets back.
 *
 * TAKES A MESSAGE AND A DIGEST, NOT A STACK AND NOT A URL. React's production
 * digest is enough to match the failure to a server log, a stack trace from a
 * minified bundle says little, and window.location contains ids that identify
 * people. The route recorded is the literal string "client" rather than wherever
 * they were.
 *
 * Returns nothing and never throws. The page has already failed; the person is
 * looking at the error screen, and a failure here must not make that worse.
 */
export async function reportClientError(message: string, digest?: string): Promise<void> {
  try {
    await reportError({
      message: messageOf(digest ? `${message} (digest ${digest})` : message),
      route: "client",
      routeType: "render",
      source: "client",
    });
  } catch {
    // Silent on purpose.
  }
}
