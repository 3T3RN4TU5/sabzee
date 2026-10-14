import { Pause, Play, RotateCcw, StepForward } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LineChart } from '../components/charts/LineChart.tsx'
import { PageIntro } from '../components/PageIntro.tsx'
import { Tex } from '../components/Tex.tsx'
import { Button, Card, Segmented, StepSlider } from '../components/ui/controls.tsx'
import { OPTIMIZER_LABELS, SURFACES, SurfaceRunner, type OptimizerName, type Surface, type SurfaceName } from '../engine/index.ts'
import { setupCanvas } from '../lib/canvas.ts'
import { OPTIMIZER_COLORS, viridis } from '../lib/colors.ts'
import { marchingSquares } from '../lib/contour.ts'
import { cn, num } from '../lib/format.ts'
import { useAnimationFrame, useElementWidth } from '../lib/hooks.ts'

const RACERS: OptimizerName[] = ['sgd', 'momentum', 'nesterov', 'rmsprop', 'adam']
const LR_SCALES = [0.25, 0.5, 1, 2, 4] as const
const MAX_STEPS = 3000
const FIELD_RES = 180

/** Map the surface to a log-compressed field for colouring and contours. */
function surfaceField(s: Surface) {
  const { xMin, xMax, yMin, yMax } = s.domain
  const raw = new Float64Array(FIELD_RES * FIELD_RES)
  let fmin = Infinity
  for (let r = 0; r < FIELD_RES; r++) {
    for (let c = 0; c < FIELD_RES; c++) {
      const x = xMin + (c / (FIELD_RES - 1)) * (xMax - xMin)
      const y = yMax - (r / (FIELD_RES - 1)) * (yMax - yMin)
      const v = s.f(x, y)
      raw[r * FIELD_RES + c] = v
      fmin = Math.min(fmin, v)
    }
  }
  for (const [mx, my] of s.minima) fmin = Math.min(fmin, s.f(mx, my))
  const field = raw.map((v) => Math.log1p(v - fmin))
  let lo = Infinity
  let hi = -Infinity
  for (const v of field) {
    lo = Math.min(lo, v)
    hi = Math.max(hi, v)
  }
  return { field, lo, hi, fmin }
}

export default function OptimizerRacePage() {
  const [surfaceId, setSurfaceId] = useState<SurfaceName>('rosenbrock')
  const surface = SURFACES.find((s) => s.id === surfaceId)!
  const [enabled, setEnabled] = useState<OptimizerName[]>(RACERS)
  const [lrScale, setLrScale] = useState<(typeof LR_SCALES)[number]>(1)
  const [speed, setSpeed] = useState<'1' | '4' | '12'>('4')
  const [start, setStart] = useState<[number, number]>(surface.start)
  const [running, setRunning] = useState(false)
  const [, setTick] = useState(0)
  const runners = useRef<Map<OptimizerName, SurfaceRunner>>(new Map())
  const [wrapRef, width] = useElementWidth<HTMLDivElement>()
  const size = Math.max(0, Math.min(width, 640))
  const baseRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const frame = useRef(0)

  const field = useMemo(() => surfaceField(surface), [surface])

  const toCanvas = useCallback(
    (x: number, y: number): [number, number] => {
      const { xMin, xMax, yMin, yMax } = surface.domain
      return [((x - xMin) / (xMax - xMin)) * size, ((yMax - y) / (yMax - yMin)) * size]
    },
    [surface, size],
  )

  const rebuild = useCallback(() => {
    const m = new Map<OptimizerName, SurfaceRunner>()
    for (const name of enabled) m.set(name, new SurfaceRunner(surface, name, surface.lr[name] * lrScale, start))
    runners.current = m
    setTick((t) => t + 1)
  }, [enabled, surface, lrScale, start])

  useEffect(() => {
    rebuild()
  }, [rebuild])

  // Static layer: heatmap + contour lines + minima.
  useEffect(() => {
    const canvas = baseRef.current
    if (!canvas || size <= 0) return
    const ctx = setupCanvas(canvas, size, size)
    const img = new ImageData(FIELD_RES, FIELD_RES)
    const { field: f, lo, hi } = field
    for (let i = 0; i < f.length; i++) {
      const [r, g, b] = viridis((f[i] - lo) / (hi - lo))
      img.data[i * 4] = r * 0.55
      img.data[i * 4 + 1] = g * 0.55
      img.data[i * 4 + 2] = b * 0.6
      img.data[i * 4 + 3] = 255
    }
    const tmp = document.createElement('canvas')
    tmp.width = FIELD_RES
    tmp.height = FIELD_RES
    tmp.getContext('2d')!.putImageData(img, 0, 0)
    ctx.imageSmoothingEnabled = true
    ctx.drawImage(tmp, 0, 0, size, size)
    const scale = size / (FIELD_RES - 1)
    ctx.lineWidth = 1
    for (let l = 1; l < 18; l++) {
      const level = lo + ((hi - lo) * l) / 18
      const seg = marchingSquares(f, FIELD_RES, FIELD_RES, level)
      ctx.strokeStyle = `rgba(255,255,255,${0.08 + 0.1 * (1 - l / 18)})`
      ctx.beginPath()
      for (let i = 0; i < seg.length; i += 4) {
        ctx.moveTo(seg[i] * scale, seg[i + 1] * scale)
        ctx.lineTo(seg[i + 2] * scale, seg[i + 3] * scale)
      }
      ctx.stroke()
    }
    for (const [mx, my] of surface.minima) {
      const [px, py] = toCanvas(mx, my)
      ctx.fillStyle = '#f8fafc'
      ctx.font = '16px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('★', px, py)
    }
  }, [field, size, surface, toCanvas])

  const drawPaths = useCallback(() => {
    const canvas = overlayRef.current
    if (!canvas || size <= 0) return
    const ctx = setupCanvas(canvas, size, size)
    ctx.clearRect(0, 0, size, size)
    const [sx, sy] = toCanvas(start[0], start[1])
    ctx.fillStyle = '#f8fafc'
    ctx.beginPath()
    ctx.arc(sx, sy, 5, 0, Math.PI * 2)
    ctx.fill()
    for (const [name, r] of runners.current) {
      const color = OPTIMIZER_COLORS[name]
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.lineJoin = 'round'
      ctx.beginPath()
      for (let i = 0; i < r.path.length; i += 2) {
        const [px, py] = toCanvas(r.path[i], r.path[i + 1])
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.stroke()
      const n = r.path.length
      const [hx, hy] = toCanvas(r.path[n - 2], r.path[n - 1])
      ctx.fillStyle = color
      ctx.strokeStyle = '#020617'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(hx, hy, 6, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    }
  }, [size, start, toCanvas])

  useEffect(() => {
    drawPaths()
  })

  const stepAll = (n: number) => {
    for (const r of runners.current.values()) for (let i = 0; i < n; i++) if (r.losses.length < MAX_STEPS) r.step()
  }

  useAnimationFrame(running, () => {
    stepAll(Number(speed))
    drawPaths()
    frame.current++
    if (frame.current % 6 === 0) setTick((t) => t + 1)
    const done = [...runners.current.values()].every((r) => r.diverged || r.losses.length >= MAX_STEPS)
    if (done) setRunning(false)
  })

  const selectSurface = (id: SurfaceName) => {
    setSurfaceId(id)
    setStart(SURFACES.find((s) => s.id === id)!.start)
    setRunning(false)
  }

  const onCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const { xMin, xMax, yMin, yMax } = surface.domain
    const x = xMin + ((e.clientX - rect.left) / rect.width) * (xMax - xMin)
    const y = yMax - ((e.clientY - rect.top) / rect.height) * (yMax - yMin)
    setStart([x, y])
  }

  const list = [...runners.current.entries()]
  const series = list.map(([name, r]) => ({ label: OPTIMIZER_LABELS[name], color: OPTIMIZER_COLORS[name], y: r.losses.map((v) => v - field.fmin + 1e-12) }))
  const distToMin = (r: SurfaceRunner) => Math.min(...surface.minima.map(([mx, my]) => Math.hypot(r.position[0] - mx, r.position[1] - my)))

  return (
    <div className="space-y-5">
      <PageIntro
        title="Optimizer race"
        lead="Five optimizers start from the same point on a classic test function and descend using gradients from the autograd engine. Watch momentum overshoot, RMSProp and Adam rescale steep directions, and plain SGD crawl along the Rosenbrock valley. Click anywhere on the surface to move the start."
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <Segmented label="Loss surface" value={surfaceId} onChange={selectSurface} options={SURFACES.map((s) => ({ value: s.id, label: s.label }))} />
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => { setRunning(false); rebuild() }} title="Reset race">
                <RotateCcw size={16} />
              </Button>
              <Button variant="primary" onClick={() => setRunning(!running)} title={running ? 'Pause race' : 'Start race'}>
                {running ? <Pause size={16} /> : <Play size={16} />} {running ? 'Pause' : 'Race'}
              </Button>
              <Button onClick={() => { stepAll(1); setTick((t) => t + 1) }} title="Single step">
                <StepForward size={16} />
              </Button>
            </div>
          </div>
          <div className="mb-2 text-sm text-slate-300">
            <Tex>{surface.formula}</Tex>
          </div>
          <div ref={wrapRef} className="flex w-full justify-center">
            <div className="relative" style={{ width: size, height: size }}>
              <canvas ref={baseRef} className="absolute inset-0 rounded-xl" role="img" aria-label={`Contour plot of the ${surface.label} function`} />
              <canvas ref={overlayRef} className="absolute inset-0 cursor-crosshair rounded-xl ring-1 ring-white/10" onClick={onCanvasClick} aria-label="Optimizer trajectories; click to set the start point" />
            </div>
          </div>
          <p className="mt-2 text-center text-xs text-slate-500">★ global minima · white dot: start ({num(start[0], 2)}, {num(start[1], 2)}) · colour = log(f − f*)</p>
        </Card>

        <div className="space-y-4">
          <Card title="Racers">
            <div className="space-y-2">
              {RACERS.map((name) => {
                const r = runners.current.get(name)
                const on = enabled.includes(name)
                return (
                  <button
                    key={name}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setEnabled(on ? enabled.filter((e) => e !== name) : RACERS.filter((x) => x === name || enabled.includes(x)))}
                    className={cn('flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition', on ? 'border-white/10 bg-white/[0.03]' : 'border-transparent opacity-40')}
                  >
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: OPTIMIZER_COLORS[name] }} />
                    <span className="w-20 font-medium text-slate-200">{OPTIMIZER_LABELS[name]}</span>
                    <span className="font-mono text-xs text-slate-500">η={num(surface.lr[name] * lrScale, 4)}</span>
                    <span className="ml-auto text-right font-mono text-xs tabular-nums text-slate-300">
                      {r ? (r.diverged ? <span className="text-rose-400">diverged</span> : <>f={num(r.losses[r.losses.length - 1], 3)}<br /><span className="text-slate-500">{r.losses.length - 1} steps · d*={num(distToMin(r), 2)}</span></>) : '—'}
                    </span>
                  </button>
                )
              })}
            </div>
          </Card>
          <Card title="Settings">
            <div className="space-y-3">
              <StepSlider label="Learning-rate multiplier" values={LR_SCALES} value={lrScale} onChange={setLrScale} format={(v) => `${v}×`} />
              <div>
                <div className="mb-1 text-xs text-slate-400">Steps per frame</div>
                <Segmented label="Steps per frame" size="sm" value={speed} onChange={setSpeed} options={[{ value: '1', label: '1' }, { value: '4', label: '4' }, { value: '12', label: '12' }]} />
              </div>
              <p className="text-xs leading-relaxed text-slate-500">Each optimizer uses a step size tuned for this surface; the multiplier scales them all. Gradients are clipped to norm 1000 so unstable settings visibly diverge instead of producing NaNs.</p>
            </div>
          </Card>
          <Card title="Loss f − f* (log scale)">
            <LineChart series={series} logY height={180} xLabel="step" ariaLabel="Loss per step for each optimizer" formatY={(v) => v.toExponential(0)} />
          </Card>
        </div>
      </div>
    </div>
  )
}
