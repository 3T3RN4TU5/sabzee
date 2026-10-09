/**
 * Best-effort, versioned localStorage helpers. Keys carry a `:vN` suffix so a
 * future shape change can simply bump the version instead of migrating.
 * Reads are validated by the caller and fall back to defaults on any error
 * (private mode, quota, corrupted JSON, older shapes).
 */
export const STORAGE_KEYS = {
  sorting: 'algoviz:sorting:v1',
  pathfinding: 'algoviz:pathfinding:v1',
  grid: 'algoviz:grid:v1',
  onboarded: 'algoviz:onboarded:v1',
} as const

export function readStorage<T>(key: string, parse: (raw: unknown) => T | null): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? null : parse(JSON.parse(raw))
  } catch {
    return null
  }
}

export function writeStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage full or unavailable — persistence is a convenience, not a requirement.
  }
}

export const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

/** Returns `value` if it is one of `allowed`, otherwise `fallback`. */
export function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback
}

/** Returns `value` clamped to [min, max] if it is a finite integer, otherwise `fallback`. */
export function intInRange(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === 'number' && Number.isInteger(value) ? Math.min(max, Math.max(min, value)) : fallback
}
