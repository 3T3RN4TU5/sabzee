import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { drawImageScaled, setupCanvas, valuesToImage } from '../../lib/canvas.ts'
import { classColor } from '../../lib/colors.ts'
import { useElementWidth } from '../../lib/hooks.ts'
import type { NNSnapshot } from '../../workers/nnProtocol.ts'

export interface HoveredNode {
  /** Flat node index into snapshot.nodes. */
  index: number
  label: string
}

interface Layout {
  x: number[]
  /** Per layer, the y of each node's top edge. */
  y: number[][]
  size: number
  height: number
}

function layoutFor(sizes: number[], width: number): Layout {
  const maxNodes = Math.max(...sizes)
  const size = width < 520 ? 26 : 34
  const gapY = width < 520 ? 10 : 14
  const padX = 34
  const height = Math.max(200, maxNodes * (size + gapY) + 40)
  const x = sizes.map((_, l) => padX + (l * (width - 2 * padX - size)) / Math.max(1, sizes.length - 1))
  const y = sizes.map((n) => {
    const total = n * size + (n - 1) * gapY
    const top = (height - total) / 2 + 8
    return Array.from({ length: n }, (_, i) => top + i * (size + gapY))
  })
  return { x, y, size, height }
}

/**
 * Canvas rendering of the network: every node shows its activation over the
 * input plane, edges are coloured by weight sign and scaled by magnitude.
 */
export function NetworkDiagram({
  snap,
  featureLabels,
  onHover,
}: {
  snap: NNSnapshot | null
  featureLabels: string[]
  onHover: (node: HoveredNode | null) => void
}) {
  const [wrapRef, width] = useElementWidth<HTMLDivElement>()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hover, setHover] = useState<number | null>(null)
  const sizes = snap?.layerSizes
  const layout = useMemo(() => (sizes && width > 0 ? layoutFor(sizes, width) : null), [sizes, width])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !snap || !layout || width <= 0) return
    const ctx = setupCanvas(canvas, width, layout.height)
    ctx.clearRect(0, 0, width, layout.height)
    const { x, y, size } = layout
    const sizesL = snap.layerSizes

    // Edges first so nodes sit on top.
    snap.weights.forEach((W, l) => {
      const nIn = sizesL[l]
      const nOut = sizesL[l + 1]
      let wmax = 1e-6
      for (const v of W) wmax = Math.max(wmax, Math.abs(v))
      for (let i = 0; i < nIn; i++) {
        for (let j = 0; j < nOut; j++) {
          const w = W[i * nOut + j]
          const mag = Math.min(1, Math.abs(w) / wmax)
          const x0 = x[l] + size
          const y0 = y[l][i] + size / 2
          const x1 = x[l + 1]
          const y1 = y[l + 1][j] + size / 2
          ctx.strokeStyle = w >= 0 ? `rgba(56,189,248,${0.12 + 0.7 * mag})` : `rgba(245,158,11,${0.12 + 0.7 * mag})`
          ctx.lineWidth = 0.4 + 3.6 * mag
          ctx.beginPath()
          const mx = (x0 + x1) / 2
          ctx.moveTo(x0, y0)
          ctx.bezierCurveTo(mx, y0, mx, y1, x1, y1)
          ctx.stroke()
        }
      }
    })

    // Nodes with activation thumbnails.
    const res = snap.thumbRes
    const px = res * res
    const img = new ImageData(res, res)
    let node = 0
    ctx.font = '11px "JetBrains Mono", monospace'
    ctx.textBaseline = 'middle'
    sizesL.forEach((n, l) => {
      for (let i = 0; i < n; i++, node++) {
        const nx = x[l]
        const ny = y[l][i]
        valuesToImage(snap.nodes, node * px, res, img)
        drawImageScaled(ctx, img, nx, ny, size, size)
        const isOut = l === sizesL.length - 1
        ctx.lineWidth = hover === node ? 2.5 : 1.2
        ctx.strokeStyle = hover === node ? '#e2e8f0' : isOut ? classColor(i) : 'rgba(255,255,255,0.25)'
        ctx.strokeRect(nx + 0.5, ny + 0.5, size - 1, size - 1)
        if (l === 0) {
          ctx.fillStyle = '#94a3b8'
          ctx.textAlign = 'right'
          ctx.fillText(featureLabels[i] ?? '', nx - 5, ny + size / 2)
        }
      }
    })
    // Column captions.
    ctx.fillStyle = '#64748b'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.font = '10px Inter, sans-serif'
    sizesL.forEach((n, l) => {
      const caption = l === 0 ? 'INPUT' : l === sizesL.length - 1 ? 'OUTPUT' : `HIDDEN ${l} · ${n}`
      ctx.fillText(caption, x[l] + size / 2, 4)
    })
  }, [snap, layout, width, hover, featureLabels])

  const hitTest = (e: PointerEvent<HTMLCanvasElement>): number | null => {
    if (!layout || !snap) return null
    const rect = e.currentTarget.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    let node = 0
    for (let l = 0; l < snap.layerSizes.length; l++) {
      for (let i = 0; i < snap.layerSizes[l]; i++, node++) {
        if (mx >= layout.x[l] && mx <= layout.x[l] + layout.size && my >= layout.y[l][i] && my <= layout.y[l][i] + layout.size) return node
      }
    }
    return null
  }

  const describe = (index: number): string => {
    if (!snap) return ''
    let node = 0
    for (let l = 0; l < snap.layerSizes.length; l++) {
      for (let i = 0; i < snap.layerSizes[l]; i++, node++) {
        if (node !== index) continue
        if (l === 0) return `Input ${featureLabels[i]}`
        if (l === snap.layerSizes.length - 1) return `Output · P(class ${i}) − chance`
        return `Hidden layer ${l} · neuron ${i + 1}`
      }
    }
    return ''
  }

  return (
    <div ref={wrapRef} className="w-full">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Network diagram: each node shows its activation over the input plane; edge colour is the weight sign and thickness its magnitude"
        className="block cursor-crosshair touch-none"
        onPointerMove={(e) => {
          const n = hitTest(e)
          if (n !== hover) {
            setHover(n)
            onHover(n === null ? null : { index: n, label: describe(n) })
          }
        }}
        onPointerLeave={() => {
          setHover(null)
          onHover(null)
        }}
      />
    </div>
  )
}
