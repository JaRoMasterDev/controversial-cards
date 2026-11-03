"use client";

import type { Action } from "@/lib/game/types";

export interface Session {
  code: string;
  playerId: string;
  token: string;
}

// Sessions are per browser tab (sessionStorage): a reload keeps your seat, and several
// tabs can join the same room as different players.
const sessionKey = (code: string) => `cc-session:${code.toUpperCase()}`;
const listeners = new Set<() => void>();

/** Raw stored session string (stable for useSyncExternalStore), or null. */
export function readSessionRaw(code: string): string | null {
  return sessionStorage.getItem(sessionKey(code));
}

export function subscribeSessions(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function saveSession(session: Session): void {
  sessionStorage.setItem(sessionKey(session.code), JSON.stringify(session));
  listeners.forEach((l) => l());
}

export function clearSession(code: string): void {
  sessionStorage.removeItem(sessionKey(code));
  listeners.forEach((l) => l());
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function post<T>(url: string, body: unknown, token?: string): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { "x-player-token": token } : {}) },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? `Request failed (${res.status}).`, res.status);
  return data as T;
}

/** Creates a room, stores the host's session and returns it. */
export async function createRoom(name: string): Promise<Session> {
  const session = await post<Session>("/api/rooms", { name });
  saveSession(session);
  return session;
}

/** Joins a room, stores the session and returns it. */
export async function joinRoom(code: string, name: string): Promise<Session> {
  const session = await post<Session>(`/api/rooms/${encodeURIComponent(code.trim().toUpperCase())}/join`, { name });
  saveSession(session);
  return session;
}

export async function sendAction(session: Session, action: Action): Promise<{ ok: true; packId?: string }> {
  return post(`/api/rooms/${session.code}/action`, action, session.token);
}
