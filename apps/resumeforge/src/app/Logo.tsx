import { navigate } from '../store'

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <a
      href="#/"
      onClick={(e) => {
        e.preventDefault()
        navigate({ name: 'dashboard' })
      }}
      className="flex shrink-0 items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-indigo-500"
      aria-label="ResumeForge — your resumes"
    >
      <span className="grid size-8 place-items-center rounded-xl bg-linear-to-br from-indigo-600 to-fuchsia-500 text-sm font-black text-white shadow-sm shadow-indigo-600/30">R</span>
      {!compact && (
        <span className="hidden leading-none sm:block">
          <span className="block text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-white">ResumeForge</span>
          <span className="block text-[11px] text-slate-500 dark:text-slate-400">Resume builder</span>
        </span>
      )}
    </a>
  )
}
