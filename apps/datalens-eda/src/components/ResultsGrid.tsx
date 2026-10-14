import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import type { Table } from 'apache-arrow'
import { cellValue, resultColumns, sortPermutation, type ResultColumn } from '../db/arrow.ts'
import { estimateColumnWidth, formatCell } from '../lib/format.ts'
import { isNumeric } from '../lib/types.ts'
import { cx, Spinner, TypeBadge } from './ui.tsx'

const ROW_H = 28
const HEADER_H = 34
/** Browsers cap element height (~17M px in Firefox); beyond this the scrollbar is scaled. */
const MAX_SCROLL_PX = 8_000_000
const OVERSCAN = 6

export interface GridSort {
  col: number
  dir: 'asc' | 'desc'
}

export interface GridHandle {
  columns: ResultColumn[]
  rowCount: number
  /** Row index in display (sorted) order → underlying row. */
  rowAt: (i: number) => number
}

/**
 * Virtualized results grid: only the rows in view (+ overscan) are in the DOM, and cells are
 * read straight from Arrow vectors, so a million-row result scrolls smoothly.
 */
export function ResultsGrid({
  table,
  onCopy,
  onHandle,
}: {
  table: Table
  onCopy: (text: string) => void
  onHandle?: (h: GridHandle) => void
}) {
  const columns = useMemo(() => resultColumns(table), [table])
  const rowCount = table.numRows
  const scroller = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewH, setViewH] = useState(400)
  const [sort, setSort] = useState<GridSort | null>(null)
  const [perm, setPerm] = useState<Uint32Array | null>(null)
  const [sorting, setSorting] = useState(false)
  const [sel, setSel] = useState<{ r: number; c: number } | null>(null)
  const [widths, setWidths] = useState<number[]>([])

  // Reset view state when a new result arrives.
  useEffect(() => {
    setSort(null)
    setPerm(null)
    setSel(null)
    setScrollTop(0)
    if (scroller.current) scroller.current.scrollTop = 0
    const sample = Math.min(rowCount, 60)
    setWidths(
      columns.map((c) => {
        const vals: string[] = []
        for (let i = 0; i < sample; i++) vals.push(formatCell(cellValue(c, i), c.category))
        return estimateColumnWidth(c.name, vals)
      }),
    )
  }, [table, columns, rowCount])

  useLayoutEffect(() => {
    const el = scroller.current
    if (!el) return
    const ro = new ResizeObserver(() => setViewH(el.clientHeight))
    ro.observe(el)
    setViewH(el.clientHeight)
    return () => ro.disconnect()
  }, [])

  const rowAt = useCallback((i: number) => (perm ? perm[i] : i), [perm])
  useEffect(() => {
    onHandle?.({ columns, rowCount, rowAt })
  }, [columns, rowCount, rowAt, onHandle])

  const toggleSort = (col: number) => {
    const next: GridSort | null = sort?.col !== col ? { col, dir: 'asc' } : sort.dir === 'asc' ? { col, dir: 'desc' } : null
    setSort(next)
    if (!next) {
      setPerm(null)
      return
    }
    setSorting(true)
    // Let the "sorting…" state paint before a potentially long sort.
    setTimeout(() => {
      setPerm(sortPermutation(columns[next.col], rowCount, next.dir))
      setSorting(false)
    }, 16)
  }

  const naturalH = rowCount * ROW_H
  const scaled = naturalH > MAX_SCROLL_PX
  const virtualH = scaled ? MAX_SCROLL_PX : naturalH
  const bodyViewH = Math.max(0, viewH - HEADER_H)
  const visible = Math.ceil(bodyViewH / ROW_H) + 1
  let first: number
  let offset: number
  if (!scaled) {
    first = Math.max(0, Math.floor(scrollTop / ROW_H) - OVERSCAN)
    offset = first * ROW_H
  } else {
    const ratio = Math.min(1, scrollTop / Math.max(1, virtualH - bodyViewH))
    first = Math.floor(ratio * Math.max(0, rowCount - visible + 1))
    offset = scrollTop
  }
  const last = Math.min(rowCount, first + visible + (scaled ? 0 : OVERSCAN * 2))

  const numW = Math.max(48, String(rowCount).length * 8 + 22)
  const totalW = numW + widths.reduce((a, b) => a + b, 0)

  const scrollRowIntoView = (r: number) => {
    const el = scroller.current
    if (!el || scaled) return
    const top = r * ROW_H
    if (top < el.scrollTop) el.scrollTop = top
    else if (top + ROW_H > el.scrollTop + bodyViewH) el.scrollTop = top + ROW_H - bodyViewH
  }

  const copySelected = () => {
    if (!sel) return
    const c = columns[sel.c]
    const v = cellValue(c, rowAt(sel.r))
    onCopy(v == null ? '' : formatCell(v, c.category))
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'c') {
      if (sel && !window.getSelection()?.toString()) {
        e.preventDefault()
        copySelected()
      }
      return
    }
    if (!columns.length || !rowCount) return
    const cur = sel ?? { r: 0, c: 0 }
    const page = Math.max(1, visible - 2)
    let next = cur
    switch (e.key) {
      case 'ArrowDown':
        next = { ...cur, r: Math.min(rowCount - 1, cur.r + 1) }
        break
      case 'ArrowUp':
        next = { ...cur, r: Math.max(0, cur.r - 1) }
        break
      case 'ArrowRight':
        next = { ...cur, c: Math.min(columns.length - 1, cur.c + 1) }
        break
      case 'ArrowLeft':
        next = { ...cur, c: Math.max(0, cur.c - 1) }
        break
      case 'PageDown':
        next = { ...cur, r: Math.min(rowCount - 1, cur.r + page) }
        break
      case 'PageUp':
        next = { ...cur, r: Math.max(0, cur.r - page) }
        break
      case 'Home':
        next = e.ctrlKey || e.metaKey ? { r: 0, c: 0 } : { ...cur, c: 0 }
        break
      case 'End':
        next = e.ctrlKey || e.metaKey ? { r: rowCount - 1, c: columns.length - 1 } : { ...cur, c: columns.length - 1 }
        break
      default:
        return
    }
    e.preventDefault()
    setSel(next)
    scrollRowIntoView(next.r)
  }

  const rows = []
  for (let i = first; i < last; i++) {
    const r = rowAt(i)
    rows.push(
      <div key={i} className="grid-row" role="row" aria-rowindex={i + 2}>
        <div className="grid-cell grid-rownum" style={{ width: numW }} role="rowheader">
          {i + 1}
        </div>
        {columns.map((c, j) => {
          const v = cellValue(c, r)
          const selected = sel?.r === i && sel.c === j
          return (
            <div
              key={j}
              role="gridcell"
              aria-selected={selected || undefined}
              className="grid-cell"
              style={{ width: widths[j] }}
              data-num={isNumeric(c.category) || undefined}
              data-null={v == null || undefined}
              data-selected={selected || undefined}
              title={v != null && typeof v === 'string' && v.length > 40 ? v : undefined}
              onMouseDown={() => setSel({ r: i, c: j })}
              onDoubleClick={() => onCopy(v == null ? '' : formatCell(v, c.category))}
            >
              {formatCell(v, c.category)}
            </div>
          )
        })}
      </div>,
    )
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <div
        ref={scroller}
        className="grid-scroll h-full min-h-0 flex-1 focus-visible:outline-offset-[-2px]"
        tabIndex={0}
        role="grid"
        aria-label="Query results"
        aria-rowcount={rowCount + 1}
        aria-colcount={columns.length + 1}
        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
        onKeyDown={onKeyDown}
      >
        <div style={{ height: HEADER_H + virtualH, width: totalW, position: 'relative' }}>
          <div className="sticky top-0 z-[2] flex border-b border-white/10 bg-slate-900" style={{ height: HEADER_H, width: totalW }} role="row" aria-rowindex={1}>
            <div className="grid-cell grid-rownum !bg-slate-900 !leading-[34px]" style={{ width: numW }} role="columnheader">
              #
            </div>
            {columns.map((c, j) => {
              const active = sort?.col === j
              return (
                <button
                  key={j}
                  type="button"
                  role="columnheader"
                  aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                  className={cx(
                    'group flex flex-none items-center gap-1.5 border-r border-white/[0.06] px-2.5 text-left text-[12px] font-semibold text-slate-200 hover:bg-white/[0.04]',
                    isNumeric(c.category) && 'flex-row-reverse text-right',
                  )}
                  style={{ width: widths[j] }}
                  title={`${c.name} · ${c.arrowType} — click to sort`}
                  onClick={() => toggleSort(j)}
                >
                  <TypeBadge category={c.category} title={c.arrowType} />
                  <span className="min-w-0 flex-1 truncate">{c.name}</span>
                  {active ? (
                    sort.dir === 'asc' ? (
                      <ArrowUp className="size-3.5 shrink-0 text-cyan-300" />
                    ) : (
                      <ArrowDown className="size-3.5 shrink-0 text-cyan-300" />
                    )
                  ) : (
                    <ArrowUpDown className="size-3 shrink-0 text-slate-600 opacity-0 group-hover:opacity-100" />
                  )}
                </button>
              )
            })}
          </div>
          <div style={{ position: 'absolute', top: HEADER_H + offset, left: 0, width: totalW }}>{rows}</div>
        </div>
      </div>
      {sorting && (
        <div className="absolute inset-0 grid place-items-center bg-slate-950/40">
          <div className="flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-[13px] ring-1 ring-white/10">
            <Spinner /> Sorting {rowCount.toLocaleString('en-US')} rows…
          </div>
        </div>
      )}
    </div>
  )
}
