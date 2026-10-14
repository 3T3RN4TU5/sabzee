/**
 * Marching squares: line segments of the iso-line f = level through a
 * scalar field sampled on a (w × h) grid (row 0 = top). Coordinates are in
 * grid units (0 … w−1, 0 … h−1).
 */
export function marchingSquares(field: Float64Array, w: number, h: number, level: number): number[] {
  const seg: number[] = []
  const lerp = (a: number, b: number) => (level - a) / (b - a || 1e-12)
  for (let y = 0; y < h - 1; y++) {
    for (let x = 0; x < w - 1; x++) {
      const tl = field[y * w + x]
      const tr = field[y * w + x + 1]
      const br = field[(y + 1) * w + x + 1]
      const bl = field[(y + 1) * w + x]
      const code = (tl > level ? 8 : 0) | (tr > level ? 4 : 0) | (br > level ? 2 : 0) | (bl > level ? 1 : 0)
      if (code === 0 || code === 15) continue
      const top = [x + lerp(tl, tr), y]
      const right = [x + 1, y + lerp(tr, br)]
      const bottom = [x + lerp(bl, br), y + 1]
      const left = [x, y + lerp(tl, bl)]
      const add = (a: number[], b: number[]) => seg.push(a[0], a[1], b[0], b[1])
      switch (code) {
        case 1:
        case 14:
          add(left, bottom)
          break
        case 2:
        case 13:
          add(bottom, right)
          break
        case 3:
        case 12:
          add(left, right)
          break
        case 4:
        case 11:
          add(top, right)
          break
        case 5:
          add(left, top)
          add(bottom, right)
          break
        case 6:
        case 9:
          add(top, bottom)
          break
        case 7:
        case 8:
          add(left, top)
          break
        case 10:
          add(left, bottom)
          add(top, right)
          break
      }
    }
  }
  return seg
}
