export interface Bounds {
  xMin: number
  xMax: number
  yMin: number
  yMax: number
}

/** Square bounding box around xy pairs, padded by `pad` of the span. */
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
