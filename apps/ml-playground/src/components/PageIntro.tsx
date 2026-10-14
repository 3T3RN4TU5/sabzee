import type { ReactNode } from 'react'

export function PageIntro({ title, lead, children }: { title: string; lead: ReactNode; children?: ReactNode }) {
  return (
    <header className="max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-400 sm:text-base">{lead}</p>
      {children}
    </header>
  )
}
