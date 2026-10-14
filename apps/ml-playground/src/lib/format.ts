export function pct(v: number, digits = 1): string {
  return `${(v * 100).toFixed(digits)}%`
}

export function num(v: number, digits = 3): string {
  if (!Number.isFinite(v)) return '—'
  if (v !== 0 && (Math.abs(v) < 1e-3 || Math.abs(v) >= 1e5)) return v.toExponential(2)
  return v.toFixed(digits)
}

export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}
