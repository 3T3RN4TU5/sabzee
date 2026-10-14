import assert from 'node:assert/strict'
import { seededRng, Tensor } from '../src/engine/index.ts'

/**
 * Compare autograd gradients with central finite differences.
 * The scalar objective is Σ out ⊙ R for a fixed random R, so every output
 * element receives a different upstream gradient.
 */
export function gradCheck(name: string, fn: (...xs: Tensor[]) => Tensor, inputs: Tensor[], tol = 1e-6): number {
  const rng = seededRng(99)
  const probe = fn(...inputs.map((t) => t.detach()))
  const R = new Tensor(Float64Array.from({ length: probe.size }, () => rng() * 2 - 1), probe.shape)
  const objective = (xs: Tensor[]) => {
    const out = fn(...xs)
    return out.size === 1 ? out.mul(R.data[0]).sum() : out.mul(R).sum()
  }
  const leaves = inputs.map((t) => new Tensor(t.data.slice(), t.shape, true))
  objective(leaves).backward()
  let worst = 0
  const eps = 1e-6
  leaves.forEach((leaf, li) => {
    for (let k = 0; k < leaf.size; k++) {
      const plus = inputs.map((t) => t.detach())
      const minus = inputs.map((t) => t.detach())
      plus[li].data[k] += eps
      minus[li].data[k] -= eps
      const numeric = (objective(plus).item() - objective(minus).item()) / (2 * eps)
      const analytic = leaf.grad ? leaf.grad[k] : 0
      const err = Math.abs(numeric - analytic) / Math.max(1, Math.abs(numeric) + Math.abs(analytic))
      worst = Math.max(worst, err)
      assert.ok(err < tol, `${name}: input ${li}[${k}] autograd ${analytic} vs numeric ${numeric} (rel err ${err})`)
    }
  })
  return worst
}

export function close(actual: number, expected: number, tol: number, msg = ''): void {
  assert.ok(Math.abs(actual - expected) <= tol, `${msg} expected ${expected}, got ${actual} (tol ${tol})`)
}

export function closeArrays(actual: ArrayLike<number>, expected: ArrayLike<number>, tol: number, msg = ''): void {
  assert.equal(actual.length, expected.length, `${msg} length`)
  for (let i = 0; i < actual.length; i++) close(actual[i], expected[i], tol, `${msg}[${i}]`)
}
