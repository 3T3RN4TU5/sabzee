import { useId } from 'react'
import { navigate } from '../store'

/** The ResumeForge mark (same drawing as public/favicon.svg). */
export function LogoMark({ className = 'size-8' }: { className?: string }) {
  const id = useId()
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4f46e5" />
          <stop offset="1" stopColor="#d946ef" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill={`url(#${id})`} />
      <rect x="18" y="12" width="28" height="40" rx="4" fill="#fff" />
      <rect x="23" y="19" width="12" height="4" rx="2" fill="#4f46e5" />
      <rect x="23" y="27" width="18" height="3" rx="1.5" fill="#c7d2fe" />
      <rect x="23" y="33" width="18" height="3" rx="1.5" fill="#c7d2fe" />
      <rect x="23" y="39" width="12" height="3" rx="1.5" fill="#c7d2fe" />
    </svg>
  )
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <a
      href="#/"
      onClick={(e) => {
        e.preventDefault()
        navigate({ name: 'dashboard' })
      }}
      className="flex shrink-0 items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
      aria-label="ResumeForge — all resumes"
      title="All resumes"
    >
      <LogoMark className="size-8 drop-shadow-sm" />
      {!compact && (
        <span className="hidden leading-none sm:block">
          <span className="block text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-white">ResumeForge</span>
          <span className="block text-[11px] text-slate-500 dark:text-slate-400">Resume builder</span>
        </span>
      )}
    </a>
  )
}
