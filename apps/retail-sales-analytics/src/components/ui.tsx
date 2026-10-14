import { AlertTriangle, CheckCircle2, Info, Loader2, RefreshCw, XCircle } from 'lucide-react'
import type { ReactNode } from 'react'

export function Card({
  title,
  subtitle,
  actions,
  footnote,
  children,
  className = '',
  id,
}: {
  title?: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  footnote?: ReactNode
  children: ReactNode
  className?: string
  id?: string
}) {
  return (
    <section className={`card flex min-w-0 flex-col p-4 sm:p-5 ${className}`} aria-labelledby={id && title ? `${id}-title` : undefined}>
      {(title || actions) && (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title && (
              <h2 id={id ? `${id}-title` : undefined} className="text-[15px] font-semibold text-white">
                {title}
              </h2>
            )}
            {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className="min-w-0 flex-1">{children}</div>
      {footnote && <p className="mt-3 border-t border-white/5 pt-3 text-[11px] leading-relaxed text-slate-500">{footnote}</p>}
    </section>
  )
}

export function KpiTile({
  label,
  value,
  delta,
  deltaLabel,
  deltaFormat = 'pct',
  invert = false,
  hint,
}: {
  label: string
  value: string
  delta?: number | null
  deltaLabel?: string
  deltaFormat?: 'pct' | 'pp'
  /** true when a decrease is good (e.g. return rate) */
  invert?: boolean
  hint?: string
}) {
  const has = typeof delta === 'number' && Number.isFinite(delta)
  const up = has && delta > 0
  const flat = has && Math.abs(delta) < 0.0005
  const good = has && !flat && (invert ? !up : up)
  const text = !has
    ? null
    : deltaFormat === 'pp'
      ? `${delta >= 0 ? '+' : '−'}${Math.abs(delta * 100).toFixed(2)} pp`
      : `${delta > 0 ? '+' : delta < 0 ? '−' : '±'}${Math.abs(delta * 100).toFixed(1)}%`
  return (
    <div className="card p-4" title={hint}>
      <p className="eyebrow">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold tracking-tight text-white">{value}</p>
      <p className="mt-1 min-h-4 text-xs text-slate-400">
        {has ? (
          <>
            <span
              className={`num font-semibold ${flat ? 'text-slate-300' : good ? 'text-emerald-400' : 'text-rose-400'}`}
              aria-label={`${up ? 'up' : flat ? 'flat' : 'down'} ${text}`}
            >
              {flat ? '→' : up ? '▲' : '▼'} {text}
            </span>{' '}
            <span className="text-slate-500">{deltaLabel}</span>
          </>
        ) : (
          <span className="text-slate-500">{deltaLabel ?? ' '}</span>
        )}
      </p>
    </div>
  )
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-slate-950/40 p-3">
      <p className="text-[11px] font-medium text-slate-400">{label}</p>
      <p className="num mt-0.5 text-lg font-semibold text-white">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-slate-500">{sub}</p>}
    </div>
  )
}

const STATUS = {
  pass: { icon: CheckCircle2, label: 'Pass', cls: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' },
  warn: { icon: AlertTriangle, label: 'Warn', cls: 'border-amber-400/30 bg-amber-400/10 text-amber-200' },
  fail: { icon: XCircle, label: 'Fail', cls: 'border-rose-500/30 bg-rose-500/10 text-rose-300' },
} as const

export function StatusBadge({ status }: { status: keyof typeof STATUS }) {
  const s = STATUS[status]
  const Icon = s.icon
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${s.cls}`}>
      <Icon className="size-3" aria-hidden /> {s.label}
    </span>
  )
}

export function Callout({
  tone = 'info',
  title,
  children,
}: {
  tone?: 'info' | 'warn' | 'good'
  title?: ReactNode
  children: ReactNode
}) {
  const cls = {
    info: 'border-sky-400/20 bg-sky-400/[0.06] text-sky-100',
    warn: 'border-amber-400/25 bg-amber-400/[0.07] text-amber-100',
    good: 'border-emerald-400/25 bg-emerald-400/[0.07] text-emerald-100',
  }[tone]
  const Icon = tone === 'warn' ? AlertTriangle : tone === 'good' ? CheckCircle2 : Info
  return (
    <div className={`flex gap-3 rounded-xl border p-3.5 text-sm ${cls}`}>
      <Icon className="mt-0.5 size-4 shrink-0 opacity-80" aria-hidden />
      <div className="min-w-0 leading-relaxed">
        {title && <p className="mb-0.5 font-semibold">{title}</p>}
        <div className="text-[13px] opacity-90">{children}</div>
      </div>
    </div>
  )
}

export function PageIntro({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <div className="mb-5">
      <p className="eyebrow text-sky-300/80">{eyebrow}</p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-[28px]">{title}</h1>
      {children && <div className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">{children}</div>}
    </div>
  )
}

export function Loading({ label = 'Loading data…' }: { label?: string }) {
  return (
    <div role="status" className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-sm text-slate-400">
      <Loader2 className="size-6 animate-spin text-sky-400" aria-hidden />
      {label}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="card mx-auto mt-10 max-w-md p-6 text-center">
      <XCircle className="mx-auto size-8 text-rose-400" aria-hidden />
      <p className="mt-3 font-semibold text-white">Something went wrong</p>
      <p className="mt-1 text-sm text-slate-400">{message}</p>
      {onRetry && (
        <button type="button" className="btn mx-auto mt-4" onClick={onRetry}>
          <RefreshCw className="size-3.5" aria-hidden /> Try again
        </button>
      )}
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">
      {children}
    </div>
  )
}

/** Segmented control for small mode switches. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: readonly { value: T; label: string }[]
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** A legend entry: swatch + text label (identity never relies on colour alone). */
export function LegendItem({ color, label, dashed = false, band = false }: { color: string; label: string; dashed?: boolean; band?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-300">
      {band ? (
        <span className="h-2.5 w-4 rounded-sm" style={{ background: color, opacity: 0.35 }} aria-hidden />
      ) : (
        <span
          className="w-4 border-t-2"
          style={{ borderColor: color, borderStyle: dashed ? 'dashed' : 'solid' }}
          aria-hidden
        />
      )}
      {label}
    </span>
  )
}

export function Legend({ children }: { children: ReactNode }) {
  return <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">{children}</div>
}
