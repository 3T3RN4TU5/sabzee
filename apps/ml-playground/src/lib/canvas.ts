/** Canvas helpers: DPR-aware sizing and probability / value heatmaps. */
import { BG_RGB, CLASS_RGB, NEG_RGB, POS_RGB } from './colors.ts'

/** Size the backing store for the device pixel ratio; returns a scaled 2-D context. */
export function setupCanvas(canvas: HTMLCanvasElement, width: number, height: number): CanvasRenderingContext2D {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const w = Math.max(1, Math.round(width * dpr))
  const h = Math.max(1, Math.round(height * dpr))
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w
    canvas.height = h
  }
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
  const ctx = canvas.getContext('2d')!
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  return ctx
}

/**
 * Paint class probabilities (row-major grid, row 0 = top) into an ImageData.
 * Colour = probability-weighted mix of class colours, faded towards the
 * background as confidence drops to chance level.
 */
export function probsToImage(probs: ArrayLike<number>, res: number, k: number, discretize = false, strength = 0.75): ImageData {
  const img = new ImageData(res, res)
  const px = img.data
  for (let i = 0; i < res * res; i++) {
    let r = 0
    let g = 0
    let b = 0
    let max = 0
    let arg = 0
    for (let c = 0; c < k; c++) {
      const p = probs[i * k + c]
      if (p > max) {
        max = p
        arg = c
      }
      const col = CLASS_RGB[c % CLASS_RGB.length]
      r += p * col[0]
      g += p * col[1]
      b += p * col[2]
    }
    let conf = (max - 1 / k) / (1 - 1 / k)
    if (discretize) {
      const col = CLASS_RGB[arg % CLASS_RGB.length]
      r = col[0]
      g = col[1]
      b = col[2]
      conf = 0.55
    }
    const a = Math.max(0, Math.min(1, conf)) * strength
    px[i * 4] = BG_RGB[0] + (r - BG_RGB[0]) * a
    px[i * 4 + 1] = BG_RGB[1] + (g - BG_RGB[1]) * a
    px[i * 4 + 2] = BG_RGB[2] + (b - BG_RGB[2]) * a
    px[i * 4 + 3] = 255
  }
  return img
}

/** Diverging map for a single neuron: negative → amber, positive → sky, scaled by max |v|. */
export function valuesToImage(values: ArrayLike<number>, offset: number, res: number, img?: ImageData): ImageData {
  const out = img ?? new ImageData(res, res)
  const px = out.data
  let max = 1e-9
  for (let i = 0; i < res * res; i++) max = Math.max(max, Math.abs(values[offset + i]))
  for (let i = 0; i < res * res; i++) {
    const v = values[offset + i] / max
    const col = v >= 0 ? POS_RGB : NEG_RGB
    const a = Math.min(1, Math.abs(v)) * 0.9
    px[i * 4] = BG_RGB[0] + (col[0] - BG_RGB[0]) * a
    px[i * 4 + 1] = BG_RGB[1] + (col[1] - BG_RGB[1]) * a
    px[i * 4 + 2] = BG_RGB[2] + (col[2] - BG_RGB[2]) * a
    px[i * 4 + 3] = 255
  }
  return out
}

/** Draw an ImageData stretched over a rectangle, with bilinear smoothing. */
export function drawImageScaled(ctx: CanvasRenderingContext2D, img: ImageData, x: number, y: number, w: number, h: number, smooth = true): void {
  const tmp = scratch(img.width, img.height)
  tmp.getContext('2d')!.putImageData(img, 0, 0)
  ctx.save()
  ctx.imageSmoothingEnabled = smooth
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(tmp, x, y, w, h)
  ctx.restore()
}

const scratchCanvases = new Map<string, HTMLCanvasElement>()
function scratch(w: number, h: number): HTMLCanvasElement {
  const key = `${w}x${h}`
  let c = scratchCanvases.get(key)
  if (!c) {
    c = document.createElement('canvas')
    c.width = w
    c.height = h
    scratchCanvases.set(key, c)
  }
  return c
}

/** Grid of query points over [lo,hi]² (row 0 = top, i.e. largest y). */
export function gridPoints(res: number, lo = -1, hi = 1): Float64Array {
  const pts = new Float64Array(res * res * 2)
  for (let r = 0; r < res; r++) {
    for (let c = 0; c < res; c++) {
      const i = r * res + c
      pts[i * 2] = lo + ((c + 0.5) / res) * (hi - lo)
      pts[i * 2 + 1] = hi - ((r + 0.5) / res) * (hi - lo)
    }
  }
  return pts
}

export interface PointStyle {
  radius?: number
  stroke?: string
  hollow?: boolean
}

/** Scatter labelled points in data coords [lo,hi]² onto a size×size square. */
export function drawPoints(
  ctx: CanvasRenderingContext2D,
  xy: ArrayLike<number>,
  labels: ArrayLike<number>,
  colors: (c: number) => string,
  size: number,
  style: PointStyle = {},
  lo = -1,
  hi = 1,
): void {
  const r = style.radius ?? 3.5
  const n = labels.length
  ctx.lineWidth = 1.2
  for (let i = 0; i < n; i++) {
    const px = ((xy[i * 2] - lo) / (hi - lo)) * size
    const py = ((hi - xy[i * 2 + 1]) / (hi - lo)) * size
    ctx.beginPath()
    ctx.arc(px, py, r, 0, Math.PI * 2)
    if (style.hollow) {
      ctx.strokeStyle = colors(labels[i])
      ctx.lineWidth = 1.8
      ctx.stroke()
    } else {
      ctx.fillStyle = colors(labels[i])
      ctx.fill()
      ctx.strokeStyle = style.stroke ?? 'rgba(255,255,255,0.85)'
      ctx.stroke()
    }
  }
}
