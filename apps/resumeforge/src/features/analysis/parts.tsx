/** Small presentational pieces shared by the ATS check and job-match tabs. */
import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../ui'

export type Tone = 'emerald' | 'indigo' | 'amber' | 'rose' | 'sky' | 'slate'

const TONE_TEXT: Record<Tone, string> = {
  emerald: 'text-emerald-500 dark:text-emerald-400',
  indigo: 'text-indigo-500 dark:text-indigo-400',
  amber: 'text-amber-500 dark:text-amber-400',
  rose: 'text-rose-500 dark:text-rose-400',
  sky: 'text-sky-500 dark:text-sky-400',
  slate: 'text-slate-400 dark:text-slate-500',
}

const TONE_BG: Record<Tone, string> = {
  emerald: 'bg-emerald-500 dark:bg-emerald-400',
  indigo: 'bg-indigo-500 dark:bg-indigo-400',
  amber: 'bg-amber-500 dark:bg-amber-400',
  rose: 'bg-rose-500 dark:bg-rose-400',
  sky: 'bg-sky-500 dark:bg-sky-400',
  slate: 'bg-slate-400 dark:bg-slate-500',
}

const TONE_PILL: Record<Tone, string> = {
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20',
  indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-600/15 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-400/20',
  amber: 'bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/20',
  rose: 'bg-rose-50 text-rose-700 ring-rose-600/15 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/20',
  sky: 'bg-sky-50 text-sky-700 ring-sky-600/15 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-400/20',
  slate: 'bg-slate-100 text-slate-600 ring-slate-500/15 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-600/40',
}

export function Card({ children, className, ...rest }: { children: ReactNode; className?: string } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800', className)} {...rest}>
      {children}
    </div>
  )
}

export function CardTitle({ children, aside, sub }: { children: ReactNode; aside?: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
      <div className="min-w-0">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">{children}</h3>
        {sub && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{sub}</p>}
      </div>
      {aside && <div className="flex shrink-0 flex-wrap items-center gap-1.5">{aside}</div>}
    </div>
  )
}

export function Pill({ tone = 'slate', children, className, title }: { tone?: Tone; children: ReactNode; className?: string; title?: string }) {
  return (
    <span title={title} className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] leading-4 font-semibold ring-1 ring-inset', TONE_PILL[tone], className)}>
      {children}
    </span>
  )
}

/** Circular gauge (0–100) with the value in the middle. */
export function ScoreRing({ value, tone, size = 96, label, caption }: { value: number; tone: Tone; size?: number; label: string; caption?: ReactNode }) {
  const r = 42
  const c = 2 * Math.PI * r
  const v = Math.max(0, Math.min(100, value))
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="9" className="stroke-slate-100 dark:stroke-slate-800" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          strokeWidth="9"
          strokeLinecap="round"
          stroke="currentColor"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v / 100)}
          className={cn('transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none', TONE_TEXT[tone])}
        />
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center" aria-hidden>
        <span className="text-[1.65rem] leading-none font-extrabold tracking-tight text-slate-900 tabular-nums dark:text-white" style={{ fontSize: size * 0.29 }}>
          {Math.round(value)}
        </span>
        {caption && <span className="mt-0.5 text-[10px] font-semibold tracking-wide text-slate-400 uppercase dark:text-slate-500">{caption}</span>}
      </div>
    </div>
  )
}

/** Horizontal progress bar. */
export function Bar({ value, max = 100, tone, label }: { value: number; max?: number; tone: Tone; label?: string }) {
  const pct = max ? Math.max(0, Math.min(100, (value / max) * 100)) : 0
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" role="meter" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={label}>
      <div className={cn('h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none', TONE_BG[tone])} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200/70 dark:bg-slate-800/50 dark:ring-slate-700/60">
      <p className="truncate text-[11px] font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">{label}</p>
      <p className="mt-0.5 text-lg leading-tight font-bold text-slate-900 tabular-nums dark:text-white">{value}</p>
      {sub && <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{sub}</p>}
    </div>
  )
}

/** Accessible segmented control (radio group semantics). */
export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            'rounded-md px-2 py-1 text-[11px] font-semibold transition focus-visible:outline-2 focus-visible:outline-indigo-500',
            value === o.id ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
