"use client";

import { useEffect, useRef } from "react";

import { recordGameView } from "@/lib/actions/games";

/**
 * Counts one opening of a game page.
 *
 * Same shape as MarkSeenOnOpen and for the same reason: counting is a write, and
 * a Server Component render must not have side effects. React may render twice,
 * Next.js does exactly that in development, and a prefetch nobody asked for
 * would otherwise inflate the number. An effect after mount fires once, on a
 * page somebody actually opened.
 */
export function CountView({ gameId }: { gameId: string }) {
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    void recordGameView(gameId).catch(() => {});
  }, [gameId]);

  return null;
}
