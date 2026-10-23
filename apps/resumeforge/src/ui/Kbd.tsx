import type { ReactNode } from 'react'
import { cn } from './cn.ts'

/** Keyboard key cap. */
export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-slate-200 bg-white px-1.5 font-sans text-[11px] font-semibold text-slate-600 shadow-[0_1px_0_rgb(0_0_0/0.06)] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
        className,
      )}
    >
      {children}
    </kbd>
  )
}
