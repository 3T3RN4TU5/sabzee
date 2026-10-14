import type { ReactNode } from 'react'

export function Card({ title, eyebrow, actions, children, className = '' }: {
  title?: ReactNode
  eyebrow?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`card p-4 sm:p-5 ${className}`}>
      {(title || eyebrow || actions) && (
        <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            {eyebrow && <div className="eyebrow mb-0.5">{eyebrow}</div>}
            {title && <h2 className="text-[15px] font-semibold text-slate-100">{title}</h2>}
          </div>
          {actions}
        </header>
      )}
      {children}
    </section>
  )
}

export function Stat({ label, value, sub, tone = 'default' }: {
  label: ReactNode
  value: ReactNode
  sub?: ReactNode
  tone?: 'default' | 'good' | 'bad'
}) {
  const color = tone === 'good' ? 'text-emerald-300' : tone === 'bad' ? 'text-rose-300' : 'text-slate-50'
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
      <div className="eyebrow">{label}</div>
      <div className={`mt-0.5 text-xl font-semibold tabular-nums ${color}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-400">{sub}</div>}
    </div>
  )
}

export function Segmented<T extends string>({ value, options, onChange, label }: {
  value: T
  options: { value: T; label: ReactNode }[]
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg border border-white/10 bg-slate-950/60 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
            o.value === value ? 'bg-sky-500/20 text-sky-100 shadow-inner' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Slider({ label, value, min, max, step, onChange, format }: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  format: (v: number) => string
}) {
  const fill = ((value - min) / (max - min)) * 100
  return (
    <label className="block">
      <span className="flex items-baseline justify-between text-xs text-slate-400">
        <span>{label}</span>
        <span className="font-mono text-slate-200">{format(value)}</span>
      </span>
      <input
        type="range"
        className="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ ['--fill' as string]: `${fill}%` }}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  )
}

export function Loading({ label = 'Loading model…' }: { label?: string }) {
  return <div className="card animate-pulse p-10 text-center text-sm text-slate-400">{label}</div>
}
