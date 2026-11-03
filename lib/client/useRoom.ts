"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { Action, RoomView, ServerEvent } from "@/lib/game/types";
import { ApiError, clearSession, readSessionRaw, sendAction, subscribeSessions, type Session } from "./api";

export type RoomStatus =
  | "loading" // server render / before the tab's session is read
  | "no-session" // not joined yet: show the join form
  | "connecting"
  | "connected"
  | "reconnecting" // stream dropped, the browser is retrying
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

    const source = new EventSource(`/api/rooms/${session.code}/events?token=${encodeURIComponent(token)}`);
    source.onopen = () => update({ status: "connected" });
    source.onerror = () => update({ status: "reconnecting" });
    source.onmessage = (e: MessageEvent<string>) => {
      const event = JSON.parse(e.data) as ServerEvent;
      if (event.type === "state") {
        update({ status: "connected", view: event.view });
        return;
      }
      // Terminal events: stop the browser from reconnecting and forget the seat.
      source.close();
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
    };
    return () => source.close();
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
