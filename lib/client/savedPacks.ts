"use client";

// Card sets the host imported before, kept in localStorage so they can be added to
// another room later without pasting the JSON again.

import { useMemo, useSyncExternalStore } from "react";

export interface SavedPack {
  name: string;
  prompts: string[];
  answers: string[];
}

const STORAGE_KEY = "cc-saved-packs";
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

function readRaw(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function parse(raw: string | null): SavedPack[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.filter(
      (item): item is SavedPack =>
        typeof item === "object" &&
        item !== null &&
        typeof item.name === "string" &&
        isStringArray(item.prompts) &&
        isStringArray(item.answers),
    );
  } catch {
    return [];
  }
}

function write(packs: SavedPack[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(packs));
    notify();
    return true;
  } catch {
    // Storage full or blocked (e.g. private mode).
    return false;
  }
}

export function listSavedPacks(): SavedPack[] {
  return parse(readRaw());
}

/** Saves a card set, replacing an earlier one with the same name. Returns false if storage failed. */
export function savePack(pack: SavedPack): boolean {
  const key = pack.name.trim().toLowerCase();
  const others = listSavedPacks().filter((p) => p.name.trim().toLowerCase() !== key);
  return write([{ name: pack.name, prompts: pack.prompts, answers: pack.answers }, ...others]);
}

export function forgetPack(name: string): void {
  write(listSavedPacks().filter((p) => p.name !== name));
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // Keep other tabs of this browser in sync.
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** The saved card sets, newest first. Empty during server rendering. */
export function useSavedPacks(): SavedPack[] {
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  return useMemo(() => parse(raw), [raw]);
}
