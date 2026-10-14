/** Shared colour palette for classes, clusters and colormaps. */

export const CLASS_COLORS = ['#f59e0b', '#38bdf8', '#a78bfa', '#34d399', '#f472b6', '#facc15', '#f87171', '#2dd4bf', '#a3e635', '#818cf8']

export type RGB = [number, number, number]

export function hexToRgb(hex: string): RGB {
  const v = parseInt(hex.slice(1), 16)
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255]
}

export const CLASS_RGB: RGB[] = CLASS_COLORS.map(hexToRgb)

export function classColor(c: number): string {
  return c < 0 ? '#64748b' : CLASS_COLORS[c % CLASS_COLORS.length]
}

/** Background the heatmaps fade into (slate-950-ish). */
export const BG_RGB: RGB = [11, 17, 32]

/** Positive / negative weight colours (sky / amber), as in the class palette. */
export const POS_RGB: RGB = [56, 189, 248]
export const NEG_RGB: RGB = [245, 158, 11]

/** Viridis-like perceptual colormap sampled at 9 stops, t in [0,1]. */
const VIRIDIS: RGB[] = [
  [68, 1, 84],
  [72, 36, 117],
  [64, 67, 135],
  [52, 94, 141],
  [41, 120, 142],
  [32, 144, 140],
  [34, 167, 132],
  [68, 190, 112],
  [121, 209, 81],
]

export function viridis(t: number): RGB {
  const x = Math.max(0, Math.min(1, t)) * (VIRIDIS.length - 1)
  const i = Math.min(VIRIDIS.length - 2, Math.floor(x))
  const f = x - i
  const a = VIRIDIS[i]
  const b = VIRIDIS[i + 1]
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]
}

export const OPTIMIZER_COLORS: Record<string, string> = {
  sgd: '#f87171',
  momentum: '#facc15',
  nesterov: '#fb923c',
  rmsprop: '#34d399',
  adam: '#38bdf8',
  adamw: '#c084fc',
}
