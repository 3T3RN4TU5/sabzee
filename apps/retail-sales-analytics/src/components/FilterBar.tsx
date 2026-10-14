import { RotateCcw, SlidersHorizontal } from 'lucide-react'
import { monthLabel } from '../lib/format.ts'
import type { Filters } from '../lib/cube.ts'
import type { Cube } from '../lib/types.ts'

export function FilterBar({
  cube,
  filters,
  defaults,
  onChange,
  scope,
}: {
  cube: Cube
  filters: Filters
  defaults: Filters
  onChange: (f: Filters) => void
  scope: string
}) {
  const isDefault =
    filters.from === defaults.from &&
    filters.to === defaults.to &&
    filters.country === defaults.country &&
    filters.category === defaults.category
  const last = cube.months.length - 1
  return (
    <div className="card mb-5 p-3 sm:p-4" role="search" aria-label="Dashboard filters">
      <div className="flex flex-wrap items-end gap-3">
        <p className="flex w-full items-center gap-2 text-xs font-semibold text-slate-300 lg:mb-2.5 lg:w-auto">
          <SlidersHorizontal className="size-4 text-sky-400" aria-hidden /> Filters
        </p>
        <label className="w-[calc(50%-0.375rem)] text-xs text-slate-400 sm:w-36">
          From
          <select
            className="select mt-1"
            value={filters.from}
            onChange={(e) => {
              const from = Number(e.target.value)
              onChange({ ...filters, from, to: Math.max(from, filters.to) })
            }}
          >
            {cube.months.map((m, i) => (
              <option key={m} value={i}>
                {monthLabel(m)}
              </option>
            ))}
          </select>
        </label>
        <label className="w-[calc(50%-0.375rem)] text-xs text-slate-400 sm:w-36">
          To
          <select
            className="select mt-1"
            value={filters.to}
            onChange={(e) => {
              const to = Number(e.target.value)
              onChange({ ...filters, to, from: Math.min(filters.from, to) })
            }}
          >
            {cube.months.map((m, i) => (
              <option key={m} value={i}>
                {monthLabel(m)}
                {i === last ? ' (partial)' : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="w-full text-xs text-slate-400 sm:w-48">
          Country
          <select className="select mt-1" value={filters.country} onChange={(e) => onChange({ ...filters, country: Number(e.target.value) })}>
            {cube.countries.map((c, i) => (
              <option key={c} value={i}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="w-full text-xs text-slate-400 sm:w-52">
          Category
          <select className="select mt-1" value={filters.category} onChange={(e) => onChange({ ...filters, category: Number(e.target.value) })}>
            {cube.categories.map((c, i) => (
              <option key={c} value={i}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="btn mb-0.5 py-2" disabled={isDefault} onClick={() => onChange(defaults)}>
          <RotateCcw className="size-3.5" aria-hidden /> Reset
        </button>
        <p className="w-full text-[11px] text-slate-500 lg:ml-auto lg:w-auto lg:max-w-56 lg:text-right">{scope}</p>
      </div>
    </div>
  )
}
