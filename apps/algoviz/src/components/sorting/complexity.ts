/** Colour-codes a Big-O string: constant / linear, n log n, sub-quadratic, quadratic. */
export function complexityTone(value: string): string {
  if (value.includes('²')) return 'text-rose-300'
  if (value.includes('^')) return 'text-amber-300'
  if (value.includes('log')) return 'text-cyan-300'
  return 'text-emerald-300'
}
