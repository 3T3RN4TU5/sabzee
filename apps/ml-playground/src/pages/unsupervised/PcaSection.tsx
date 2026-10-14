import { Pause, Play, RotateCcw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BarChart } from '../../components/charts/BarChart.tsx'
import { Scatter, type ToPx } from '../../components/charts/Scatter.tsx'
import { autoBounds } from '../../lib/bounds.ts'
import { Button, Card, Legend, Segmented, Slider, Toggle } from '../../components/ui/controls.tsx'
import { fitPca, fromJson, pcaTransform, takeRows, TSNE, type RealDataset, type RealDatasetJson } from '../../engine/index.ts'
import { classColor } from '../../lib/colors.ts'
import { num, pct } from '../../lib/format.ts'
import { useAnimationFrame } from '../../lib/hooks.ts'

type Source = 'iris' | 'wine' | 'digits'

const EMPTY = new Float64Array(0)

const loaders: Record<Source, () => Promise<{ default: unknown }>> = {
  iris: () => import('../../data/iris.json'),
  wine: () => import('../../data/wine.json'),
  digits: () => import('../../data/digits.json'),
}

function useRealDataset(source: Source): RealDataset | null {
  const [cache, setCache] = useState<Partial<Record<Source, RealDataset>>>({})
  useEffect(() => {
    if (cache[source]) return
    let alive = true
    loaders[source]().then((m) => {
      if (alive) setCache((c) => ({ ...c, [source]: fromJson(m.default as RealDatasetJson) }))
    })
    return () => {
      alive = false
    }
  }, [source, cache])
  return cache[source] ?? null
}

/** 8×8 grey-scale tile for a 64-vector (diverging when signed). */
function DigitImage({ v, signed, label }: { v: ArrayLike<number>; signed?: boolean; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const ctx = c.getContext('2d')!
    const img = new ImageData(8, 8)
    let max = 1e-9
    for (let i = 0; i < 64; i++) max = Math.max(max, Math.abs(v[i]))
    for (let i = 0; i < 64; i++) {
      const t = v[i] / max
      const [r, g, b] = signed ? (t >= 0 ? [56, 189, 248] : [245, 158, 11]) : [226, 232, 240]
      const a = signed ? Math.abs(t) : Math.max(0, t)
      img.data[i * 4] = 11 + (r - 11) * a
      img.data[i * 4 + 1] = 17 + (g - 17) * a
      img.data[i * 4 + 2] = 32 + (b - 32) * a
      img.data[i * 4 + 3] = 255
    }
    ctx.putImageData(img, 0, 0)
  }, [v, signed])
  return (
    <figure className="text-center">
      <canvas ref={ref} width={8} height={8} className="h-14 w-14 rounded-md ring-1 ring-white/10 [image-rendering:pixelated]" aria-label={label} />
      <figcaption className="mt-1 font-mono text-[10px] text-slate-500">{label}</figcaption>
    </figure>
  )
}

export function PcaSection() {
  const [source, setSource] = useState<Source>('iris')
  const [standardize, setStandardize] = useState(true)
  const [method, setMethod] = useState<'jacobi' | 'power'>('jacobi')
  const ds = useRealDataset(source)

  const result = useMemo(() => {
    if (!ds) return null
    const std = standardize && source !== 'digits'
    const pca = fitPca(ds.X, { standardize: std, method, k: method === 'power' ? Math.min(ds.X.cols, 10) : undefined })
    const Z = pcaTransform(pca, ds.X, 2)
    return { pca, Z }
  }, [ds, standardize, method, source])

  const bounds = useMemo(() => (result ? autoBounds(result.Z.data) : undefined), [result])

  const overlay = useCallback(
    (ctx: CanvasRenderingContext2D, toPx: ToPx) => {
      if (!result || !ds || source === 'digits' || !bounds) return
      // Loadings: each original feature axis projected onto PC1/PC2.
      const C = result.pca.components
      const d = C.cols
      const scale = (bounds.xMax - bounds.xMin) * 0.38
      const [ox, oy] = toPx(0, 0)
      ctx.font = '10px Inter, sans-serif'
      for (let j = 0; j < d; j++) {
        const [px, py] = toPx(C.data[j] * scale, C.data[d + j] * scale)
        ctx.strokeStyle = 'rgba(255,255,255,0.75)'
        ctx.lineWidth = 1.3
        ctx.beginPath()
        ctx.moveTo(ox, oy)
        ctx.lineTo(px, py)
        ctx.stroke()
        ctx.fillStyle = '#e2e8f0'
        ctx.fillText(ds.featureNames[j].replace(' (cm)', '').replace(/_/g, ' '), px + 3, py - 3)
      }
    },
    [result, ds, source, bounds],
  )

  const ratios = result ? Array.from(result.pca.explainedVarianceRatio.slice(0, 10)) : []

  return (
    <Card title="PCA · eigendecomposition of the covariance matrix">
      <div className="grid gap-5 lg:grid-cols-[250px_minmax(0,1fr)_minmax(0,340px)]">
        <div className="space-y-3">
          <Segmented label="Dataset" value={source} onChange={setSource} options={[{ value: 'iris', label: 'Iris' }, { value: 'wine', label: 'Wine' }, { value: 'digits', label: 'Digits' }]} />
          <Segmented label="Eigen solver" size="sm" value={method} onChange={setMethod} options={[{ value: 'jacobi', label: 'Jacobi' }, { value: 'power', label: 'Power iteration' }]} />
          {source !== 'digits' && <Toggle label="Standardise features" checked={standardize} onChange={setStandardize} />}
          {ds && (
            <p className="text-xs leading-relaxed text-slate-500">
              {ds.name}: {ds.X.rows} samples × {ds.X.cols} features, {ds.numClasses} classes. Colours are the true labels; PCA never sees them.
              {source !== 'digits' && ' Arrows are feature loadings.'}
            </p>
          )}
          {ds && <Legend items={ds.classNames.map((c, i) => ({ color: classColor(i), label: c }))} />}
        </div>
        {result && ds && bounds ? (
          <Scatter xy={result.Z.data} labels={ds.y} bounds={bounds} overlay={overlay} radius={source === 'digits' ? 2.2 : 3.4} ariaLabel={`${ds.name} projected onto the first two principal components`} maxSize={460} />
        ) : (
          <div className="py-20 text-center text-sm text-slate-500">Loading dataset…</div>
        )}
        <div className="space-y-4">
          <div>
            <h4 className="eyebrow mb-2">Explained variance ratio (bars) · cumulative (line)</h4>
            <BarChart values={ratios} labels={ratios.map((_, i) => `PC${i + 1}`)} cumulative ariaLabel="Explained variance per principal component" />
            {result && (
              <p className="mt-2 text-xs text-slate-400">
                PC1 + PC2 explain <span className="font-mono text-cyan-300">{pct(ratios[0] + (ratios[1] ?? 0))}</span> of the variance (λ₁ = {num(result.pca.explainedVariance[0], 3)}).
              </p>
            )}
          </div>
          {source === 'digits' && result && (
            <div>
              <h4 className="eyebrow mb-2">Mean digit and the first eigen-digits</h4>
              <div className="flex flex-wrap gap-2">
                <DigitImage v={result.pca.mean} label="mean" />
                {Array.from({ length: 5 }, (_, k) => (
                  <DigitImage key={k} v={result.pca.components.data.subarray(k * 64, k * 64 + 64)} signed label={`PC${k + 1}`} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

export function TsneSection() {
  const digits = useRealDataset('digits')
  const [perplexity, setPerplexity] = useState(30)
  const [running, setRunning] = useState(false)
  const [version, setVersion] = useState(0)
  const [restart, setRestart] = useState(0)

  // 50 samples per digit = 500 points (exact t-SNE is O(n²) per step).
  const subset = useMemo(() => {
    if (!digits) return null
    const idx: number[] = []
    const counts = new Array(10).fill(0)
    for (let i = 0; i < digits.y.length; i++) if (counts[digits.y[i]]++ < 50) idx.push(i)
    return { X: takeRows(digits.X, idx), y: Int32Array.from(idx, (i) => digits.y[i]) }
  }, [digits])

  // A mutable optimiser; `version` bumps re-render as it iterates in place.
  const t = useMemo(() => (subset ? new TSNE(subset.X, { perplexity, seed: 3 + restart }) : null), [subset, perplexity, restart])

  useAnimationFrame(running, () => {
    if (!t) return
    const start = performance.now()
    while (performance.now() - start < 9 && t.iteration < 1000) t.step()
    if (t.iteration >= 1000) setRunning(false)
    setVersion((v) => v + 1)
  })

  const xy = t ? t.Y : EMPTY
  const bounds = autoBounds(xy, 0.05)

  return (
    <Card title="t-SNE · 500 handwritten digits (64-D → 2-D)">
      <div className="grid gap-5 lg:grid-cols-[250px_minmax(0,1fr)_200px]">
        <div className="space-y-3">
          <Slider label="Perplexity" value={perplexity} min={5} max={50} onChange={setPerplexity} />
          <div className="flex gap-2">
            <Button onClick={() => { setRunning(false); setRestart(restart + 1) }} title="Restart from a new random layout">
              <RotateCcw size={16} />
            </Button>
            <Button variant="primary" className="flex-1" onClick={() => setRunning(!running)} disabled={!subset}>
              {running ? <Pause size={16} /> : <Play size={16} />} {running ? 'Pause' : 'Run t-SNE'}
            </Button>
          </div>
          <p className="text-xs leading-relaxed text-slate-500">
            Exact t-SNE: Gaussian affinities with per-point bandwidths found by bisection to match the perplexity, a Student-t kernel in 2-D, gradient descent with momentum, gains and early
            exaggeration (first 100 iterations).
          </p>
          <Legend items={Array.from({ length: 10 }, (_, d) => ({ color: classColor(d), label: String(d) }))} />
        </div>
        {subset ? (
          <Scatter xy={xy} labels={subset.y} bounds={bounds} radius={2.6} version={version} ariaLabel="t-SNE embedding of digits coloured by digit" maxSize={460} />
        ) : (
          <div className="py-20 text-center text-sm text-slate-500">Loading digits…</div>
        )}
        <div className="grid content-start gap-2 text-sm">
          <div className="rounded-xl border border-white/[0.06] bg-slate-950/50 px-3 py-2">
            <div className="text-[11px] tracking-wide text-slate-400 uppercase">Iteration</div>
            <div className="font-mono text-lg" data-testid="tsne-iter">
              {t?.iteration ?? 0}
            </div>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-slate-950/50 px-3 py-2">
            <div className="text-[11px] tracking-wide text-slate-400 uppercase">KL divergence</div>
            <div className="font-mono text-lg">{t && t.iteration ? num(t.kl, 3) : '—'}</div>
          </div>
        </div>
      </div>
    </Card>
  )
}
