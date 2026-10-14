import { useState, type ReactNode } from 'react'

/** Dark ink on bright cells, light ink on dark ones (WCAG relative luminance). */
function inkFor(color: string): string {
  const m = /^#([0-9a-f]{6})$/i.exec(color)
  if (!m) return 'rgb(255 255 255 / 0.9)'
  const n = parseInt(m[1], 16)
  const lin = (c: number) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  const L = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255)
  return L > 0.3 ? '#020617' : 'rgb(255 255 255 / 0.92)'
}

/** Accessible table-based heatmap: every cell is a real <td> with an aria-label,
 * and hovering/focusing a cell shows its details in a live caption line. */
export function Heatmap({
  rows,
  cols,
  value,
  color,
  cellText,
  describe,
  caption,
  rowHeader = 'Row',
  legend,
  minCell = 34,
}: {
  rows: readonly { key: string; label: ReactNode; sub?: ReactNode }[]
  cols: readonly { key: string; label: ReactNode }[]
  value: (r: number, c: number) => number | null
  color: (v: number) => string
  cellText?: (v: number) => string
  describe: (r: number, c: number, v: number) => string
  caption: string
  rowHeader?: string
  legend?: ReactNode
  minCell?: number
}) {
  const [hover, setHover] = useState<string | null>(null)
  return (
    <div>
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <table className="border-separate border-spacing-[2px] text-[11px]">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              <th scope="col" className="pr-2 text-left font-semibold text-slate-400">
                {rowHeader}
              </th>
              {cols.map((c) => (
                <th key={c.key} scope="col" className="px-0.5 text-center font-medium text-slate-400" style={{ minWidth: minCell }}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={r.key}>
                <th scope="row" className="pr-2 text-left font-medium whitespace-nowrap text-slate-300">
                  {r.label}
                  {r.sub && <span className="ml-1.5 font-normal text-slate-500">{r.sub}</span>}
                </th>
                {cols.map((c, ci) => {
                  const v = value(ri, ci)
                  if (v === null) return <td key={c.key} aria-hidden />
                  const d = describe(ri, ci, v)
                  return (
                    <td
                      key={c.key}
                      tabIndex={0}
                      aria-label={d}
                      onMouseEnter={() => setHover(d)}
                      onFocus={() => setHover(d)}
                      onMouseLeave={() => setHover(null)}
                      onBlur={() => setHover(null)}
                      className="num h-7 cursor-default rounded-[4px] text-center font-medium outline-offset-1 hover:ring-2 hover:ring-white/60"
                      style={{ background: color(v), color: inkFor(color(v)) }}
                    >
                      {cellText?.(v)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex min-h-5 flex-wrap items-center justify-between gap-3 text-xs">
        <p className="text-slate-300" aria-live="polite">
          {hover ?? <span className="text-slate-500">Hover or focus a cell for details.</span>}
        </p>
        {legend}
      </div>
    </div>
  )
}

/** Gradient legend bar for a sequential scale. */
export function RampLegend({ colors, min, max }: { colors: readonly string[]; min: string; max: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-[11px] text-slate-400">
      {min}
      <span className="h-2 w-28 rounded-full" style={{ background: `linear-gradient(to right, ${colors.join(',')})` }} aria-hidden />
      {max}
    </span>
  )
}
