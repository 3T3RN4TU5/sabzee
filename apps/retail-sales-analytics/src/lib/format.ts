// Number & date formatting. All money in the dataset is GBP.

const gbp0 = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 })
const gbp2 = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const gbpCompact = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  notation: 'compact',
  maximumFractionDigits: 2,
})
const int = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 })
const compact = new Intl.NumberFormat('en-GB', { notation: 'compact', maximumFractionDigits: 1 })

const isNum = (v: number | null | undefined): v is number => typeof v === 'number' && Number.isFinite(v)

export const fmt = {
  money: (v: number | null | undefined) => (isNum(v) ? gbp0.format(v) : '–'),
  money2: (v: number | null | undefined) => (isNum(v) ? gbp2.format(v) : '–'),
  moneyCompact: (v: number | null | undefined) => (isNum(v) ? gbpCompact.format(v) : '–'),
  int: (v: number | null | undefined) => (isNum(v) ? int.format(v) : '–'),
  compact: (v: number | null | undefined) => (isNum(v) ? compact.format(v) : '–'),
  /** 0.1234 -> "12.3%" */
  pct: (v: number | null | undefined, digits = 1) => (isNum(v) ? `${(v * 100).toFixed(digits)}%` : '–'),
  /** 0.1234 -> "+12.3%" */
  signedPct: (v: number | null | undefined, digits = 1) =>
    isNum(v) ? `${v > 0 ? '+' : v < 0 ? '−' : '±'}${Math.abs(v * 100).toFixed(digits)}%` : '–',
  /** percentage points */
  pp: (v: number | null | undefined, digits = 2) =>
    isNum(v) ? `${v >= 0 ? '+' : '−'}${Math.abs(v * 100).toFixed(digits)} pp` : '–',
  num: (v: number | null | undefined, digits = 2) => (isNum(v) ? v.toFixed(digits) : '–'),
  pValue: (v: number | null | undefined) => (!isNum(v) ? '–' : v < 0.0001 ? '< 0.0001' : v.toFixed(4)),
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "2011-03" -> "Mar 2011"; short: "Mar ’11" */
export function monthLabel(ym: string, short = false): string {
  const [y, m] = ym.split('-')
  const name = MONTHS[Number(m) - 1] ?? m
  return short ? `${name} ’${y.slice(2)}` : `${name} ${y}`
}

/** "2011-03-07" -> "7 Mar 2011" (or "7 Mar" when short) */
export function dateLabel(iso: string, short = false): string {
  const [y, m, d] = iso.split('-')
  const base = `${Number(d)} ${MONTHS[Number(m) - 1]}`
  return short ? base : `${base} ${y}`
}
