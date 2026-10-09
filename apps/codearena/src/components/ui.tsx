import { Circle, CircleCheck, CircleDashed, LoaderCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import type { ProblemStatus } from '../lib/progress.ts'
import type { Difficulty } from '../problems/types.ts'

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const tone = {
    Easy: 'bg-easy/10 text-easy',
    Medium: 'bg-medium/10 text-medium',
    Hard: 'bg-hard/10 text-hard',
  }[difficulty]
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone}`}>{difficulty}</span>
}

const STATUS_LABEL: Record<ProblemStatus, string> = {
  solved: 'Solved',
  attempted: 'Attempted',
  todo: 'Not attempted',
}

export function StatusIcon({ status, className = 'size-4' }: { status: ProblemStatus; className?: string }) {
  const label = STATUS_LABEL[status]
  if (status === 'solved') return <CircleCheck className={`${className} shrink-0 text-pass`} aria-label={label} role="img" />
  if (status === 'attempted') return <CircleDashed className={`${className} shrink-0 text-medium`} aria-label={label} role="img" />
  return <Circle className={`${className} shrink-0 text-line-strong`} aria-label={label} role="img" />
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-line-strong bg-canvas/60 px-1.5 py-px font-mono text-[10px] font-medium text-ink-muted">
      {children}
    </kbd>
  )
}

export function Spinner({ className = 'size-4' }: { className?: string }) {
  return <LoaderCircle className={`${className} animate-spin motion-reduce:animate-none`} aria-hidden />
}

export function EmptyState({
  icon,
  title,
  children,
}: {
  icon: ReactNode
  title: string
  children?: ReactNode
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <div className="grid size-12 place-items-center rounded-2xl border border-line bg-raised text-ink-faint">{icon}</div>
      <p className="font-semibold text-ink">{title}</p>
      {children && <div className="max-w-sm text-sm leading-relaxed text-ink-muted">{children}</div>}
    </div>
  )
}

export function LogoMark({ className = 'size-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id="logo-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fbbf24" />
          <stop offset="1" stopColor="#f97316" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#logo-gradient)" />
      <path
        d="M24 21 13 32l11 11M40 21l11 11-11 11"
        fill="none"
        stroke="#0e1014"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M35 17 29 47" stroke="#0e1014" strokeWidth="5" strokeLinecap="round" />
    </svg>
  )
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-2">
      <LogoMark />
      <span className="text-[15px] font-bold tracking-tight">
        Code<span className="text-accent">Arena</span>
      </span>
    </span>
  )
}

export function GithubIcon({ className = 'size-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  )
}
