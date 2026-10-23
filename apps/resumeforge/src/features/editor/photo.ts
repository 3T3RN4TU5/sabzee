/** Canvas helpers for the profile photo (DOM-only; the crop math lives in lib/shell.ts). OWNER: shell agent. */
import { dataUrlBytes } from '../../lib/shell.ts'

export const MAX_INPUT_BYTES = 8 * 1024 * 1024
export const MAX_OUTPUT_BYTES = 220 * 1024

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('decode'))
    img.src = src
  })
}

export function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(r.error)
    r.readAsDataURL(file)
  })
}

/** Draw the square source region to a JPEG data URL, shrinking until it fits MAX_OUTPUT_BYTES. */
export function renderSquare(img: HTMLImageElement, rect: { sx: number; sy: number; size: number }): string {
  const canvas = document.createElement('canvas')
  const g = canvas.getContext('2d')
  if (!g) return ''
  let out = ''
  for (const [px, q] of [
    [480, 0.88],
    [400, 0.8],
    [320, 0.72],
    [240, 0.65],
  ] as const) {
    canvas.width = canvas.height = px
    g.fillStyle = '#ffffff'
    g.fillRect(0, 0, px, px)
    g.imageSmoothingQuality = 'high'
    g.drawImage(img, rect.sx, rect.sy, rect.size, rect.size, 0, 0, px, px)
    out = canvas.toDataURL('image/jpeg', q)
    if (dataUrlBytes(out) <= MAX_OUTPUT_BYTES) break
  }
  return out
}
