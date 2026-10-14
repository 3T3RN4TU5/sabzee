// Pure aggregation over the pre-computed KPI cube. No React here so it can be
// tested with plain `node` (scripts/verify-data.ts).
import type { Cube } from './types.ts'

export interface Filters {
  /** inclusive month indices into cube.months */
  from: number
  to: number
  /** 0 = all */
  country: number
  /** 0 = all */
  category: number
}

export interface MonthPoint {
  month: string
  revenue: number
  units: number
  orders: number
  customers: number
  returns: number
}

export interface Kpis {
  revenue: number
  orders: number
  aov: number
  avgCustomers: number
  units: number
  returnRate: number
  months: number
}

/** Monthly series for one (country, category) slice, zero-filled. */
export function series(cube: Cube, country: number, category: number): MonthPoint[] {
  const out: MonthPoint[] = cube.months.map((month) => ({ month, revenue: 0, units: 0, orders: 0, customers: 0, returns: 0 }))
  for (const r of cube.rows) {
    if (r[1] !== country || r[2] !== category) continue
    const p = out[r[0]]
    p.revenue = r[3]
    p.units = r[4]
    p.orders = r[5]
    p.customers = r[6]
    p.returns = r[7]
  }
  return out
}

/** KPIs over months [from, to]. Distinct customers are not additive across
 * months, so the customer KPI is the *average monthly* active customers. */
export function kpis(points: MonthPoint[], from: number, to: number): Kpis {
  const slice = points.slice(from, to + 1)
  const sum = (k: keyof Omit<MonthPoint, 'month'>) => slice.reduce((s, p) => s + p[k], 0)
  const revenue = sum('revenue')
  const orders = sum('orders')
  return {
    revenue,
    orders,
    aov: orders ? revenue / orders : 0,
    avgCustomers: slice.length ? sum('customers') / slice.length : 0,
    units: sum('units'),
    returnRate: revenue ? sum('returns') / revenue : 0,
    months: slice.length,
  }
}

/** Period-over-period change. Compares the selection with the preceding period of
 * equal length; when the extract has no such history (e.g. the full year is
 * selected), compares the second half of the selection with its first half. */
export function deltas(points: MonthPoint[], f: Filters): { label: string; change: Record<keyof Kpis, number | null> } {
  const len = f.to - f.from + 1
  let a: Kpis | null = null
  let b: Kpis | null = null
  let label = 'no comparison period'
  if (f.from - len >= 0) {
    a = kpis(points, f.from - len, f.from - 1)
    b = kpis(points, f.from, f.to)
    label = `vs previous ${len} mo`
  } else if (len >= 2) {
    const half = Math.floor(len / 2)
    a = kpis(points, f.from, f.from + half - 1)
    b = kpis(points, f.to - half + 1, f.to)
    label = `last ${half} vs first ${half} mo of range`
  }
  const keys: (keyof Kpis)[] = ['revenue', 'orders', 'aov', 'avgCustomers', 'units', 'returnRate', 'months']
  const change = Object.fromEntries(
    keys.map((k) => {
      if (!a || !b || !a[k]) return [k, null]
      // return rate is already a ratio: report its change in percentage points
      return [k, k === 'returnRate' ? b[k] - a[k] : b[k] / a[k] - 1]
    }),
  ) as Record<keyof Kpis, number | null>
  return { label, change }
}

/** Revenue by one dimension within the selected months, honouring the other filter. */
export function breakdown(cube: Cube, f: Filters, by: 'country' | 'category'): { index: number; name: string; revenue: number; orders: number }[] {
  const names = by === 'country' ? cube.countries : cube.categories
  const acc = new Map<number, { revenue: number; orders: number }>()
  for (const r of cube.rows) {
    if (r[0] < f.from || r[0] > f.to) continue
    const [dimIdx, otherIdx, otherSel] = by === 'country' ? [r[1], r[2], f.category] : [r[2], r[1], f.country]
    if (dimIdx === 0 || otherIdx !== otherSel) continue
    const cur = acc.get(dimIdx) ?? { revenue: 0, orders: 0 }
    cur.revenue += r[3]
    cur.orders += r[5]
    acc.set(dimIdx, cur)
  }
  return [...acc.entries()]
    .map(([index, v]) => ({ index, name: names[index], ...v }))
    .sort((x, y) => y.revenue - x.revenue)
}
