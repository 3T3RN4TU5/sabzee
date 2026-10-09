export type InputPreset = 'random' | 'nearly-sorted' | 'reversed' | 'few-unique'

export const INPUT_PRESETS: { id: InputPreset; label: string }[] = [
  { id: 'random', label: 'Random' },
  { id: 'nearly-sorted', label: 'Nearly sorted' },
  { id: 'reversed', label: 'Reversed' },
  { id: 'few-unique', label: 'Few unique' },
]

export const MIN_SIZE = 8
export const MAX_SIZE = 150
const MIN_VALUE = 5
const MAX_VALUE = 100

export type Rng = () => number

/** Deterministic PRNG (mulberry32) so tests and the first render are reproducible. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const randInt = (rng: Rng, maxExclusive: number) => Math.floor(rng() * maxExclusive)

/** n evenly spaced values between MIN_VALUE and MAX_VALUE, ascending. */
function ramp(n: number): number[] {
  if (n === 1) return [MAX_VALUE]
  return Array.from({ length: n }, (_, i) => Math.round(MIN_VALUE + ((MAX_VALUE - MIN_VALUE) * i) / (n - 1)))
}

function shuffle(values: number[], rng: Rng): number[] {
  for (let i = values.length - 1; i > 0; i--) {
    const j = randInt(rng, i + 1)
    const tmp = values[i]
    values[i] = values[j]
    values[j] = tmp
  }
  return values
}

export function generateInput(preset: InputPreset, n: number, rng: Rng): number[] {
  switch (preset) {
    case 'random':
      return shuffle(ramp(n), rng)
    case 'reversed':
      return ramp(n).reverse()
    case 'nearly-sorted': {
      const values = ramp(n)
      // Perturb ~8% of positions with short-distance swaps.
      const swaps = Math.max(1, Math.round(n * 0.08))
      for (let s = 0; s < swaps; s++) {
        const i = randInt(rng, n)
        const j = Math.min(n - 1, i + 1 + randInt(rng, 3))
        const tmp = values[i]
        values[i] = values[j]
        values[j] = tmp
      }
      return values
    }
    case 'few-unique': {
      const levels = [20, 45, 70, 95]
      return Array.from({ length: n }, () => levels[randInt(rng, levels.length)])
    }
  }
}
