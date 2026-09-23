import type { Instrumentation } from "next";

/**
 * SERVER ERRORS, MADE VISIBLE.
 *
 * onRequestError is the hook Next.js provides for this. It fires for Server
 * Components, Route Handlers, Server Actions and the proxy, which is everything
 * that can fail on the server side of Deuce.
 *
 * WHAT IS PASSED ON, AND WHAT IS THROWN AWAY.
 *
 * Next.js hands this function a `request` containing `path` and `headers`.
 * Neither is used. `headers` carries cookies, which means live session tokens.
 * `path` carries concrete ids, so /games/3f9a identifies a game and therefore
 * the people in it.
 *
 * What is stored instead is `context.routePath`, the route PATTERN: /games/[id].
 * The method is kept because it is not identifying. Nothing else is.
 *
 * THE ERROR MAY NOT BE THE ONE THAT WAS THROWN. The Next.js docs are explicit
 * that React may have processed it during Server Component rendering, which is
 * why `digest` exists. messageOf() narrows the unknown safely either way.
 *
 * The import is dynamic because this file is loaded in both the Node and Edge
 * runtimes, and the reporter pulls in nodemailer, which is Node only.
 */
export const onRequestError: Instrumentation.onRequestError = async (
  err,
  request,
  context,
) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    const { messageOf, reportError } = await import("@/lib/errors");

    await reportError({
      message: messageOf(err),
      // A pattern, never request.path. See above.
      route: context.routePath || "unknown",
      routeType: context.routeType,
      method: request.method,
      source: "server",
    });
  } catch {
    // An error reporter that can itself throw turns one broken page into two.
  }
};
