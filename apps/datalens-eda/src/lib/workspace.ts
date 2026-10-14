/**
 * Workspace persistence (editor text, query history, saved queries, layout) in localStorage
 * under versioned keys. Reads are validated and fall back to defaults, so corrupted or
 * older data never breaks the app.
 */

export const KEYS = {
  editor: 'datalens:editor:v1',
  history: 'datalens:history:v1',
  saved: 'datalens:saved:v1',
  layout: 'datalens:layout:v1',
} as const

export interface HistoryEntry {
  sql: string
  at: number
  ms?: number
  rows?: number
  error?: string
}

export interface SavedQuery {
  id: string
  name: string
  sql: string
  at: number
}

export interface Layout {
  sidebar: number
  editor: number
}

export const MAX_HISTORY = 100

export function read<T>(key: string, parse: (raw: unknown) => T | null): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? null : parse(JSON.parse(raw))
  } catch {
    return null
  }
}

export function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage full or unavailable — persistence is a convenience.
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

export function parseHistory(raw: unknown): HistoryEntry[] | null {
  if (!Array.isArray(raw)) return null
  return raw
    .filter((e): e is Record<string, unknown> => isRecord(e) && typeof e.sql === 'string' && typeof e.at === 'number')
    .map((e) => ({
      sql: e.sql as string,
      at: e.at as number,
      ms: typeof e.ms === 'number' ? e.ms : undefined,
      rows: typeof e.rows === 'number' ? e.rows : undefined,
      error: typeof e.error === 'string' ? e.error : undefined,
    }))
    .slice(0, MAX_HISTORY)
}

export function parseSaved(raw: unknown): SavedQuery[] | null {
  if (!Array.isArray(raw)) return null
  return raw
    .filter((e): e is Record<string, unknown> => isRecord(e) && typeof e.sql === 'string' && typeof e.name === 'string')
    .map((e) => ({ id: typeof e.id === 'string' ? e.id : crypto.randomUUID(), name: e.name as string, sql: e.sql as string, at: typeof e.at === 'number' ? e.at : 0 }))
}

export function parseLayout(raw: unknown): Layout | null {
  if (!isRecord(raw)) return null
  const n = (v: unknown, lo: number, hi: number, d: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d)
  return { sidebar: n(raw.sidebar, 200, 520, 272), editor: n(raw.editor, 0.15, 0.85, 0.42) }
}

/** Newest first; re-running the same SQL moves it to the top instead of duplicating it. */
export function pushHistory(history: readonly HistoryEntry[], entry: HistoryEntry, max = MAX_HISTORY): HistoryEntry[] {
  const key = entry.sql.trim()
  return [entry, ...history.filter((h) => h.sql.trim() !== key)].slice(0, max)
}

/** Insert or rename-in-place by name (case-insensitive). */
export function upsertSaved(saved: readonly SavedQuery[], name: string, sql: string, now = Date.now()): SavedQuery[] {
  const i = saved.findIndex((s) => s.name.toLowerCase() === name.toLowerCase())
  if (i >= 0) return saved.map((s, j) => (j === i ? { ...s, sql, at: now } : s))
  return [{ id: `${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`, name, sql, at: now }, ...saved]
}

/** First meaningful line of a query, for list titles. */
export function queryTitle(sql: string, max = 60): string {
  const line =
    sql
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l && !l.startsWith('--')) ?? sql.trim()
  return line.length > max ? `${line.slice(0, max - 1)}…` : line
}
