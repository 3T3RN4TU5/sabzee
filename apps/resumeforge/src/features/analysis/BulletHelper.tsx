/**
 * Bullet helper: action verbs, STAR/XYZ templates and role examples to insert into an entry.
 * Rendered by the content editor (lazy, from src/app/lazy.ts) inside an entry's bullets list.
 * OWNER: analysis agent (working baseline).
 */
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { BULLET_TEMPLATES, EXAMPLE_BULLETS } from '../../lib/bulletLibrary.ts'
import { resumeActions } from '../../store'
import { cn } from '../../ui'

export interface BulletHelperProps {
  sectionId: string
  entryId: string
  /** When set, choosing a phrase replaces this bullet instead of appending a new one. */
  bulletIndex?: number
  /** The entry's title (role), used to pick relevant examples. */
  role?: string
  /** Called after a bullet was inserted/replaced (e.g. to close a popover). */
  onDone?: () => void
}

export function BulletHelper({ sectionId, entryId, bulletIndex, role, onDone }: BulletHelperProps) {
  const [tab, setTab] = useState<'examples' | 'templates'>('examples')
  const use = (text: string) => {
    if (bulletIndex !== undefined) resumeActions.updateBullet(sectionId, entryId, bulletIndex, text, null)
    else resumeActions.addBullet(sectionId, entryId, text)
    onDone?.()
  }
  const examples = EXAMPLE_BULLETS.find((g) => role && g.role.toLowerCase().split(/\W+/).some((w) => w.length > 3 && role.toLowerCase().includes(w))) ?? EXAMPLE_BULLETS[0]
  return (
    <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <div className="mb-2 flex gap-1 text-xs font-semibold">
        {(['examples', 'templates'] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={cn('rounded-md px-2 py-1 capitalize', tab === t ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500')}>
            {t}
          </button>
        ))}
      </div>
      <ul className="space-y-1">
        {(tab === 'examples' ? examples.bullets : BULLET_TEMPLATES.map((t) => t.pattern)).map((b) => (
          <li key={b}>
            <button type="button" onClick={() => use(b)} className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800">
              <Plus className="mt-0.5 size-3 shrink-0 text-indigo-500" aria-hidden />
              {b}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
