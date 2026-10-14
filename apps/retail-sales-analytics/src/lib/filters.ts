import type { Filters } from './cube.ts'
import type { Cube } from './types.ts'

/** Default view: the 12 complete months (Dec 2010 – Nov 2011); Dec 2011 is partial. */
export function defaultFilters(cube: Cube): Filters {
  return { from: 0, to: Math.max(0, cube.months.length - 2), country: 0, category: 0 }
}

export function filtersFromParams(cube: Cube, p: URLSearchParams): Filters {
  const d = defaultFilters(cube)
  const mi = (key: string, fallback: number) => {
    const i = cube.months.indexOf(p.get(key) ?? '')
    return i >= 0 ? i : fallback
  }
  let from = mi('from', d.from)
  let to = mi('to', d.to)
  if (from > to) [from, to] = [to, from]
  const country = Math.max(0, cube.countries.indexOf(p.get('country') ?? ''))
  const category = Math.max(0, cube.categories.indexOf(p.get('category') ?? ''))
  return { from, to, country, category }
}

export function paramsFromFilters(cube: Cube, f: Filters): URLSearchParams {
  const d = defaultFilters(cube)
  const p = new URLSearchParams()
  if (f.from !== d.from) p.set('from', cube.months[f.from])
  if (f.to !== d.to) p.set('to', cube.months[f.to])
  if (f.country) p.set('country', cube.countries[f.country])
  if (f.category) p.set('category', cube.categories[f.category])
  return p
}
