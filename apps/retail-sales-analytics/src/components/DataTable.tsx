import { ArrowDown, ArrowUp, ChevronsUpDown, Download } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { downloadCsv, toCsv } from '../lib/csv.ts'
import { Empty } from './ui.tsx'

export interface Column<T> {
  key: string
  header: string
  /** cell renderer (defaults to the csv value) */
  render?: (row: T) => ReactNode
  /** raw value used for sorting and CSV export */
  value: (row: T) => string | number | boolean | null | undefined
  align?: 'left' | 'right'
  sortable?: boolean
  className?: string
}

export function DataTable<T>({
  rows,
  columns,
  csvName,
  initialSort,
  pageSize = 15,
  caption,
  dense = false,
}: {
  rows: readonly T[]
  columns: readonly Column<T>[]
  csvName?: string
  initialSort?: { key: string; dir: 'asc' | 'desc' }
  pageSize?: number
  caption: string
  dense?: boolean
}) {
  const [sort, setSort] = useState(initialSort)
  const [expanded, setExpanded] = useState(false)

  const sorted = useMemo(() => {
    if (!sort) return rows
    const col = columns.find((c) => c.key === sort.key)
    if (!col) return rows
    const dir = sort.dir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const va = col.value(a)
      const vb = col.value(b)
      if (va === vb) return 0
      if (va === null || va === undefined) return 1
      if (vb === null || vb === undefined) return -1
      return (va < vb ? -1 : 1) * dir
    })
  }, [rows, columns, sort])

  const visible = expanded ? sorted : sorted.slice(0, pageSize)

  const toggle = (key: string) =>
    setSort((s) => (s?.key === key ? { key, dir: s.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: 'desc' }))

  if (!rows.length) return <Empty>No rows match the current selection.</Empty>

  return (
    <div>
      <div className="-mx-1 overflow-x-auto px-1">
        <table className="w-full min-w-max border-collapse text-left text-[13px]">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-white/10 text-[11px] tracking-wide text-slate-400 uppercase">
              {columns.map((c) => {
                const active = sort?.key === c.key
                const can = c.sortable !== false
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                    className={`py-2 pr-4 font-semibold last:pr-0 ${c.align === 'right' ? 'text-right' : ''}`}
                  >
                    {can ? (
                      <button
                        type="button"
                        onClick={() => toggle(c.key)}
                        className={`inline-flex items-center gap-1 uppercase hover:text-white ${c.align === 'right' ? 'flex-row-reverse' : ''} ${active ? 'text-slate-200' : ''}`}
                      >
                        {c.header}
                        {active ? (
                          sort.dir === 'asc' ? <ArrowUp className="size-3" aria-hidden /> : <ArrowDown className="size-3" aria-hidden />
                        ) : (
                          <ChevronsUpDown className="size-3 opacity-40" aria-hidden />
                        )}
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {visible.map((r, i) => (
              <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.03]">
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={`${dense ? 'py-1.5' : 'py-2'} pr-4 align-top last:pr-0 ${c.align === 'right' ? 'num text-right' : ''} ${c.className ?? ''}`}
                  >
                    {c.render ? c.render(r) : String(c.value(r) ?? '–')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>
          Showing {visible.length} of {rows.length}
        </span>
        <div className="flex gap-2">
          {rows.length > pageSize && (
            <button type="button" className="btn" onClick={() => setExpanded((e) => !e)}>
              {expanded ? 'Show fewer' : `Show all ${rows.length}`}
            </button>
          )}
          {csvName && (
            <button
              type="button"
              className="btn"
              onClick={() =>
                downloadCsv(`${csvName}.csv`, toCsv(sorted, columns.map((c) => ({ header: c.header, value: c.value }))))
              }
            >
              <Download className="size-3.5" aria-hidden /> CSV
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
