import type { TypeCategory } from './types.ts'

/** Pure value formatting for the grid, profile cards and chart axes. */

const pad = (n: number, w = 2) => String(n).padStart(w, '0')

export function toMillis(value: unknown): number | null {
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'number') return value
  if (typeof value === 'bigint') return Number(value)
  return null
}

/** `2024-01-05` (UTC). */
export function formatDate(ms: number): string {
  const d = new Date(ms)
  if (Number.isNaN(d.getTime())) return String(ms)
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

/** `2024-01-05 13:04:09` (UTC), with milliseconds only when present. */
export function formatTimestamp(ms: number): string {
  const d = new Date(ms)
  if (Number.isNaN(d.getTime())) return String(ms)
  const base = `${formatDate(ms)} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
  const msPart = d.getUTCMilliseconds()
  return msPart ? `${base}.${pad(msPart, 3)}` : base
}

/** Up to `digits` fraction digits, no trailing zeros, no exponent for normal magnitudes. */
export function formatFloat(n: number, digits = 6): string {
  if (!Number.isFinite(n)) return Number.isNaN(n) ? 'NaN' : n > 0 ? '∞' : '-∞'
  if (n === 0) return '0'
  const abs = Math.abs(n)
  if (abs >= 1e15 || abs < 1e-6) return n.toExponential(3)
  // At most `digits` decimals, and at most ~10 significant digits overall.
  const decimals = Math.min(digits, Math.max(0, 10 - (Math.floor(Math.log10(abs)) + 1)))
  return String(Number(n.toFixed(decimals)))
}

/** Human number with thousands separators: 1234567.891 → `1,234,567.89`. */
export function formatNumber(n: number | bigint | null | undefined, maxFraction = 2): string {
  if (n == null) return '—'
  if (typeof n === 'bigint') return n.toLocaleString('en-US')
  if (!Number.isFinite(n)) return formatFloat(n)
  return n.toLocaleString('en-US', { maximumFractionDigits: Math.abs(n) < 1 && n !== 0 ? Math.max(maxFraction, 4) : maxFraction })
}

/** Compact axis labels: 1200 → `1.2k`, 3_400_000 → `3.4M`. */
export function formatCompact(n: number): string {
  const abs = Math.abs(n)
  const units: [number, string][] = [
    [1e12, 'T'],
    [1e9, 'B'],
    [1e6, 'M'],
    [1e3, 'k'],
  ]
  for (const [size, suffix] of units) {
    if (abs >= size) return `${trimZeros((n / size).toFixed(abs / size >= 100 ? 0 : 1))}${suffix}`
  }
  if (abs === 0) return '0'
  if (abs < 0.01) return n.toExponential(1)
  return trimZeros(n.toFixed(abs >= 100 ? 0 : abs >= 10 ? 1 : 2))
}

function trimZeros(s: string): string {
  return s.includes('.') ? s.replace(/\.?0+$/, '') : s
}

export function formatPercent(fraction: number, digits = 1): string {
  if (!Number.isFinite(fraction)) return '—'
  if (fraction > 0 && fraction < 0.001) return '<0.1%'
  return `${(fraction * 100).toFixed(digits).replace(/\.0+$/, '')}%`
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let v = bytes / 1024
  let i = 0
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${v.toFixed(v >= 100 ? 0 : 1)} ${units[i]}`
}

/** `0.8 ms`, `412 ms`, `2.31 s`, `1m 04s`. */
export function formatDuration(ms: number): string {
  if (ms < 1) return `${ms.toFixed(2)} ms`
  if (ms < 10) return `${ms.toFixed(1)} ms`
  if (ms < 1000) return `${Math.round(ms)} ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(2)} s`
  const m = Math.floor(ms / 60_000)
  return `${m}m ${pad(Math.round((ms % 60_000) / 1000))}s`
}

/** Format a single result cell for display. `null` → `NULL` is handled by the caller (styled differently). */
export function formatCell(value: unknown, category: TypeCategory): string {
  if (value == null) return 'NULL'
  switch (category) {
    case 'date': {
      const ms = toMillis(value)
      return ms == null ? String(value) : formatDate(ms)
    }
    case 'timestamp': {
      const ms = toMillis(value)
      return ms == null ? String(value) : formatTimestamp(ms)
    }
    case 'float':
    case 'decimal':
      return typeof value === 'number' ? formatFloat(value) : String(value)
    case 'boolean':
      return value ? 'true' : 'false'
    case 'list':
    case 'struct':
      return stringifyNested(value)
    case 'blob':
      return value instanceof Uint8Array ? `<${value.length} bytes>` : String(value)
    default:
      return String(value)
  }
}

/** JSON-ish rendering of nested Arrow values (Vectors, Rows, Maps), BigInt-safe. */
export function stringifyNested(value: unknown): string {
  return JSON.stringify(toPlain(value)) ?? String(value)
}

/** Convert Arrow vectors / struct rows / bigint into plain JSON-compatible values. */
export function toPlain(value: unknown): unknown {
  if (value == null) return null
  if (typeof value === 'bigint') {
    return value >= BigInt(Number.MIN_SAFE_INTEGER) && value <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(value) : value.toString()
  }
  if (value instanceof Date) return value.toISOString()
  if (typeof value !== 'object') return value
  const v = value as { toArray?: () => unknown; toJSON?: () => unknown }
  if (Array.isArray(value)) return value.map(toPlain)
  if (ArrayBuffer.isView(value)) return Array.from(value as unknown as ArrayLike<number | bigint>, toPlain)
  if (typeof v.toJSON === 'function') return toPlain(v.toJSON())
  if (typeof v.toArray === 'function') return toPlain(v.toArray())
  if (value instanceof Map) return Object.fromEntries([...value].map(([k, x]) => [String(k), toPlain(x)]))
  return Object.fromEntries(Object.entries(value).map(([k, x]) => [k, toPlain(x)]))
}

/** Rough pixel width estimate used to size grid columns from sampled content. */
export function estimateColumnWidth(header: string, samples: readonly string[], charPx = 7.4, min = 72, max = 360): number {
  let longest = header.length + 5 // room for the badge + sort icon
  for (const s of samples) if (s.length > longest) longest = s.length
  return Math.round(Math.min(max, Math.max(min, longest * charPx + 24)))
}
