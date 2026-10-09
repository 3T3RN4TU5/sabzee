import type { ReactNode } from 'react'

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="mx-0.5 inline-flex min-w-5 items-center justify-center rounded border border-white/15 bg-white/5 px-1 font-sans text-[11px] text-slate-300">
      {children}
    </kbd>
  )
}

/** Title + one-line description for a tab, with keyboard hints on wide screens. */
export function ViewIntro({ title, description, shortcuts }: { title: string; description: string; shortcuts: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
      <div className="min-w-0">
        <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">{title}</h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">{description}</p>
      </div>
      <p className="hidden text-xs text-slate-400 lg:block">{shortcuts}</p>
    </div>
  )
}
