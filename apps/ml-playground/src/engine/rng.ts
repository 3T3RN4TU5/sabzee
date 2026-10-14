/**
 * Seeded pseudo-random numbers (mulberry32) so datasets, weight init and
 * mini-batch shuffles are reproducible in the browser and in tests.
 */
export type Rng = () => number

export function seededRng(seed: number): Rng {
  let a = seed >>> 0 || 0x9e3779b9
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Standard normal via Box–Muller. */
export function randn(rng: Rng): number {
  let u = 0
  while (u === 0) u = rng()
  const v = rng()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

/** In-place Fisher–Yates shuffle of any indexable collection. */
export function shuffle<T>(a: { length: number; [i: number]: T }, rng: Rng): void {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = a[i]
    a[i] = a[j]
    a[j] = tmp
  }
}

/** Indices 0..n-1 in random order. */
export function permutation(n: number, rng: Rng): Int32Array {
  const p = new Int32Array(n)
  for (let i = 0; i < n; i++) p[i] = i
  shuffle(p, rng)
  return p
}
