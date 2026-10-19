import type { DateFormat } from './types.ts'

export const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const ISO_MONTH = /^(\d{4})-(\d{2})$/
const ISO_YEAR = /^(\d{4})$/

export interface YearMonth {
  year: number
  /** 1–12, or 0 when only the year is known. */
  month: number
}

/** Parse a stored value ('YYYY-MM', 'YYYY' or 'YYYY-MM-DD'). Returns null for free text. */
export function parseStored(value: string): YearMonth | null {
  const v = value.trim()
  let m = ISO_MONTH.exec(v) ?? /^(\d{4})-(\d{2})-\d{2}$/.exec(v)
  if (m) {
    const month = Number(m[2])
    if (month >= 1 && month <= 12) return { year: Number(m[1]), month }
    return null
  }
  m = ISO_YEAR.exec(v)
  return m ? { year: Number(m[1]), month: 0 } : null
}

export function toStored(ym: YearMonth): string {
  return ym.month ? `${ym.year}-${String(ym.month).padStart(2, '0')}` : String(ym.year)
}

/**
 * Convert free-text dates from the v1 app ("Jul 2024", "July 2024", "07/2024", "2024", "Present")
 * into the stored 'YYYY-MM' / 'YYYY' format. Unknown text is returned unchanged.
 */
export function parseLooseDate(input: string): { value: string; present: boolean } {
  const s = input.trim()
  if (!s) return { value: '', present: false }
  if (/^(present|current|now|ongoing|today)$/i.test(s)) return { value: '', present: true }
  if (parseStored(s)) return { value: toStored(parseStored(s)!), present: false }
  const words = /^([A-Za-z]{3,9})\.?,?\s+(\d{4})$/.exec(s)
  if (words) {
    const name = words[1].toLowerCase()
    const idx = MONTHS_LONG.findIndex((m) => m.toLowerCase().startsWith(name.slice(0, 3)))
    if (idx >= 0 && (name.length === 3 || MONTHS_LONG[idx].toLowerCase().startsWith(name))) {
      return { value: `${words[2]}-${String(idx + 1).padStart(2, '0')}`, present: false }
    }
  }
  const slash = /^(\d{1,2})\s*[/.-]\s*(\d{4})$/.exec(s)
  if (slash && Number(slash[1]) >= 1 && Number(slash[1]) <= 12) {
    return { value: `${slash[2]}-${slash[1].padStart(2, '0')}`, present: false }
  }
  return { value: s, present: false }
}

/** Format a stored date for display. Free text is passed through untouched. */
export function formatDate(value: string, format: DateFormat): string {
  const ym = parseStored(value)
  if (!ym) return value.trim()
  if (format === 'YYYY' || !ym.month) return String(ym.year)
  switch (format) {
    case 'MMMM YYYY':
      return `${MONTHS_LONG[ym.month - 1]} ${ym.year}`
    case 'MM/YYYY':
      return `${String(ym.month).padStart(2, '0')}/${ym.year}`
    default:
      return `${MONTHS_SHORT[ym.month - 1]} ${ym.year}`
  }
}

export function formatRange(start: string, end: string, current: boolean, format: DateFormat, presentLabel = 'Present'): string {
  const a = formatDate(start, format)
  const b = current ? presentLabel : formatDate(end, format)
  if (a && b) return a === b ? a : `${a} – ${b}`
  return a || b
}

/** Months between two stored dates (end defaults to `now`). Returns 0 when unparseable. */
export function monthsBetween(start: string, end: string, current: boolean, now = new Date()): number {
  const a = parseStored(start)
  if (!a) return 0
  const b = current || !end.trim() ? { year: now.getFullYear(), month: now.getMonth() + 1 } : parseStored(end)
  if (!b) return 0
  const months = (b.year - a.year) * 12 + ((b.month || 12) - (a.month || 1)) + 1
  return Math.max(0, months)
}

/** Compare stored dates; returns true when end is before start. */
export function isReversed(start: string, end: string): boolean {
  const a = parseStored(start)
  const b = parseStored(end)
  if (!a || !b) return false
  return b.year * 12 + (b.month || 12) < a.year * 12 + (a.month || 1)
}

export function formatLongDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return iso
  return `${Number(m[3])} ${MONTHS_LONG[Number(m[2]) - 1]} ${m[1]}`
}
