import { BarChart3, Route, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Segmented } from './ui/controls.tsx'
import type { Tab } from '../config.ts'
import { Kbd } from './ViewIntro.tsx'

interface Guide {
  steps: { id: string; body: ReactNode }[]
  keys: { keys: string[]; action: string }[]
}

const GUIDE: Record<Tab, Guide> = {
  sorting: {
    steps: [
      { id: 'pick', body: <>Pick an <b>algorithm</b>, an <b>input</b> shape and an array size (8–150 bars).</> },
      {
        id: 'play',
        body: (
          <>
            Press <b>Play</b> or step one operation at a time. Every compare, swap and write is recorded up front, so you can also{' '}
            <b>step backwards</b> and <b>scrub the timeline</b>.
          </>
        ),
      },
      {
        id: 'code',
        body: (
          <>
            Follow along in the <b>pseudocode</b> panel — the executing line is highlighted — and watch the live comparison and write counters.
          </>
        ),
      },
      {
        id: 'race',
        body: (
          <>
            Switch to <b>Race</b> mode to run two algorithms on the same input. Each tick advances both by one operation, so the one doing less
            work wins.
          </>
        ),
      },
      { id: 'worst', body: <>Try <b>Quick Sort</b> on a reversed or few-unique input to see its O(n²) worst case.</> },
    ],
    keys: [
      { keys: ['Space'], action: 'Play / pause' },
      { keys: ['←', '→'], action: 'Step (hold Shift for ×10)' },
      { keys: ['Home', 'End'], action: 'Jump to start / end' },
      { keys: ['R'], action: 'Reset' },
      { keys: ['N'], action: 'New array' },
    ],
  },
  pathfinding: {
    steps: [
      {
        id: 'draw',
        body: (
          <>
            <b>Click and drag</b> on the grid to draw walls; start on a wall to erase. Switch the brush to <b>Weight</b> to place cells that
            cost 5 to cross.
          </>
        ),
      },
      { id: 'drag', body: <><b>Drag</b> the green start and red target to move them — touch works too.</> },
      {
        id: 'maze',
        body: (
          <>
            Open <b>Mazes &amp; patterns</b> to generate a recursive-division maze, a perfect DFS maze, random walls or random weights.
          </>
        ),
      },
      {
        id: 'run',
        body: (
          <>
            Choose an algorithm and press <b>Visualize</b>. Weighted algorithms (Dijkstra, A*) route around weights; unweighted ones walk
            straight through them.
          </>
        ),
      },
      { id: 'live', body: <>After a run, keep editing — moving the start, target or walls <b>recomputes instantly</b>.</> },
    ],
    keys: [
      { keys: ['Tab'], action: 'Focus the grid' },
      { keys: ['←', '↑', '→', '↓'], action: 'Move the cell cursor' },
      { keys: ['Space', 'Enter'], action: 'Toggle the brush' },
      { keys: ['W'], action: 'Toggle a weight' },
      { keys: ['S', 'T'], action: 'Place start / target' },
    ],
  },
}

const SECTIONS = [
  { value: 'sorting' as const, label: 'Sorting', icon: <BarChart3 className="size-4" aria-hidden /> },
  { value: 'pathfinding' as const, label: 'Pathfinding', icon: <Route className="size-4" aria-hidden /> },
]

/** Onboarding / help modal built on the native <dialog> (focus trap + Esc for free). */
export function HowToDialog({ open, tab, onClose }: { open: boolean; tab: Tab; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      // React's autoFocus fires before showModal(), when the dialog is still closed.
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby="howto-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(40rem,calc(100%-2rem))] overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 p-0 text-slate-200 shadow-2xl shadow-black/60 backdrop:bg-slate-950/75 backdrop:backdrop-blur-sm"
    >
      {open && <GuideContent key={tab} initial={tab} onClose={onClose} />}
    </dialog>
  )
}

function GuideContent({ initial, onClose }: { initial: Tab; onClose: () => void }) {
  const [section, setSection] = useState<Tab>(initial)
  const guide = GUIDE[section]
  return (
    <div className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow text-cyan-300">Welcome to AlgoViz</p>
          <h2 id="howto-title" className="mt-1 text-xl font-semibold text-white">
            How to use
          </h2>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white" aria-label="Close">
          <X className="size-5" />
        </button>
      </div>

      <Segmented<Tab> label="Guide for" hideLabel className="mt-4" value={section} options={SECTIONS} onChange={setSection} />

      <ol className="mt-5 space-y-3">
        {guide.steps.map((step, k) => (
          <li key={step.id} className="flex gap-3 text-sm leading-relaxed text-slate-300 [&_b]:font-semibold [&_b]:text-white">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-cyan-400/10 text-xs font-semibold text-cyan-300" aria-hidden>
              {k + 1}
            </span>
            <span>{step.body}</span>
          </li>
        ))}
      </ol>

      <h3 className="eyebrow mt-6 mb-2">Keyboard</h3>
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        {guide.keys.map(({ keys, action }) => (
          <div key={action} className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.03] px-3 py-1.5">
            <dt className="whitespace-nowrap">
              {keys.map((key) => (
                <Kbd key={key}>{key}</Kbd>
              ))}
            </dt>
            <dd className="text-right text-slate-400">{action}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          data-autofocus
          onClick={onClose}
          className="rounded-lg bg-linear-to-r from-cyan-400 to-violet-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:brightness-110"
        >
          Got it — let&apos;s go
        </button>
      </div>
    </div>
  )
}
