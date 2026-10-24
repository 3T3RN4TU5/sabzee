/**
 * "Fit to N pages": a pure, ordered list of progressively tighter designs plus a search over it.
 * The caller measures each candidate (renders it and reads the page count) — this module only
 * decides WHAT to try, in this order, gentle first:
 *   1. spacing      → 0.8×       2. line height → 1.3     3. font size → 12 px    4. margins → 10 mm
 *   5. the same four again down to the hard DESIGN_LIMITS minimum.
 * Every candidate changes exactly one notch from the previous one, so the first one that fits is
 * the least intrusive change in this order. React-free.
 */
import { DESIGN_LIMITS } from './design.ts'
import type { Design } from './types.ts'

export type FitKey = 'spacing' | 'lineHeight' | 'fontSize' | 'margin'
export type FitDesign = Pick<Design, FitKey>

type Limits = Record<FitKey, { min: number; max: number; step: number }>

/** Soft floors (stage 1) before going to the hard minimum (stage 2). */
export const FIT_SOFT_FLOORS: FitDesign = { spacing: 0.8, lineHeight: 1.3, fontSize: 12, margin: 10 }
export const FIT_ORDER: FitKey[] = ['spacing', 'lineHeight', 'fontSize', 'margin']

const round = (n: number, step: number) => {
  const decimals = Math.max(0, -Math.floor(Math.log10(step)) + 1)
  return Number((Math.round(n / step) * step).toFixed(decimals))
}

/**
 * Ordered candidate designs (excluding `design` itself). Each is a full Design with one more notch
 * of tightening than the previous. Empty when everything is already at the minimum.
 */
export function fitCandidates(design: Design, limits: Limits = DESIGN_LIMITS, floors: FitDesign = FIT_SOFT_FLOORS): Design[] {
  const out: Design[] = []
  let cur: Design = { ...design }
  for (const stage of [0, 1]) {
    for (const key of FIT_ORDER) {
      const { min, step } = limits[key]
      const floor = stage === 0 ? Math.max(min, floors[key]) : min
      // stepping on the grid: snap first, then one notch at a time
      while (cur[key] - floor > step / 2) {
        const next = Math.max(floor, round(cur[key] - step, step))
        if (next >= cur[key]) break
        cur = { ...cur, [key]: next }
        out.push(cur)
      }
    }
  }
  return out
}

/** Only the four fit fields of `to` that differ from `from` (the patch to apply). */
export function fitPatch(from: Design, to: Design): Partial<FitDesign> {
  const patch: Partial<FitDesign> = {}
  for (const k of FIT_ORDER) if (from[k] !== to[k]) patch[k] = to[k]
  return patch
}

/**
 * Smallest index `i` in [0, n) for which `fits(i)` is true, assuming fits is monotone
 * (false…false true…true). Returns -1 when even the last candidate does not fit.
 * Probes O(log n) candidates — each probe is a real render + measure.
 */
export async function firstFitting(n: number, fits: (i: number) => Promise<boolean>): Promise<number> {
  if (n <= 0) return -1
  if (!(await fits(n - 1))) return -1
  let lo = 0
  let hi = n - 1 // fits(hi) is known true
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (await fits(mid)) hi = mid
    else lo = mid + 1
  }
  return hi
}

/** Below this share of the usable height the last page counts as "nearly empty". */
export const NEARLY_EMPTY = 0.15

/** Should the Design panel suggest fitting to one page less? */
export function lastPageNearlyEmpty(pages: number, lastPageFill: number | null): boolean {
  return pages > 1 && lastPageFill !== null && lastPageFill < NEARLY_EMPTY
}

/** Human summary of what changed, e.g. "spacing 1 → 0.85, font 13 → 12.5 px". */
export function describeFit(from: Design, to: Design): string {
  const label: Record<FitKey, [string, string]> = { spacing: ['spacing', '×'], lineHeight: ['line height', ''], fontSize: ['font', ' px'], margin: ['margins', ' mm'] }
  return FIT_ORDER.filter((k) => from[k] !== to[k])
    .map((k) => `${label[k][0]} ${from[k]} → ${to[k]}${label[k][1]}`)
    .join(', ')
}
