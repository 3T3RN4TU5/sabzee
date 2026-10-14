import { Pause, Play, RotateCcw, StepForward } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { LineChart } from '../../components/charts/LineChart.tsx'
import { Scatter, type ToPx } from '../../components/charts/Scatter.tsx'
import { Button, Card, Segmented, Select, Slider } from '../../components/ui/controls.tsx'
import { assign, inertia, kmeans, kmeansPlusPlus, make2D, randomInit, seededRng, silhouetteScore, updateCentroids, type Dataset2DName, type Matrix } from '../../engine/index.ts'
import { CLASS_RGB, classColor } from '../../lib/colors.ts'
import { num } from '../../lib/format.ts'

type Phase = 'assign' | 'update'

interface KState {
  centroids: Matrix
  labels: Int32Array | null
  phase: Phase
  iteration: number
  trails: number[][]
  converged: boolean
}

export function KMeansSection() {
  const [source, setSource] = useState<Dataset2DName>('blobs')
  const [k, setK] = useState(4)
  const [init, setInit] = useState<'kmeans++' | 'random'>('kmeans++')
  const [seed, setSeed] = useState(3)
  const [playing, setPlaying] = useState(false)
  const ds = useMemo(() => make2D(source, { n: 360, noise: 0.45, seed: 5, classes: 4 }), [source])

  const fresh = useCallback((): KState => {
    const rng = seededRng(seed)
    const C = init === 'kmeans++' ? kmeansPlusPlus(ds.X, k, rng) : randomInit(ds.X, k, rng)
    return { centroids: C, labels: null, phase: 'assign', iteration: 0, trails: Array.from({ length: k }, (_, c) => [C.data[2 * c], C.data[2 * c + 1]]), converged: false }
  }, [ds, k, init, seed])
  // Re-initialise whenever the inputs change (state is keyed by its config).
  const configKey = `${source}|${k}|${init}|${seed}`
  const [run, setRun] = useState<{ key: string; state: KState }>(() => ({ key: configKey, state: fresh() }))
  if (run.key !== configKey) {
    setRun({ key: configKey, state: fresh() })
    setPlaying(false)
  }
  const state = run.state
  const setState = useCallback((f: (s: KState) => KState) => setRun((r) => ({ ...r, state: f(r.state) })), [])

  const step = useCallback(() => {
    setState((s) => {
      if (s.converged) return s
      if (s.phase === 'assign') {
        const labels = assign(ds.X, s.centroids)
        const same = s.labels !== null && labels.every((v, i) => v === s.labels![i])
        return { ...s, labels, phase: 'update', converged: same }
      }
      const C = updateCentroids(ds.X, s.labels!, s.centroids)
      const trails = s.trails.map((t, c) => [...t, C.data[2 * c], C.data[2 * c + 1]])
      return { ...s, centroids: C, phase: 'assign', iteration: s.iteration + 1, trails }
    })
  }, [ds, setState])

  const active = playing && !state.converged
  useEffect(() => {
    if (!active) return
    const t = setTimeout(step, 450)
    return () => clearTimeout(t)
  }, [active, state, step])

  const elbow = useMemo(() => {
    const ks = Array.from({ length: 9 }, (_, i) => i + 1)
    const inert: number[] = []
    const sil: number[] = []
    for (const kk of ks) {
      const r = kmeans(ds.X, kk, { seed: 1, nInit: 3 })
      inert.push(r.inertia)
      sil.push(kk >= 2 ? silhouetteScore(ds.X, r.labels) : NaN)
    }
    return { inert, sil }
  }, [ds])

  const background = useCallback(
    (ctx: CanvasRenderingContext2D, _toPx: ToPx, size: number) => {
      // Voronoi cells of the current centroids.
      const res = 90
      const img = new ImageData(res, res)
      for (let r = 0; r < res; r++) {
        for (let c = 0; c < res; c++) {
          const x = -1 + ((c + 0.5) / res) * 2
          const y = 1 - ((r + 0.5) / res) * 2
          let best = 0
          let bd = Infinity
          for (let j = 0; j < state.centroids.rows; j++) {
            const d = (x - state.centroids.data[2 * j]) ** 2 + (y - state.centroids.data[2 * j + 1]) ** 2
            if (d < bd) {
              bd = d
              best = j
            }
          }
          const col = CLASS_RGB[best % CLASS_RGB.length]
          const i = (r * res + c) * 4
          img.data[i] = 11 + (col[0] - 11) * 0.16
          img.data[i + 1] = 17 + (col[1] - 17) * 0.16
          img.data[i + 2] = 32 + (col[2] - 32) * 0.16
          img.data[i + 3] = 255
        }
      }
      const tmp = document.createElement('canvas')
      tmp.width = res
      tmp.height = res
      tmp.getContext('2d')!.putImageData(img, 0, 0)
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(tmp, 0, 0, size, size)
    },
    [state.centroids],
  )

  const overlay = useCallback(
    (ctx: CanvasRenderingContext2D, toPx: ToPx) => {
      state.trails.forEach((t, c) => {
        ctx.strokeStyle = 'rgba(255,255,255,0.7)'
        ctx.lineWidth = 1.5
        ctx.setLineDash([3, 3])
        ctx.beginPath()
        for (let i = 0; i < t.length; i += 2) {
          const [px, py] = toPx(t[i], t[i + 1])
          if (i === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.stroke()
        ctx.setLineDash([])
        const [px, py] = toPx(state.centroids.data[2 * c], state.centroids.data[2 * c + 1])
        ctx.fillStyle = classColor(c)
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 2.5
        ctx.beginPath()
        ctx.moveTo(px - 8, py - 8)
        ctx.lineTo(px + 8, py + 8)
        ctx.moveTo(px + 8, py - 8)
        ctx.lineTo(px - 8, py + 8)
        ctx.stroke()
        ctx.strokeStyle = classColor(c)
        ctx.lineWidth = 1.5
        ctx.stroke()
      })
    },
    [state],
  )

  const currentInertia = state.labels ? inertia(ds.X, state.labels, state.centroids) : NaN
  const labelsForPlot = state.labels ?? new Int32Array(ds.X.rows).fill(-1)

  return (
    <Card title="k-means++ · step by step">
      <div className="grid gap-5 lg:grid-cols-[250px_minmax(0,1fr)_minmax(0,320px)]">
        <div className="space-y-3">
          <Select<Dataset2DName> label="Dataset" value={source} onChange={setSource} options={[{ value: 'blobs', label: 'Gaussian blobs' }, { value: 'moons', label: 'Moons' }, { value: 'circles', label: 'Circles' }, { value: 'spiral', label: 'Spiral' }]} />
          <Slider label="k (clusters)" value={k} min={1} max={8} onChange={setK} />
          <Segmented label="Initialisation" size="sm" value={init} onChange={setInit} options={[{ value: 'kmeans++', label: 'k-means++' }, { value: 'random', label: 'Random' }]} />
          <div className="flex gap-2">
            <Button onClick={() => setSeed(seed + 1)} title="Re-initialise centroids">
              <RotateCcw size={16} />
            </Button>
            <Button variant="primary" onClick={() => setPlaying(!active)} className="flex-1">
              {active ? <Pause size={16} /> : <Play size={16} />} {active ? 'Pause' : 'Run'}
            </Button>
            <Button onClick={step} title="Next half-step" disabled={state.converged}>
              <StepForward size={16} />
            </Button>
          </div>
          <div className="rounded-lg bg-slate-950/60 p-3 text-xs leading-relaxed text-slate-400">
            <div>
              Iteration <span className="font-mono text-slate-200">{state.iteration}</span> · next:{' '}
              <span className="text-cyan-300">{state.converged ? 'converged ✓' : state.phase === 'assign' ? 'assign points to nearest centroid' : 'move centroids to cluster means'}</span>
            </div>
            <div>
              Inertia <span className="font-mono text-slate-200">{num(currentInertia, 2)}</span>
            </div>
          </div>
        </div>
        <Scatter xy={ds.X.data} labels={labelsForPlot} background={background} overlay={overlay} ariaLabel="k-means clustering: points coloured by cluster with centroid trails" maxSize={460} />
        <div className="space-y-4">
          <div>
            <h4 className="eyebrow mb-1">Elbow · inertia vs k</h4>
            <LineChart series={[{ label: 'inertia', color: '#22d3ee', y: elbow.inert, x: elbow.inert.map((_, i) => i + 1) }]} height={140} markerX={k} formatY={(v) => num(v, 0)} ariaLabel="Inertia for k from 1 to 9" />
          </div>
          <div>
            <h4 className="eyebrow mb-1">Silhouette vs k</h4>
            <LineChart series={[{ label: 'mean silhouette', color: '#a78bfa', y: elbow.sil, x: elbow.sil.map((_, i) => i + 1) }]} height={140} markerX={k} formatY={(v) => num(v, 2)} ariaLabel="Silhouette score for k from 2 to 9" />
          </div>
        </div>
      </div>
    </Card>
  )
}
