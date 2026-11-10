"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { PING_INTERVAL_MS } from "@/lib/game/constants";
import type { Action, RoomView, ServerEvent } from "@/lib/game/types";
import { ApiError, clearSession, readSessionRaw, sendAction, subscribeSessions, type Session } from "./api";

export type RoomStatus =
  | "loading" // server render / before the tab's session is read
  | "no-session" // not joined yet: show the join form
  | "connecting"
  | "connected"
  | "reconnecting" // stream dropped, the browser or this hook is retrying
  | "not-found" // room doesn't exist (wrong code, or the server restarted)
  | "removed"; // kicked or left

export interface UseRoom {
  status: RoomStatus;
  view: RoomView | null;
  /** Why we ended up in no-session / not-found / removed, if there is a reason to show. */
  message: string | null;
  /** Sends an action. Resolves with an error message (or null on success); never throws. */
  act: (action: Action) => Promise<{ error: string | null; packId?: string }>;
  /** Leaves a not-found / removed screen and shows the join form again. */
  reset: () => void;
}

interface Connection {
  token: string;
  status: "connected" | "reconnecting" | "not-found" | "removed";
  view: RoomView | null;
  message: string | null;
}

const SERVER_SNAPSHOT = "\u0000server";

/** First delay before reopening a stream the browser gave up on; doubles up to RETRY_MAX_MS. */
const RETRY_MIN_MS = 1_000;
const RETRY_MAX_MS = 15_000;
/** Hearing nothing (not even a ping) for this long means the stream is dead. */
const STALE_MS = PING_INTERVAL_MS + 10_000;
const HEALTH_CHECK_MS = 5_000;

export function useRoom(code: string): UseRoom {
  const raw = useSyncExternalStore(
    subscribeSessions,
    () => readSessionRaw(code),
    () => SERVER_SNAPSHOT,
  );
  const session = useMemo<Session | null>(
    () => (raw && raw !== SERVER_SNAPSHOT ? (JSON.parse(raw) as Session) : null),
    [raw],
  );
  const [conn, setConn] = useState<Connection | null>(null);
  const [joinMessage, setJoinMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    const { token } = session;
    const update = (patch: Partial<Connection>) =>
      setConn((c) => ({
        token,
        status: "connected",
        view: c?.token === token ? c.view : null,
        message: null,
        ...patch,
      }));

    const url = `/api/rooms/${session.code}/events?token=${encodeURIComponent(token)}`;
    let source: EventSource | null = null;
    let lastHeard = 0;
    let retries = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    /** Set once the room is gone for this tab (or the effect is cleaned up): never reconnect. */
    let finished = false;

    function connect() {
      clearTimeout(retryTimer);
      retryTimer = undefined;
      source?.close();
      lastHeard = Date.now();
      const es = new EventSource(url);
      source = es;
      es.onopen = () => {
        retries = 0;
        lastHeard = Date.now();
        update({ status: "connected" });
      };
      es.onerror = () => {
        update({ status: "reconnecting" });
        // After a network error the browser retries by itself, but after an error response
        // (say a proxy's 502 while the server restarts) it gives up for good. Then retry here.
        if (es.readyState === EventSource.CLOSED && retryTimer === undefined) {
          retryTimer = setTimeout(connect, Math.min(RETRY_MAX_MS, RETRY_MIN_MS * 2 ** retries++));
        }
      };
      es.onmessage = (e: MessageEvent<string>) => {
        lastHeard = Date.now();
        const event = JSON.parse(e.data) as ServerEvent;
        if (event.type === "ping") return;
        if (event.type === "state") {
          update({ status: "connected", view: event.view });
          return;
        }
        // Terminal events: stop reconnecting and forget the seat.
        finished = true;
        es.close();
        onTerminal(event);
      };
    }

    function onTerminal(event: Exclude<ServerEvent, { type: "state" } | { type: "ping" }>) {
      if (event.type === "removed") {
        update({
          status: "removed",
          view: null,
          message: event.reason === "kicked" ? "The host removed you from the room." : "You left the room.",
        });
      } else if (event.code === "ROOM_NOT_FOUND") {
        update({ status: "not-found", view: null, message: event.message });
      } else {
        // Token no longer valid (e.g. the seat was reclaimed in another tab): join again.
        setJoinMessage(event.message);
      }
      clearSession(code);
    }

    // A stream can look open while it is dead, e.g. after a phone slept or changed networks.
    // The server pings regularly, so silence means starting over.
    function checkHealth() {
      if (finished || retryTimer !== undefined) return;
      if (Date.now() - lastHeard > STALE_MS) connect();
    }
    const onVisible = () => {
      if (document.visibilityState === "visible") checkHealth();
    };
    const onOnline = () => {
      if (!finished && source?.readyState !== EventSource.OPEN) connect();
    };

    connect();
    const healthTimer = setInterval(checkHealth, HEALTH_CHECK_MS);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    return () => {
      finished = true;
      clearTimeout(retryTimer);
      clearInterval(healthTimer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
      source?.close();
    };
  }, [code, session]);

  let status: RoomStatus;
  if (raw === SERVER_SNAPSHOT) status = "loading";
  else if (conn && (conn.status === "removed" || conn.status === "not-found")) status = conn.status;
  else if (!session) status = "no-session";
  else if (conn?.token === session.token) status = conn.status;
  else status = "connecting";

  const live = conn && session && conn.token === session.token;
  const view = live ? conn.view : null;
  const message = status === "no-session" ? joinMessage : (conn?.message ?? null);

  const act = useCallback(
    async (action: Action) => {
      if (!session) return { error: "You're not in this room." };
      try {
        const res = await sendAction(session, action);
        return { error: null, packId: res.packId };
      } catch (error) {
        return { error: error instanceof ApiError ? error.message : "Network error. Try again." };
      }
    },
    [session],
  );

  const reset = useCallback(() => {
    setConn(null);
    setJoinMessage(null);
  }, []);

  return { status, view, message, act, reset };
}
