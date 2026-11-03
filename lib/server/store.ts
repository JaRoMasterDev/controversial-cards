// In-memory room registry: no database. Rooms live in this server process and vanish on
// restart. Owns everything with side effects around the pure engine: room codes,
// live connections (SSE), presence tracking and the automatic next-round timer.

import "server-only";

import {
  addPlayer,
  applyAction,
  createRoom,
  findPlayerByToken,
  GameError,
  nextRound,
  setActive,
  toView,
} from "@/lib/game/engine";
import type { Action, Room, ServerEvent } from "@/lib/game/types";

/** How long a player may be disconnected (e.g. a page reload) before counting as away. */
const PRESENCE_GRACE_MS = 15_000;
/** Rooms nobody is connected to are deleted after this long without activity. */
const IDLE_ROOM_TTL_MS = 60 * 60_000;
const SWEEP_INTERVAL_MS = 5 * 60_000;
const MAX_ROOMS = 1000;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I or O
const CODE_LENGTH = 4;

export interface Connection {
  playerId: string;
  send(event: ServerEvent): void;
  close(): void;
}

interface RoomEntry {
  room: Room;
  connections: Set<Connection>;
  presenceTimers: Map<string, ReturnType<typeof setTimeout>>;
  nextRoundTimer: { round: number; timeout: ReturnType<typeof setTimeout> } | null;
  /** Players removed since the last publish, so their open streams learn why. */
  removed: Map<string, "kicked" | "left">;
}

export interface Session {
  code: string;
  playerId: string;
  token: string;
}

class RoomStore {
  private rooms = new Map<string, RoomEntry>();

  constructor() {
    setInterval(() => this.sweep(), SWEEP_INTERVAL_MS).unref?.();
  }

  create(hostName: unknown): Session {
    if (this.rooms.size >= MAX_ROOMS) throw new GameError("The server is full. Try again later.", 503);
    const code = this.newCode();
    const { room, player } = createRoom(code, hostName as string);
    const entry: RoomEntry = {
      room,
      connections: new Set(),
      presenceTimers: new Map(),
      nextRoundTimer: null,
      removed: new Map(),
    };
    this.rooms.set(code, entry);
    this.schedulePresenceCheck(entry, player.id);
    return { code, playerId: player.id, token: player.token };
  }

  join(code: string, name: unknown): Session {
    const entry = this.get(code);
    const player = addPlayer(entry.room, name as string);
    this.schedulePresenceCheck(entry, player.id);
    this.changed(entry);
    return { code: entry.room.code, playerId: player.id, token: player.token };
  }

  act(code: string, token: string, action: Action): { packId?: string } {
    const entry = this.get(code);
    const player = this.authenticate(entry, token);
    if (action?.type === "kick" && typeof action.playerId === "string") entry.removed.set(action.playerId, "kicked");
    if (action?.type === "leave") entry.removed.set(player.id, "left");
    let result: { packId?: string };
    try {
      result = applyAction(entry.room, player.id, action);
    } catch (error) {
      entry.removed.clear();
      throw error;
    }
    if (entry.room.players.length === 0) this.delete(entry);
    else this.changed(entry);
    return result;
  }

  /** Registers a live stream. Returns a function to call when it disconnects. */
  connect(code: string, token: string, handlers: Omit<Connection, "playerId">): () => void {
    const entry = this.get(code);
    const player = this.authenticate(entry, token);
    const connection: Connection = { playerId: player.id, ...handlers };
    entry.connections.add(connection);
    this.clearPresenceTimer(entry, player.id);

    if (!player.active) {
      setActive(entry.room, player.id, true);
      this.changed(entry);
    } else {
      connection.send({ type: "state", view: toView(entry.room, player.id) });
    }

    return () => {
      entry.connections.delete(connection);
      if (this.rooms.get(entry.room.code) !== entry) return;
      if (!this.isConnected(entry, connection.playerId)) this.schedulePresenceCheck(entry, connection.playerId);
    };
  }

  private get(code: string): RoomEntry {
    const entry = this.rooms.get(normalizeCode(code));
    if (!entry) throw new GameError("Room not found. Check the code and try again.", 404);
    return entry;
  }

  private authenticate(entry: RoomEntry, token: string) {
    const player = typeof token === "string" && token ? findPlayerByToken(entry.room, token) : undefined;
    if (!player) throw new GameError("You're not in this room. Join it first.", 401);
    return player;
  }

  /** Pushes fresh state to every stream and keeps timers in line with the new phase. */
  private changed(entry: RoomEntry): void {
    const { room } = entry;
    for (const conn of entry.connections) {
      const reason = entry.removed.get(conn.playerId);
      if (reason || !room.players.some((p) => p.id === conn.playerId)) {
        conn.send({ type: "removed", reason: reason ?? "kicked" });
        conn.close();
        entry.connections.delete(conn);
        continue;
      }
      conn.send({ type: "state", view: toView(room, conn.playerId) });
    }
    for (const id of entry.removed.keys()) this.clearPresenceTimer(entry, id);
    entry.removed.clear();
    this.syncNextRoundTimer(entry);
  }

  private syncNextRoundTimer(entry: RoomEntry): void {
    const { room } = entry;
    const due = room.phase === "roundResult" && room.round?.nextRoundAt ? room.round : null;
    if (entry.nextRoundTimer && entry.nextRoundTimer.round !== due?.number) {
      clearTimeout(entry.nextRoundTimer.timeout);
      entry.nextRoundTimer = null;
    }
    if (due && !entry.nextRoundTimer) {
      const timeout = setTimeout(
        () => {
          entry.nextRoundTimer = null;
          if (room.phase !== "roundResult" || room.round?.number !== due.number) return;
          nextRound(room);
          this.changed(entry);
        },
        Math.max(0, due.nextRoundAt! - Date.now()),
      );
      entry.nextRoundTimer = { round: due.number, timeout };
    }
  }

  private schedulePresenceCheck(entry: RoomEntry, playerId: string): void {
    this.clearPresenceTimer(entry, playerId);
    const timeout = setTimeout(() => {
      entry.presenceTimers.delete(playerId);
      if (this.rooms.get(entry.room.code) !== entry || this.isConnected(entry, playerId)) return;
      setActive(entry.room, playerId, false);
      this.changed(entry);
    }, PRESENCE_GRACE_MS);
    entry.presenceTimers.set(playerId, timeout);
  }

  private clearPresenceTimer(entry: RoomEntry, playerId: string): void {
    const timeout = entry.presenceTimers.get(playerId);
    if (timeout) clearTimeout(timeout);
    entry.presenceTimers.delete(playerId);
  }

  private isConnected(entry: RoomEntry, playerId: string): boolean {
    for (const conn of entry.connections) if (conn.playerId === playerId) return true;
    return false;
  }

  private delete(entry: RoomEntry): void {
    for (const timeout of entry.presenceTimers.values()) clearTimeout(timeout);
    if (entry.nextRoundTimer) clearTimeout(entry.nextRoundTimer.timeout);
    for (const conn of entry.connections) {
      conn.send({ type: "removed", reason: entry.removed.get(conn.playerId) ?? "left" });
      conn.close();
    }
    this.rooms.delete(entry.room.code);
  }

  private sweep(): void {
    const cutoff = Date.now() - IDLE_ROOM_TTL_MS;
    for (const entry of this.rooms.values()) {
      if (entry.connections.size === 0 && entry.room.updatedAt < cutoff) this.delete(entry);
    }
  }

  private newCode(): string {
    for (let attempt = 0; attempt < 50; attempt++) {
      const bytes = crypto.getRandomValues(new Uint32Array(CODE_LENGTH));
      const code = Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
      if (!this.rooms.has(code)) return code;
    }
    throw new GameError("Couldn't create a room code. Try again.", 503);
  }
}

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

// One store per server process. Kept on globalThis so every route handler (and dev hot
// reloads) share the same rooms.
const globalStore = globalThis as typeof globalThis & { __roomStore?: RoomStore };
export const store = (globalStore.__roomStore ??= new RoomStore());
