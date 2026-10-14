import type { ReactNode } from 'react'

export interface TooltipItem {
  name?: ReactNode
  value?: unknown
  color?: string
  dataKey?: unknown
  payload?: unknown
}

/** Shared tooltip body for Recharts' `content` prop. */
export function ChartTooltip({
  active,
  payload,
  label,
  labelFormat,
  valueFormat,
  extra,
}: {
  active?: boolean
  payload?: readonly TooltipItem[]
  label?: ReactNode
  labelFormat?: (label: ReactNode) => ReactNode
  valueFormat?: (value: number, item: TooltipItem) => ReactNode
  extra?: (payload: readonly TooltipItem[]) => ReactNode
}) {
  if (!active || !payload?.length) return null
  const items = payload.filter((p) => p.value !== undefined && p.value !== null)
  return (
    <div className="pointer-events-none min-w-40 rounded-lg border border-white/10 bg-slate-950/95 px-3 py-2 text-xs shadow-xl shadow-black/40">
      {label !== undefined && <p className="mb-1.5 font-semibold text-slate-100">{labelFormat ? labelFormat(label) : label}</p>}
      <ul className="space-y-1">
        {items.map((p, i) => (
          <li key={i} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="size-2 rounded-full" style={{ background: p.color }} aria-hidden />
              {p.name}
            </span>
            <span className="num font-medium text-slate-100">
              {Array.isArray(p.value)
                ? p.value.map((v) => (valueFormat ? valueFormat(Number(v), p) : String(v))).reduce<ReactNode[]>((acc, v, j) => (j ? [...acc, ' – ', v] : [v]), [])
                : valueFormat
                  ? valueFormat(Number(p.value), p)
                  : String(p.value)}
            </span>
          </li>
        ))}
      </ul>
      {extra?.(payload)}
    </div>
  )
}
