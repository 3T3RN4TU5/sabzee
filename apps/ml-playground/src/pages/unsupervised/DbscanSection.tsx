import { useCallback, useMemo, useState } from 'react'
import { Scatter, type ToPx } from '../../components/charts/Scatter.tsx'
import { Card, Select, Slider, Stat } from '../../components/ui/controls.tsx'
import { dbscan, make2D, type Dataset2DName } from '../../engine/index.ts'
import { classColor } from '../../lib/colors.ts'

export function DbscanSection() {
  const [source, setSource] = useState<Dataset2DName>('moons')
  const [eps, setEps] = useState(0.12)
  const [minPts, setMinPts] = useState(5)
  const [probe, setProbe] = useState<[number, number] | null>(null)
  const ds = useMemo(() => make2D(source, { n: 450, noise: 0.35, seed: 8, classes: 3 }), [source])
  const res = useMemo(() => dbscan(ds.X, eps, minPts), [ds, eps, minPts])
  const noise = res.labels.reduce((s, l) => s + (l < 0 ? 1 : 0), 0)
  const core = res.core.reduce((s, c) => s + c, 0)

  const pointStyle = useCallback(
    (i: number) => {
      const l = res.labels[i]
      if (l < 0) return { r: 2.2, color: '#475569' }
      return res.core[i] ? { r: 3.6, color: classColor(l) } : { r: 3.2, color: classColor(l), ring: true }
    },
    [res],
  )

  const overlay = useCallback(
    (ctx: CanvasRenderingContext2D, toPx: ToPx, size: number) => {
      if (!probe) return
      const [px, py] = toPx(probe[0], probe[1])
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'
      ctx.setLineDash([4, 3])
      ctx.beginPath()
      ctx.arc(px, py, (eps / 2) * size, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])
    },
    [probe, eps],
  )

  return (
    <Card title="DBSCAN · density-based clustering">
      <div className="grid gap-5 lg:grid-cols-[250px_minmax(0,1fr)_200px]">
        <div className="space-y-3">
          <Select<Dataset2DName> label="Dataset" value={source} onChange={setSource} options={[{ value: 'moons', label: 'Moons' }, { value: 'circles', label: 'Circles' }, { value: 'blobs', label: 'Gaussian blobs' }, { value: 'spiral', label: 'Spiral' }]} />
          <Slider label="ε (neighbourhood radius)" value={eps} min={0.03} max={0.4} step={0.01} onChange={setEps} format={(v) => v.toFixed(2)} />
          <Slider label="minPts" value={minPts} min={2} max={20} onChange={setMinPts} />
          <p className="text-xs leading-relaxed text-slate-500">
            Filled: core points (≥ minPts neighbours within ε). Rings: border points reached from a core. Grey: noise. Click the plot to draw an ε-circle. Unlike k-means, DBSCAN finds non-convex
            clusters and needs no k.
          </p>
        </div>
        <Scatter xy={ds.X.data} pointStyle={pointStyle} overlay={overlay} onClickData={(x, y) => setProbe([x, y])} ariaLabel="DBSCAN clusters with core, border and noise points" maxSize={460} version={eps} />
        <div className="grid content-start gap-2">
          <Stat label="Clusters" value={res.numClusters} accent="#22d3ee" />
          <Stat label="Core points" value={core} />
          <Stat label="Noise points" value={noise} />
        </div>
      </div>
    </Card>
  )
}
