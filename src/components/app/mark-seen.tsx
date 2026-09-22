"use client";

import { useEffect, useRef } from "react";

/**
 * Clears a badge when its page is opened.
 *
 * WHY A COMPONENT AND NOT JUST DOING IT IN THE PAGE. Marking things read is a
 * write, and a Server Component render must not have side effects: React is
 * free to render one more than once, and Next.js does exactly that in
 * development. A write in the render body would fire twice, or fire during a
 * prefetch nobody asked for. Running it from an effect after mount means it
 * happens once, on a page a person actually opened.
 *
 * The ref guard covers the remaining case: the action revalidates the page, and
 * a re-render must not start the whole thing again.
 */
export function MarkSeenOnOpen({ action }: { action: () => Promise<void> }) {
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    // Nothing waits on this and nothing is shown if it fails: the page is
    // already rendered and a stale badge is a far smaller problem than an error.
    void action().catch(() => {});
  }, [action]);

  return null;
}
