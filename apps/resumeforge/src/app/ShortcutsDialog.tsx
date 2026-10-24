/** Keyboard shortcut reference ("?" in the editor). OWNER: shell agent. */
import { Fragment } from 'react'
import { Kbd, Modal } from '../ui'
import { ALT, IS_MAC, MOD, SHIFT } from './platform.ts'

const GROUPS: { title: string; rows: { keys: string[][]; label: string }[] }[] = [
  {
    title: 'Editing',
    rows: [
      { keys: [[MOD, 'Z']], label: 'Undo' },
      { keys: [[MOD, SHIFT, 'Z'], ...(IS_MAC ? [] : [['Ctrl', 'Y']])], label: 'Redo' },
      { keys: [[MOD, 'S']], label: 'Save (automatic — shows a confirmation)' },
      { keys: [[MOD, 'P']], label: 'Print / save as PDF' },
      { keys: [['Enter']], label: 'In a bullet: add the next bullet' },
      { keys: [['Backspace']], label: 'In an empty bullet: remove it' },
      { keys: [[ALT, '↑'], [ALT, '↓']], label: 'In a bullet: move it up / down' },
      { keys: [[MOD, 'B'], [MOD, 'I']], label: 'In a bullet or description: bold / italic' },
    ],
  },
  {
    title: 'Navigation',
    rows: [
      { keys: [[ALT, '1…4']], label: 'Content / Design / Analysis / Cover letter' },
      { keys: [['?']], label: 'Show this list' },
      { keys: [['Esc']], label: 'Close dialogs and menus' },
    ],
  },
  {
    title: 'Reordering (drag handles)',
    rows: [
      { keys: [['Space']], label: 'Pick up / drop the focused section, entry or bullet' },
      { keys: [['↑'], ['↓']], label: 'Move while picked up' },
      { keys: [['Esc']], label: 'Cancel the move' },
    ],
  },
  {
    title: 'Preview',
    rows: [
      { keys: [[MOD, 'Scroll']], label: 'Zoom the preview' },
      { keys: [['Click']], label: 'Click any part of the resume to edit it' },
    ],
  },
]

export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Keyboard shortcuts" description="Work faster without leaving the keyboard." size="lg">
      <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
        {GROUPS.map((g) => (
          <section key={g.title}>
            <h3 className="mb-2 text-[11px] font-bold tracking-wide text-slate-400 uppercase dark:text-slate-500">{g.title}</h3>
            <dl className="space-y-2">
              {g.rows.map((r) => (
                <div key={r.label} className="flex items-start justify-between gap-3 text-sm">
                  <dt className="text-slate-600 dark:text-slate-300">{r.label}</dt>
                  <dd className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                    {r.keys.map((combo, i) => (
                      <Fragment key={combo.join('+')}>
                        {i > 0 && <span className="text-xs text-slate-400">or</span>}
                        <span className="inline-flex items-center gap-0.5">
                          {combo.map((k) => (
                            <Kbd key={k}>{k}</Kbd>
                          ))}
                        </span>
                      </Fragment>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </Modal>
  )
}
