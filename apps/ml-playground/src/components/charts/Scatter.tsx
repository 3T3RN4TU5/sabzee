import { useEffect, useRef } from 'react'
import { setupCanvas } from '../../lib/canvas.ts'
import { classColor } from '../../lib/colors.ts'
import { useElementWidth } from '../../lib/hooks.ts'

export interface Bounds {
  xMin: number
  xMax: number
  yMin: number
  yMax: number
}

export type ToPx = (x: number, y: number) => [number, number]

export interface ScatterProps {
  xy: ArrayLike<number>
  labels?: ArrayLike<number> | null
  bounds?: Bounds
  radius?: number
  maxSize?: number
  /** Per-point radius multiplier / style hook. */
  pointStyle?: (i: number) => { r?: number; color?: string; ring?: boolean } | null
  background?: (ctx: CanvasRenderingContext2D, toPx: ToPx, size: number) => void
  overlay?: (ctx: CanvasRenderingContext2D, toPx: ToPx, size: number) => void
  onClickData?: (x: number, y: number) => void
  ariaLabel: string
  /** Changing this forces a redraw (for imperative data). */
  version?: number
}

export function autoBounds(xy: ArrayLike<number>, pad = 0.08): Bounds {
  let xMin = Infinity
  let xMax = -Infinity
  let yMin = Infinity
  let yMax = -Infinity
  for (let i = 0; i < xy.length; i += 2) {
    xMin = Math.min(xMin, xy[i])
    xMax = Math.max(xMax, xy[i])
    yMin = Math.min(yMin, xy[i + 1])
    yMax = Math.max(yMax, xy[i + 1])
  }
  if (!Number.isFinite(xMin)) return { xMin: -1, xMax: 1, yMin: -1, yMax: 1 }
  // Square aspect so distances are not distorted.
  const span = Math.max(xMax - xMin, yMax - yMin, 1e-9) * (1 + 2 * pad)
  const cx = (xMin + xMax) / 2
  const cy = (yMin + yMax) / 2
  return { xMin: cx - span / 2, xMax: cx + span / 2, yMin: cy - span / 2, yMax: cy + span / 2 }
}

const UNIT: Bounds = { xMin: -1, xMax: 1, yMin: -1, yMax: 1 }

/** Square scatter plot on canvas with optional background / overlay painters. */
export function Scatter({ xy, labels, bounds = UNIT, radius = 3.4, maxSize = 520, pointStyle, background, overlay, onClickData, ariaLabel, version }: ScatterProps) {
  const [wrapRef, width] = useElementWidth<HTMLDivElement>()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const size = Math.min(width, maxSize)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || size <= 0) return
    const ctx = setupCanvas(canvas, size, size)
    const toPx: ToPx = (x, y) => [((x - bounds.xMin) / (bounds.xMax - bounds.xMin)) * size, ((bounds.yMax - y) / (bounds.yMax - bounds.yMin)) * size]
    ctx.fillStyle = '#0b1120'
    ctx.fillRect(0, 0, size, size)
    background?.(ctx, toPx, size)
    const n = xy.length / 2
    ctx.lineWidth = 1
    for (let i = 0; i < n; i++) {
      const s = pointStyle?.(i)
      if (s === null) continue
      const [px, py] = toPx(xy[2 * i], xy[2 * i + 1])
      const color = s?.color ?? (labels ? classColor(labels[i]) : '#94a3b8')
      ctx.beginPath()
      ctx.arc(px, py, s?.r ?? radius, 0, Math.PI * 2)
      if (s?.ring) {
        ctx.strokeStyle = color
        ctx.lineWidth = 1.5
        ctx.stroke()
        ctx.lineWidth = 1
      } else {
        ctx.fillStyle = color
        ctx.fill()
        ctx.strokeStyle = 'rgba(2,6,23,0.7)'
        ctx.stroke()
      }
    }
    overlay?.(ctx, toPx, size)
  }, [xy, labels, bounds, radius, size, pointStyle, background, overlay, version])

  return (
    <div ref={wrapRef} className="flex w-full justify-center">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={ariaLabel}
        className={`block rounded-xl ring-1 ring-white/10 ${onClickData ? 'cursor-crosshair' : ''}`}
        onClick={
          onClickData
            ? (e) => {
                const r = e.currentTarget.getBoundingClientRect()
                onClickData(bounds.xMin + ((e.clientX - r.left) / r.width) * (bounds.xMax - bounds.xMin), bounds.yMax - ((e.clientY - r.top) / r.height) * (bounds.yMax - bounds.yMin))
              }
            : undefined
        }
      />
    </div>
  )
}
