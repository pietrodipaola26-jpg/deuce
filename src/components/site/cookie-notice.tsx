"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";

/**
 * THE COOKIE NOTICE.
 *
 * WHY IT IS A NOTICE AND NOT A CONSENT GATE. Deuce sets exactly one cookie: the
 * session cookie that keeps you signed in. Under the ePrivacy Directive a cookie
 * strictly necessary to deliver a service the user asked for does not require
 * consent, and signing in is that service.
 *
 * So there is no Accept and Reject pair here, because there is no real decision
 * to offer. A pair of buttons where "Reject" either does nothing or logs you out
 * is a dark pattern wearing a compliance badge: it trains people to dismiss
 * these things without reading, and it misrepresents what the product does. The
 * honest version is to say what the one cookie is, link to the full list, and
 * let somebody make it go away.
 *
 * THE DAY THAT CHANGES, THIS COMPONENT CHANGES FIRST. If Deuce ever adds
 * analytics or anything else that is not strictly necessary, this becomes a real
 * gate with a genuine reject that genuinely blocks, and nothing non-essential
 * may load until it is answered.
 *
 * It is dismissed per browser rather than per account, because it is about what
 * this browser stores, and because it has to work for somebody who has not
 * signed in.
 */

const STORAGE_KEY = "deuce.cookie-notice.seen";

/**
 * The dismissal lives in localStorage, which is browser state the server cannot
 * see, so it is read through `useSyncExternalStore` rather than by writing state
 * from inside an effect.
 *
 * That is not a style preference. Setting state in an effect to read a browser
 * API causes a second render pass on every mount, and React 19 flags it. This
 * hook exists precisely for "subscribe to something outside React", it gives the
 * server a snapshot of its own so there is no hydration mismatch, and React
 * swaps in the real client value immediately after hydration.
 */
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // Dismissing it in one tab should dismiss it in the others.
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getSnapshot(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    // Private windows and blocked site data make localStorage throw on read.
    // Showing the notice is the safe failure: it is information, not a gate.
    return false;
  }
}

/**
 * The server always renders it as already dismissed, so nothing flashes for the
 * majority who have seen it. The client corrects this on hydration.
 */
function getServerSnapshot(): boolean {
  return true;
}

export function CookieNotice() {
  const dismissed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function dismiss() {
    try {
      window.localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    } catch {
      // If it cannot be remembered it simply appears again next time, which is
      // annoying rather than broken. Never let this throw into the page.
    }
    for (const notify of listeners) notify();
  }

  if (dismissed) return null;


  return (
    <div
      // A region rather than a dialog: it traps nothing, blocks nothing, and the
      // page underneath stays fully usable while it is open.
      role="region"
      aria-label="About cookies"
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-hairline bg-surface shadow-lift-3"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:px-8">
        <p className="flex-1 text-sm leading-relaxed text-ink-soft">
          Deuce sets <span className="font-medium text-ink">one cookie</span>, and it is the one that
          keeps you signed in. No analytics, no advertising, nothing shared with anybody else.{" "}
          <Link href="/legal/cookies" className="font-medium text-court-text underline underline-offset-4">
            What it stores
          </Link>
          .
        </p>
        <Button weight="secondary" size="md" onClick={dismiss} className="shrink-0 self-start sm:self-auto">
          Got it
        </Button>
      </div>
    </div>
  );
}
