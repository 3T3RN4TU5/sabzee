import { isRecord, readStored, writeStored } from './storage'
import type { Profile } from './types'

export const AVATAR_COLORS = [
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Sky', value: '#0ea5e9' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Amber', value: '#d97706' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Pink', value: '#ec4899' },
] as const

export const NAME_MIN = 2
export const NAME_MAX = 24
const COLOR_RE = /^#[0-9a-fA-F]{6}$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function validateName(raw: string): string | null {
  const name = raw.trim()
  if (name.length < NAME_MIN) return `Use at least ${NAME_MIN} characters.`
  if (name.length > NAME_MAX) return `Keep it under ${NAME_MAX + 1} characters.`
  return null
}

export function parseProfile(value: unknown): Profile | null {
  if (!isRecord(value) || typeof value.name !== 'string' || typeof value.color !== 'string') return null
  if (validateName(value.name) || !COLOR_RE.test(value.color)) return null
  return { name: value.name.trim(), color: value.color }
}

/** Normalise a name/colour received from another client (presence, typing) before rendering it. */
export function sanitizeIdentity(name: unknown, color: unknown): { name: string; color: string } | null {
  if (typeof name !== 'string' || typeof color !== 'string' || !COLOR_RE.test(color)) return null
  const trimmed = name.trim().slice(0, NAME_MAX)
  return trimmed ? { name: trimmed, color } : null
}

export const loadProfile = (): Profile | null => readStored('profile', parseProfile)
export const saveProfile = (profile: Profile): void => writeStored('profile', profile)

export function randomUUID(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  // Fallback for non-secure contexts (e.g. testing over a LAN IP): RFC 4122 v4 from getRandomValues.
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const hex = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/** Anonymous, stable identity for this browser. Used for grouping, presence and server-side rate limits. */
export function getClientId(): string {
  const existing = readStored('client-id', (v) => (typeof v === 'string' && UUID_RE.test(v) ? v : null))
  if (existing) return existing
  const id = randomUUID()
  writeStored('client-id', id)
  return id
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : name.trim().slice(0, 2)
  return letters.toUpperCase()
}
