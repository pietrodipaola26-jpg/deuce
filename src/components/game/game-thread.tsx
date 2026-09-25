"use client";

import { useActionState, useEffect, useMemo, useOptimistic, useRef, useState } from "react";

import { LockIcon } from "@/components/brand/icons";
import { Avatar } from "@/components/player/avatar";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/field";
import { postMessage, type ActionState } from "@/lib/actions/games";
import { createClient } from "@/lib/supabase/client";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/cn";

/**
 * THE GAME THREAD.
 *
 * Deuce has no direct messages, and that is a safety feature rather than a missing
 * one. Every conversation belongs to a game: it opens when you join, everyone in it
 * is a verified student going to the same court, and it closes a day after you
 * play. Nobody hands over a phone number to find out whether a game is still on,
 * and nobody can open a private channel to a stranger they saw in a feed.
 *
 * It also removes the last excuse not to turn up. "What if I get there and cannot
 * find them" is answered by three people who have already said hello.
 *
 * HOW IT STAYS LIVE. A Realtime subscription on `messages`, filtered to this game.
 * Realtime respects row-level security, so the subscription cannot deliver a
 * message the reader would not have been allowed to fetch. If the socket never
 * connects the thread still works — the Server Action revalidates the page, so the
 * live update is an enhancement rather than the mechanism.
 */

export type ThreadMessage = {
  id: string;
  body: string;
  is_system: boolean;
  created_at: string;
  sender_id: string | null;
  sender: { id: string; first_name: string | null; last_initial: string | null; tint: number } | null;
};

export function GameThread({
  gameId,
  initialMessages,
  meId,
  closed,
  heading,
  subheading,
}: {
  gameId: string;
  initialMessages: ThreadMessage[];
  meId: string;
  /** True once the thread has closed, 24 hours after the game ended. */
  closed: boolean;
  heading: string;
  subheading: string;
}) {
  /**
   * Messages that arrived over the socket since the last server render.
   *
   * Kept SEPARATE from the server's list rather than merged into one piece of
   * state, and then combined during render. The obvious version — one state array
   * that an effect re-seeds whenever the server sends new props — means writing
   * state from inside an effect, which React 19 flags because it causes a second
   * render pass on every revalidation. Deriving the list instead makes the server
   * the single source of truth with no synchronising step to get wrong.
   */
  const [live, setLive] = useState<ThreadMessage[]>([]);
  const [state, action, pending] = useActionState<ActionState, FormData>(postMessage, {});
  const formRef = useRef<HTMLFormElement>(null);
  const listRef = useRef<HTMLOListElement>(null);

  /**
   * Server rows win on id collision: they carry the sender's name and tint, which
   * the Realtime payload has no join to provide. So a message that arrives live as
   * a bare bubble gains its name on the next revalidation without ever duplicating.
   */
  const messages = useMemo(() => {
    const byId = new Map(initialMessages.map((m) => [m.id, m]));
    for (const m of live) if (!byId.has(m.id)) byId.set(m.id, m);
    return [...byId.values()].sort((a, b) => a.created_at.localeCompare(b.created_at));
  }, [initialMessages, live]);

  /**
   * Shows the message the moment it is sent.
   *
   * Without this, a sender watches their own text sit in the box for the length of
   * a round trip, which in a chat reads as "it did not send" and produces a second
   * copy of the same message.
   */
  const [optimistic, addOptimistic] = useOptimistic(
    messages,
    (current: ThreadMessage[], body: string) => [
      ...current,
      {
        id: `pending-${Date.now()}`,
        body,
        is_system: false,
        created_at: new Date().toISOString(),
        sender_id: meId,
        sender: null,
      },
    ],
  );

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`game-thread:${gameId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `game_id=eq.${gameId}` },
        (payload) => {
          const row = payload.new as {
            id: string;
            body: string;
            is_system: boolean;
            created_at: string;
            sender_id: string | null;
          };

          setLive((current) => {
            if (current.some((m) => m.id === row.id)) return current;
            return [
              ...current,
              {
                id: row.id,
                body: row.body,
                is_system: row.is_system,
                created_at: row.created_at,
                sender_id: row.sender_id,
                // The payload carries no join, so the name is filled in by the
                // next server render. An avatar with no name is better than a
                // message that does not appear until a refresh.
                sender: null,
              },
            ];
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [gameId]);

  // Keep the newest message in view, but only inside the thread's own box.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [optimistic.length]);

  return (
    <div className="flex flex-col overflow-hidden rounded-shell border border-hairline bg-surface shadow-lift-1">
      <div className="flex items-center gap-3 border-b border-hairline bg-paper px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{heading}</p>
          <p className="truncate text-xs text-ink-faint">{subheading}</p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-live-wash px-2 py-1 text-[0.6875rem] font-medium text-live">
          <LockIcon size={11} />
          Game only
        </span>
      </div>

      <ol ref={listRef} className="flex max-h-[26rem] flex-col gap-3 overflow-y-auto p-4">
        {optimistic.length === 0 ? (
          <li className="py-6 text-center text-sm leading-relaxed text-ink-faint">
            Nothing here yet. Whoever says hello first makes it much easier for everybody else.
          </li>
        ) : null}

        {optimistic.map((m) => {
          if (m.is_system) {
            return (
              <li
                key={m.id}
                className="py-0.5 text-center text-[0.6875rem] leading-relaxed text-ink-faint"
              >
                {m.body}
              </li>
            );
          }

          const mine = m.sender_id === meId;
          const person = m.sender ?? { first_name: null, last_initial: null, tint: 0 };

          return (
            <li key={m.id} className={cn("flex items-end gap-2", mine && "flex-row-reverse")}>
              <Avatar person={person} size={26} />
              <div className={cn("max-w-[78%]", mine && "text-right")}>
                <p
                  className={cn(
                    "rounded-card px-3 py-2 text-[0.8125rem] leading-relaxed whitespace-pre-wrap",
                    mine ? "rounded-br-sm bg-band text-on-band" : "rounded-bl-sm bg-paper text-ink",
                  )}
                >
                  {m.body}
                </p>
                <p className="num mt-1 px-1 text-[0.625rem] text-ink-faint">
                  {mine ? "You" : (person.first_name ?? "A player")} · {formatTime(m.created_at)}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-auto border-t border-hairline bg-paper px-4 py-3">
        {closed ? (
          <p className="text-center text-xs leading-relaxed text-ink-faint">
            This thread closed a day after the game. It stays readable, and it cannot be added to.
          </p>
        ) : (
          <>
            <FormError>{state.errors?.form ?? state.errors?.body}</FormError>
            <form
              ref={formRef}
              action={(formData) => {
                const body = String(formData.get("body") ?? "").trim();
                if (!body) return;
                addOptimistic(body);
                formRef.current?.reset();
                return action(formData);
              }}
              className="flex items-end gap-2"
            >
              <input type="hidden" name="gameId" value={gameId} />
              <label htmlFor={`thread-${gameId}`} className="sr-only">
                Message the game
              </label>
              {/*
                16px, and not a pixel less. iOS Safari zooms the whole viewport
                in when you focus a field whose font-size is under 16px, and it
                never zooms back out — so a smaller composer would leave every
                iPhone reader scaled up and scrolling sideways for the rest of
                their visit. This was the only typable control in the app below
                the line; everything else goes through Field. h-11 is 44px, the
                smallest thing a thumb can be asked to hit, and the Send button
                is pinned to the same height so the pair still line up.
              */}
              <input
                id={`thread-${gameId}`}
                name="body"
                maxLength={1000}
                autoComplete="off"
                placeholder="Message the game…"
                className="h-11 flex-1 rounded-full border border-hairline bg-surface px-3.5 text-base text-ink placeholder:text-ink-faint focus:border-court-text"
              />
              <Button weight="primary" size="md" type="submit" disabled={pending} className="h-11 px-4">
                Send
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
