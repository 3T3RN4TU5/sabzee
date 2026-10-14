import { useEffect, useRef } from 'react'
import { setupCanvas } from '../../lib/canvas.ts'
import { useElementWidth } from '../../lib/hooks.ts'
import { num } from '../../lib/format.ts'

export interface Series {
  label: string
  color: string
  /** y values; x is the index unless `x` is given. */
  y: ArrayLike<number>
  x?: ArrayLike<number>
  dashed?: boolean
  width?: number
}

export interface LineChartProps {
  series: Series[]
  height?: number
  logY?: boolean
  yMin?: number
  yMax?: number
  xLabel?: string
  yLabel?: string
  /** Vertical marker at this x value. */
  markerX?: number
  formatY?: (v: number) => string
  formatX?: (v: number) => string
  ariaLabel: string
}

/** Lightweight canvas line chart (redraws cheaply many times per second). */
export function LineChart({ series, height = 160, logY, yMin, yMax, xLabel, yLabel, markerX, formatY = (v) => num(v, 2), formatX = (v) => String(Math.round(v)), ariaLabel }: LineChartProps) {
  const [wrapRef, width] = useElementWidth<HTMLDivElement>()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || width <= 0) return
    const ctx = setupCanvas(canvas, width, height)
    ctx.clearRect(0, 0, width, height)
    const pad = { l: 52, r: 10, t: 8, b: xLabel ? 30 : 20 }
    const W = width - pad.l - pad.r
    const H = height - pad.t - pad.b
    const tf = (v: number) => (logY ? Math.log10(Math.max(v, 1e-12)) : v)

    let xmin = Infinity
    let xmax = -Infinity
    let ymin = Infinity
    let ymax = -Infinity
    for (const s of series) {
      for (let i = 0; i < s.y.length; i++) {
        const xv = s.x ? s.x[i] : i
        const yv = s.y[i]
        if (!Number.isFinite(yv)) continue
        xmin = Math.min(xmin, xv)
        xmax = Math.max(xmax, xv)
        ymin = Math.min(ymin, tf(yv))
        ymax = Math.max(ymax, tf(yv))
      }
    }
    if (yMin !== undefined) ymin = tf(yMin)
    if (yMax !== undefined) ymax = tf(yMax)
    if (!Number.isFinite(xmin)) {
      xmin = 0
      xmax = 1
      ymin = 0
      ymax = 1
    }
    if (xmax === xmin) xmax = xmin + 1
    if (ymax === ymin) {
      ymax += 0.5
      ymin -= 0.5
    }
    const X = (v: number) => pad.l + ((v - xmin) / (xmax - xmin)) * W
    const Y = (v: number) => pad.t + H - ((tf(v) - ymin) / (ymax - ymin)) * H

    // Grid + y ticks.
    ctx.font = '10px "JetBrains Mono", monospace'
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'right'
    for (let t = 0; t <= 4; t++) {
      const yv = ymin + ((ymax - ymin) * t) / 4
      const py = pad.t + H - (H * t) / 4
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'
      ctx.beginPath()
      ctx.moveTo(pad.l, py)
      ctx.lineTo(pad.l + W, py)
      ctx.stroke()
      ctx.fillStyle = '#64748b'
      ctx.fillText(formatY(logY ? 10 ** yv : yv), pad.l - 6, py)
    }
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    for (let t = 0; t <= 4; t++) {
      const xv = xmin + ((xmax - xmin) * t) / 4
      ctx.fillText(formatX(xv), X(xv), pad.t + H + 4)
    }
    if (xLabel) {
      ctx.fillStyle = '#94a3b8'
      ctx.fillText(xLabel, pad.l + W / 2, pad.t + H + 17)
    }
    if (yLabel) {
      ctx.save()
      ctx.translate(10, pad.t + H / 2)
      ctx.rotate(-Math.PI / 2)
      ctx.fillStyle = '#94a3b8'
      ctx.textBaseline = 'middle'
      ctx.fillText(yLabel, 0, 0)
      ctx.restore()
    }

    if (markerX !== undefined) {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'
      ctx.setLineDash([3, 3])
      ctx.beginPath()
      ctx.moveTo(X(markerX), pad.t)
      ctx.lineTo(X(markerX), pad.t + H)
      ctx.stroke()
      ctx.setLineDash([])
    }

    ctx.save()
    ctx.beginPath()
    ctx.rect(pad.l, pad.t, W, H)
    ctx.clip()
    for (const s of series) {
      ctx.strokeStyle = s.color
      ctx.lineWidth = s.width ?? 1.75
      ctx.setLineDash(s.dashed ? [5, 4] : [])
      ctx.beginPath()
      let started = false
      // Stride long series so we draw at most ~2 points per pixel.
      const stride = Math.max(1, Math.floor(s.y.length / (W * 2)))
      for (let i = 0; i < s.y.length; i += stride) {
        const yv = s.y[i]
        if (!Number.isFinite(yv)) {
          started = false
          continue
        }
        const px = X(s.x ? s.x[i] : i)
        const py = Y(yv)
        if (!started) {
          ctx.moveTo(px, py)
          started = true
        } else ctx.lineTo(px, py)
      }
      const last = s.y.length - 1
      if (last >= 0 && last % stride !== 0 && Number.isFinite(s.y[last])) ctx.lineTo(X(s.x ? s.x[last] : last), Y(s.y[last]))
      ctx.stroke()
    }
    ctx.restore()
    ctx.setLineDash([])
  }, [series, width, height, logY, yMin, yMax, xLabel, yLabel, markerX, formatY, formatX])

  return (
    <div ref={wrapRef} className="w-full">
      <canvas ref={canvasRef} role="img" aria-label={ariaLabel} className="block" />
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 pl-12 text-xs text-slate-400">
        {series.map((s) => (
          <span key={s.label} className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded" style={{ background: s.color, opacity: s.dashed ? 0.7 : 1 }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  )
}
