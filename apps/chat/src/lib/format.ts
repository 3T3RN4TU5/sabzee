const timeFormat = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })
const fullFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'full', timeStyle: 'short' })
const dayFormat = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
const dayWithYearFormat = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

export const formatTime = (iso: string) => timeFormat.format(new Date(iso))
export const formatFull = (iso: string) => fullFormat.format(new Date(iso))

/** Local calendar day key, e.g. "2026-10-09". */
export function dayKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** "Today", "Yesterday", "Monday, October 6" (year added when it differs). `todayKey` keeps rendering pure. */
export function dayLabel(iso: string, todayKey: string): string {
  const key = dayKey(iso)
  if (key === todayKey) return 'Today'
  const [y, m, d] = todayKey.split('-').map(Number)
  const yesterday = new Date(y, m - 1, d - 1)
  if (key === dayKey(yesterday.toISOString())) return 'Yesterday'
  const date = new Date(iso)
  return date.getFullYear() === y ? dayFormat.format(date) : dayWithYearFormat.format(date)
}

export const timestampMs = (iso: string) => new Date(iso).getTime()
