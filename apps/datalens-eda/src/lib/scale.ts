/** Tiny scale/tick helpers for the hand-rolled SVG charts. Pure and unit-tested. */

/** "Nice" step for a range split into ~count intervals: 1, 2, 2.5 or 5 × 10^k. */
export function niceStep(span: number, count: number): number {
  if (!(span > 0) || !Number.isFinite(span)) return 1
  const raw = span / Math.max(1, count)
  const mag = 10 ** Math.floor(Math.log10(raw))
  const norm = raw / mag
  const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10
  return step * mag
}

/** Rounded domain and ticks that cover [min, max]. */
export function niceTicks(min: number, max: number, count = 5): { domain: [number, number]; ticks: number[] } {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { domain: [0, 1], ticks: [0, 1] }
  if (min === max) {
    const pad = min === 0 ? 1 : Math.abs(min) * 0.1
    min -= pad
    max += pad
  }
  if (min > max) [min, max] = [max, min]
  const step = niceStep(max - min, count)
  const lo = Math.floor(min / step) * step
  const hi = Math.ceil(max / step) * step
  const ticks: number[] = []
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Number(v.toPrecision(12)))
  return { domain: [ticks[0], ticks[ticks.length - 1]], ticks }
}

export function linear(domain: [number, number], range: [number, number]): (v: number) => number {
  const [d0, d1] = domain
  const [r0, r1] = range
  const k = d1 === d0 ? 0 : (r1 - r0) / (d1 - d0)
  return (v) => r0 + (v - d0) * k
}

const DAY = 86_400_000

/** Readable time ticks for an epoch-ms domain. Returns ms values and a label granularity. */
export function timeTicks(min: number, max: number, count = 6): { ticks: number[]; unit: 'year' | 'month' | 'day' | 'hour' } {
  const span = max - min
  if (!(span > 0)) return { ticks: [min], unit: 'day' }
  const d = new Date(min)
  if (span > 3 * 365 * DAY) {
    const step = Math.max(1, Math.round(span / (365 * DAY) / count))
    const ticks: number[] = []
    for (let y = d.getUTCFullYear() + 1; Date.UTC(y, 0, 1) <= max; y += step) ticks.push(Date.UTC(y, 0, 1))
    return { ticks, unit: 'year' }
  }
  if (span > 60 * DAY) {
    const months = span / (30.4 * DAY)
    const step = [1, 2, 3, 6, 12].find((s) => months / s <= count) ?? 12
    const ticks: number[] = []
    for (let k = d.getUTCFullYear() * 12 + d.getUTCMonth() + 1; ; k++) {
      const m = k % 12
      const t = Date.UTC(Math.floor(k / 12), m, 1)
      if (t > max) break
      if (m % step === 0) ticks.push(t)
    }
    return { ticks, unit: 'month' }
  }
  if (span > 2 * DAY) {
    const days = span / DAY
    const step = [1, 2, 7, 14, 28].find((s) => days / s <= count) ?? 28
    const first = Math.ceil(min / DAY) * DAY
    const ticks: number[] = []
    for (let t = first; t <= max; t += step * DAY) ticks.push(t)
    return { ticks, unit: 'day' }
  }
  const hours = span / 3_600_000
  const step = [1, 2, 3, 6, 12, 24].find((s) => hours / s <= count) ?? 24
  const first = Math.ceil(min / 3_600_000) * 3_600_000
  const ticks: number[] = []
  for (let t = first; t <= max; t += step * 3_600_000) ticks.push(t)
  return { ticks, unit: 'hour' }
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function formatTimeTick(ms: number, unit: 'year' | 'month' | 'day' | 'hour'): string {
  const d = new Date(ms)
  switch (unit) {
    case 'year':
      return String(d.getUTCFullYear())
    case 'month':
      return d.getUTCMonth() === 0 ? `${MONTHS[0]} ${d.getUTCFullYear()}` : MONTHS[d.getUTCMonth()]
    case 'day':
      return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`
    case 'hour':
      return `${String(d.getUTCHours()).padStart(2, '0')}:00`
  }
}

/** Sequential color for t in [0, 1] (blue ramp, dark → light on a dark surface). */
const SEQ = ['#0d366b', '#104281', '#184f95', '#1c5cab', '#256abf', '#2a78d6', '#3987e5', '#5598e7', '#6da7ec', '#86b6ef', '#9ec5f4', '#b7d3f6']
export function sequential(t: number): string {
  const x = Math.max(0, Math.min(1, Number.isFinite(t) ? t : 0))
  return SEQ[Math.min(SEQ.length - 1, Math.floor(x * SEQ.length))]
}

/** Diverging blue ↔ gray ↔ red for correlations in [-1, 1]. */
export function diverging(r: number): string {
  if (!Number.isFinite(r)) return '#2c2c2a'
  const t = Math.max(-1, Math.min(1, r))
  const mid: [number, number, number] = [0x38, 0x38, 0x35]
  const pos: [number, number, number] = [0x2a, 0x78, 0xd6]
  const neg: [number, number, number] = [0xe3, 0x49, 0x48]
  const end = t >= 0 ? pos : neg
  const k = Math.abs(t)
  const mix = mid.map((m, i) => Math.round(m + (end[i] - m) * k))
  return `#${mix.map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

/** Categorical palette, dark-surface steps, assigned in fixed order. */
export const SERIES_COLORS = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767']
export const OTHER_COLOR = '#6b6a65'
