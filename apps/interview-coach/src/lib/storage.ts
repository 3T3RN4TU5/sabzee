"use client";

import { useSyncExternalStore } from "react";
import type { AiMode } from "./constants";
import { InterviewConfigSchema, SessionSchema, type InterviewConfig, type Report, type Session } from "./schemas";

/** Bump the version segment when the stored shape changes incompatibly. */
const KEY_PREFIX = "interview-coach:v1:";
const HISTORY_LIMIT = 30;

type Listener = () => void;

/**
 * A tiny localStorage-backed store for useSyncExternalStore.
 * - Reads are parsed with zod; corrupt or outdated data falls back safely.
 * - The in-memory copy is the source of truth after the first read, so the
 *   app keeps working (for this tab) even when storage is full or blocked.
 * - Changes made in other tabs are picked up through the `storage` event. The
 *   listener is installed on first use (not on first subscribe), so the cache
 *   never goes stale while no component is subscribed — otherwise a write from
 *   this tab could overwrite sessions another tab saved in the meantime.
 */
function createLocalStore<T>(name: string, parse: (raw: unknown) => T, fallback: T) {
  const key = KEY_PREFIX + name;
  const listeners = new Set<Listener>();
  let current: T | undefined;

  const load = (): T => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw === null ? fallback : parse(JSON.parse(raw));
    } catch {
      return fallback;
    }
  };

  const emit = () => listeners.forEach((listener) => listener());

  const read = (): T => {
    if (current === undefined) {
      current = load();
      window.addEventListener("storage", (event) => {
        if (event.key !== key && event.key !== null) return;
        current = load();
        emit();
      });
    }
    return current;
  };

  return {
    getSnapshot: read,
    set(value: T) {
      read();
      current = value;
      try {
        if (value === null) window.localStorage.removeItem(key);
        else window.localStorage.setItem(key, JSON.stringify(value));
      } catch {
        // Storage unavailable (private mode, quota): keep the in-memory value.
      }
      emit();
    },
    subscribe(listener: Listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

const parseSessions = (raw: unknown): Session[] =>
  Array.isArray(raw)
    ? raw.flatMap((item) => {
        const result = SessionSchema.safeParse(item);
        return result.success ? [result.data] : [];
      })
    : [];

const parseSession = (raw: unknown): Session | null => {
  const result = SessionSchema.safeParse(raw);
  return result.success ? result.data : null;
};

const parsePrefs = (raw: unknown): InterviewConfig | null => {
  const result = InterviewConfigSchema.safeParse(raw);
  return result.success ? result.data : null;
};

const historyStore = createLocalStore<Session[]>("history", parseSessions, []);
const activeStore = createLocalStore<Session | null>("active", parseSession, null);
const prefsStore = createLocalStore<InterviewConfig | null>("prefs", parsePrefs, null);

/** `undefined` until the component has hydrated on the client. */
export function useHistory(): Session[] | undefined {
  return useSyncExternalStore<Session[] | undefined>(
    historyStore.subscribe,
    historyStore.getSnapshot,
    () => undefined,
  );
}

export function useActiveSession(): Session | null | undefined {
  return useSyncExternalStore<Session | null | undefined>(
    activeStore.subscribe,
    activeStore.getSnapshot,
    () => undefined,
  );
}

export function usePrefs(): InterviewConfig | null | undefined {
  return useSyncExternalStore<InterviewConfig | null | undefined>(
    prefsStore.subscribe,
    prefsStore.getSnapshot,
    () => undefined,
  );
}

/*
 * Next.js keeps hidden routes alive with <Activity>, and when one is revealed
 * its effects can run once with props from before it was hidden. Effects with
 * side effects therefore check the store's current value through these helpers.
 */
export function getActiveSession(): Session | null {
  return activeStore.getSnapshot();
}

export function setActiveSession(session: Session | null) {
  activeStore.set(session);
}

/** Frees the "active" slot once a finished interview has moved to history. */
export function releaseFinishedSession(id: string) {
  const active = activeStore.getSnapshot();
  if (active?.id === id && active.stage === "complete") activeStore.set(null);
}

export function savePrefs(config: InterviewConfig) {
  prefsStore.set(config);
}

export function saveToHistory(session: Session) {
  const others = historyStore.getSnapshot().filter((item) => item.id !== session.id);
  const next = [session, ...others]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, HISTORY_LIMIT);
  historyStore.set(next);
}

/** Stores a generated report on its session — unless the session was deleted meanwhile. */
export function attachReport(id: string, report: Report, mode: AiMode) {
  const sessions = historyStore.getSnapshot();
  if (!sessions.some((item) => item.id === id)) return;
  historyStore.set(sessions.map((item) => (item.id === id ? { ...item, report, reportMode: mode } : item)));
}

export function deleteFromHistory(id: string) {
  historyStore.set(historyStore.getSnapshot().filter((item) => item.id !== id));
}

export function clearHistory() {
  historyStore.set([]);
}

export function createSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
