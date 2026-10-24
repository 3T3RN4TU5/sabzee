import type { CSSProperties } from 'react'
import { sanitizeUrl } from '../../lib/markdown.ts'
import type { Basics, Design, PhotoShape } from '../../lib/types.ts'
import { prettyUrl } from '../../lib/validate.ts'

/** Join class names, skipping falsy values. */
export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

/** Inline style for headings honouring design.headingCase (or use the CSS vars --rf-heading-transform / --rf-heading-tracking). */
export function headingCaseStyle(headingCase: 'upper' | 'normal', tracking = '0.09em'): CSSProperties {
  return headingCase === 'upper' ? { textTransform: 'uppercase', letterSpacing: tracking } : { textTransform: 'none', letterSpacing: 0 }
}

export type ContactKey = 'email' | 'phone' | 'location' | 'website' | 'linkedin' | 'github'

export interface ContactEntry {
  key: ContactKey
  label: string
  /** Display text. */
  value: string
  /** Safe href (mailto:/tel:/https:) or null. */
  href: string | null
}

export const CONTACT_ORDER: ContactKey[] = ['email', 'phone', 'location', 'website', 'linkedin', 'github']

const LABELS: Record<ContactKey, string> = { email: 'Email', phone: 'Phone', location: 'Location', website: 'Website', linkedin: 'LinkedIn', github: 'GitHub' }

/** Non-empty contact fields in display order, with safe hrefs. */
export function contactEntries(b: Basics, include: readonly ContactKey[] = CONTACT_ORDER): ContactEntry[] {
  const out: ContactEntry[] = []
  for (const key of include) {
    const raw = b[key]?.trim()
    if (!raw) continue
    let href: string | null = null
    let value = raw
    if (key === 'email') href = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw) ? `mailto:${raw}` : null
    else if (key === 'phone') href = raw.replace(/[^\d+]/g, '').length >= 6 ? `tel:${raw.replace(/[^\d+]/g, '')}` : null
    else if (key !== 'location') {
      href = sanitizeUrl(raw)
      value = prettyUrl(raw)
    }
    out.push({ key, label: LABELS[key], value, href })
  }
  return out
}

export const PHOTO_RADIUS: Record<PhotoShape, string> = { circle: '50%', rounded: '18%', square: '0' }

/** Will <Photo> render something? (photo present and design.showPhoto on). */
export function hasPhoto(basics: Pick<Basics, 'photo'>, design: Pick<Design, 'showPhoto'>): boolean {
  return design.showPhoto && !!basics.photo
}

/**
 * Display text for a long (already prettified) URL: keeps the host and as much of the path as fits in
 * `max` characters, cutting at a "/" or "-" boundary where possible and ending with "…". The href is
 * untouched, so the link still goes to the full address. Short URLs are returned as-is.
 */
export function shortUrl(url: string, max = 42): string {
  if (url.length <= max) return url
  const slash = url.indexOf('/')
  const host = slash === -1 ? url : url.slice(0, slash)
  if (host.length >= max - 1) return `${url.slice(0, max - 1)}…`
  const budget = max - 1
  let cut = url.slice(0, budget)
  const boundary = Math.max(cut.lastIndexOf('/'), cut.lastIndexOf('-'), cut.lastIndexOf('_'), cut.lastIndexOf('.'))
  // only snap back to a boundary when it keeps most of the budget (and stays inside the path)
  if (boundary > host.length && boundary >= budget * 0.6) cut = url.slice(0, boundary)
  return `${cut}…`
}
