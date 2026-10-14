import { useEffect, useRef } from 'react'
import { drawImageScaled, drawPoints, probsToImage, setupCanvas, valuesToImage } from '../../lib/canvas.ts'
import { classColor } from '../../lib/colors.ts'
import { useElementWidth } from '../../lib/hooks.ts'

export interface PlotPoints {
  xy: ArrayLike<number>
  y: ArrayLike<number>
}

export interface DecisionPlotProps {
  /** Class probabilities on a res×res grid over [-1,1]² (row 0 = top). */
  probs?: ArrayLike<number> | null
  res?: number
  numClasses: number
  train?: PlotPoints | null
  test?: PlotPoints | null
  showTest?: boolean
  discretize?: boolean
  /** Optional single-node values to show instead of the class map. */
  values?: { data: ArrayLike<number>; offset: number; res: number } | null
  /** Points to ring (e.g. support vectors), as xy pairs. */
  highlight?: ArrayLike<number> | null
  maxSize?: number
  ariaLabel: string
}

/** Square decision-boundary heatmap with the training (filled) and test (ringed) points. */
export function DecisionPlot({ probs, res = 0, numClasses, train, test, showTest = true, discretize, values, highlight, maxSize = 460, ariaLabel }: DecisionPlotProps) {
  const [wrapRef, width] = useElementWidth<HTMLDivElement>()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const size = Math.min(width, maxSize)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || size <= 0) return
    const ctx = setupCanvas(canvas, size, size)
    ctx.fillStyle = '#0b1120'
    ctx.fillRect(0, 0, size, size)
    if (values) drawImageScaled(ctx, valuesToImage(values.data, values.offset, values.res), 0, 0, size, size)
    else if (probs && res) drawImageScaled(ctx, probsToImage(probs, res, numClasses, discretize), 0, 0, size, size)
    // Axes through the origin.
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(size / 2, 0)
    ctx.lineTo(size / 2, size)
    ctx.moveTo(0, size / 2)
    ctx.lineTo(size, size / 2)
    ctx.stroke()
    const r = size < 320 ? 2.6 : 3.4
    if (train) drawPoints(ctx, train.xy, train.y, classColor, size, { radius: r })
    if (test && showTest) drawPoints(ctx, test.xy, test.y, classColor, size, { radius: r, hollow: true })
    if (highlight) {
      ctx.strokeStyle = 'rgba(255,255,255,0.95)'
      ctx.lineWidth = 1.5
      for (let i = 0; i < highlight.length / 2; i++) {
        ctx.beginPath()
        ctx.arc(((highlight[2 * i] + 1) / 2) * size, ((1 - highlight[2 * i + 1]) / 2) * size, r + 3.5, 0, Math.PI * 2)
        ctx.stroke()
      }
    }
  }, [probs, res, numClasses, train, test, showTest, discretize, values, highlight, size])

  return (
    <div ref={wrapRef} className="flex w-full justify-center">
      <canvas ref={canvasRef} role="img" aria-label={ariaLabel} className="block rounded-xl ring-1 ring-white/10" />
    </div>
  )
}
