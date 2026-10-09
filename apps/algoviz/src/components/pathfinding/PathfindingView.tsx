import { AlertTriangle, CheckCircle2, Loader2, MousePointerClick } from 'lucide-react'
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { getPathAlgorithm } from '../../algorithms/pathfinding/index.ts'
import { usePrefersReducedMotion } from '../../lib/hooks.ts'
import { STORAGE_KEYS, writeStorage } from '../../lib/storage.ts'
import { cn, formatNumber } from '../../lib/utils.ts'
import { StatTile } from '../ui/controls.tsx'
import { Kbd, ViewIntro } from '../ViewIntro.tsx'
import { Board, type BoardSnapshot } from './board.ts'
import { BoardGrid } from './BoardGrid.tsx'
import { GridLegend } from './Legend.tsx'
import { PathToolbar } from './PathToolbar.tsx'
import { loadPathSettings, type PathSettings } from './settings.ts'
import { useBoardSize } from './useBoardSize.ts'

export function PathfindingView({ active }: { active: boolean }) {
  const [settings, setSettings] = useState(loadPathSettings)
  const [board] = useState(() => new Board())
  const snapshot = useSyncExternalStore(board.subscribe, board.getSnapshot)
  const reducedMotion = usePrefersReducedMotion()
  const measureRef = useRef<HTMLDivElement>(null)
  const size = useBoardSize(measureRef)

  useEffect(() => writeStorage(STORAGE_KEYS.pathfinding, settings), [settings])
  useEffect(() => board.configure({ ...settings, reducedMotion }), [board, settings, reducedMotion])
  useEffect(() => () => board.dispose(), [board])

  const rows = size?.rows ?? 0
  const cols = size?.cols ?? 0
  useEffect(() => {
    if (rows > 0 && cols > 0) board.resize(rows, cols)
  }, [board, rows, cols])

  // Leaving the tab finishes any running animation instead of leaving it half-drawn.
  useEffect(() => {
    if (!active) board.skip()
  }, [active, board])

  const algorithm = getPathAlgorithm(settings.algorithm)
  const onChange = (patch: Partial<PathSettings>) => setSettings((prev) => ({ ...prev, ...patch }))

  return (
    <div className="flex flex-col gap-4">
      <ViewIntro
        title="Pathfinding algorithms"
        description="Draw walls and weights, drag the start and target, generate a maze — then watch six search algorithms explore the grid."
        shortcuts={
          <>
            Grid focused: <Kbd>←</Kbd>
            <Kbd>↑</Kbd>
            <Kbd>→</Kbd>
            <Kbd>↓</Kbd> move · <Kbd>Space</Kbd> wall · <Kbd>W</Kbd> weight · <Kbd>S</Kbd>
            <Kbd>T</Kbd> place
          </>
        }
      />
      <PathToolbar
        settings={settings}
        status={snapshot.status}
        onChange={onChange}
        onVisualize={() => board.visualize()}
        onSkip={() => board.skip()}
        onGenerate={(id) => board.generate(id)}
        onClearPath={() => board.clearPath()}
        onClearBoard={() => board.clearTerrain()}
      />

      <section className="card flex flex-col gap-4 p-4 sm:p-5" aria-label="Grid">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-white">{algorithm.name}</h3>
              <Pill tone={algorithm.weighted ? 'amber' : 'slate'}>{algorithm.weighted ? 'Weighted' : 'Unweighted'}</Pill>
              <Pill tone={algorithm.optimal ? 'emerald' : 'rose'}>
                {algorithm.optimal ? `Guarantees shortest path (${algorithm.optimalNote})` : 'No shortest-path guarantee'}
              </Pill>
              <span className="font-mono text-xs text-slate-400">{algorithm.complexity}</span>
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">{algorithm.description}</p>
          </div>
          <SearchStats snapshot={snapshot} />
        </div>

        <StatusLine snapshot={snapshot} />

        <div ref={measureRef} className="min-h-[200px] w-full">
          {snapshot.rows > 0 && size ? (
            <BoardGrid board={board} rows={snapshot.rows} cols={snapshot.cols} cell={size.cell} />
          ) : (
            <div className="grid h-[460px] place-items-center text-slate-500">
              <Loader2 className="size-6 animate-spin" aria-label="Preparing grid" />
            </div>
          )}
        </div>
        <GridLegend />
      </section>
    </div>
  )
}

function Pill({ tone, children }: { tone: 'amber' | 'slate' | 'emerald' | 'rose'; children: ReactNode }) {
  const tones = {
    amber: 'border-amber-400/25 bg-amber-400/10 text-amber-200',
    slate: 'border-white/10 bg-white/5 text-slate-300',
    emerald: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
    rose: 'border-rose-400/25 bg-rose-400/10 text-rose-300',
  }
  return <span className={cn('rounded-full border px-2.5 py-0.5 text-xs font-medium', tones[tone])}>{children}</span>
}

function SearchStats({ snapshot }: { snapshot: BoardSnapshot }) {
  const { stats, status, revealed } = snapshot
  const running = status === 'searching' || status === 'tracing'
  const show = (value: string) => (stats ? value : '—')
  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:w-[30rem]">
      <StatTile label="Visited" value={running ? formatNumber(revealed) : show(formatNumber(stats?.visited ?? 0))} />
      <StatTile label="Path length" value={show(stats?.found ? `${stats.pathLength} steps` : 'none')} />
      <StatTile label="Path cost" value={show(stats?.found ? formatNumber(stats.cost) : '∞')} hint="Open cells cost 1, weights cost 5" />
      <StatTile label="Compute" value={show(`${(stats?.timeMs ?? 0).toFixed(2)} ms`)} hint="Time to run the algorithm itself (no drawing)" />
    </dl>
  )
}

function StatusLine({ snapshot }: { snapshot: BoardSnapshot }) {
  const { status, stats } = snapshot
  let icon: ReactNode = <MousePointerClick className="size-4 text-cyan-300" aria-hidden />
  let text = 'Click and drag to draw walls, drag the start or target to move them, then press Visualize.'
  let tone = 'text-slate-400'
  if (status === 'generating') {
    icon = <Loader2 className="size-4 animate-spin text-cyan-300" aria-hidden />
    text = 'Generating pattern…'
  } else if (status === 'searching') {
    icon = <Loader2 className="size-4 animate-spin text-cyan-300" aria-hidden />
    text = 'Exploring the grid…'
  } else if (status === 'tracing') {
    icon = <Loader2 className="size-4 animate-spin text-amber-300" aria-hidden />
    text = 'Target reached — tracing the path back…'
  } else if (status === 'done' && stats) {
    if (stats.found) {
      icon = <CheckCircle2 className="size-4 text-emerald-400" aria-hidden />
      text = `Path found. Now drag the start, target or walls — the result updates instantly.`
      tone = 'text-emerald-200/90'
    } else {
      icon = <AlertTriangle className="size-4 text-rose-400" aria-hidden />
      text = 'No path — the target is walled off. Erase a wall or move the target to update instantly.'
      tone = 'text-rose-200/90'
    }
  }
  return (
    <p className={cn('flex items-start gap-2 rounded-lg bg-slate-950/40 px-3 py-2 text-sm', tone)}>
      <span className="mt-0.5 shrink-0">{icon}</span>
      {text}
    </p>
  )
}
