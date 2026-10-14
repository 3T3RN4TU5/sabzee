/**
 * Gradient checks: every differentiable op's autograd gradient must match
 * central finite differences.
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { bceWithLogits, broadcastShapes, buildMlp, crossEntropy, mse, noGrad, seededRng, Tensor } from '../src/engine/index.ts'
import { gradCheck } from './helpers.ts'

const rng = seededRng(2024)
const rand = (shape: number[], lo = -1, hi = 1) => {
  const n = shape.reduce((a, b) => a * b, 1)
  return new Tensor(Float64Array.from({ length: n }, () => lo + rng() * (hi - lo)), shape)
}
/** Values bounded away from 0 so kinks (relu, abs) are not straddled by ±ε. */
const awayFromZero = (shape: number[]) => {
  const t = rand(shape)
  for (let i = 0; i < t.size; i++) t.data[i] = Math.sign(t.data[i] || 1) * (0.1 + Math.abs(t.data[i]))
  return t
}

describe('autograd: elementwise binary ops with broadcasting', () => {
  const cases: [string, number[], number[]][] = [
    ['same shape', [3, 4], [3, 4]],
    ['row vector', [3, 4], [4]],
    ['column vector', [3, 4], [3, 1]],
    ['scalar', [3, 4], []],
    ['outer', [3, 1], [1, 4]],
    ['rank 3', [2, 3, 4], [3, 1]],
  ]
  for (const [label, sa, sb] of cases) {
    it(`add / sub / mul / div — ${label}`, () => {
      gradCheck('add', (a, b) => a.add(b), [rand(sa), rand(sb)])
      gradCheck('sub', (a, b) => a.sub(b), [rand(sa), rand(sb)])
      gradCheck('mul', (a, b) => a.mul(b), [rand(sa), rand(sb)])
      gradCheck('div', (a, b) => a.div(b), [rand(sa), rand(sb, 0.5, 2)])
    })
  }

  it('broadcastShapes follows NumPy rules', () => {
    assert.deepEqual(broadcastShapes([5, 1, 3], [4, 1]), [5, 4, 3])
    assert.deepEqual(broadcastShapes([], [2, 2]), [2, 2])
    assert.throws(() => broadcastShapes([3], [4]))
  })

  it('a tensor used twice accumulates both gradient paths', () => {
    gradCheck('x*x+x', (a) => a.mul(a).add(a), [rand([5])])
  })
})

describe('autograd: unary ops', () => {
  const unary: [string, (t: Tensor) => Tensor, () => Tensor][] = [
    ['neg', (t) => t.neg(), () => rand([4, 3])],
    ['pow 3', (t) => t.pow(3), () => rand([4, 3])],
    ['square', (t) => t.square(), () => rand([4, 3])],
    ['sqrt', (t) => t.sqrt(), () => rand([4, 3], 0.2, 2)],
    ['abs', (t) => t.abs(), () => awayFromZero([4, 3])],
    ['exp', (t) => t.exp(), () => rand([4, 3])],
    ['log', (t) => t.log(), () => rand([4, 3], 0.2, 3)],
    ['sin', (t) => t.sin(), () => rand([4, 3], -3, 3)],
    ['tanh', (t) => t.tanh(), () => rand([4, 3], -2, 2)],
    ['sigmoid', (t) => t.sigmoid(), () => rand([4, 3], -4, 4)],
    ['relu', (t) => t.relu(), () => awayFromZero([4, 3])],
    ['leakyRelu', (t) => t.leakyRelu(0.1), () => awayFromZero([4, 3])],
  ]
  for (const [name, f, make] of unary) it(name, () => void gradCheck(name, f, [make()]))
})

describe('autograd: shape, linear algebra and reductions', () => {
  it('reshape', () => {
    const w = rand([2, 6])
    gradCheck('reshape', (a) => a.reshape([2, -1]).mul(w), [rand([3, 4])])
  })
  it('transpose', () => void gradCheck('transpose', (a) => a.transpose(), [rand([3, 5])]))
  it('matmul', () => void gradCheck('matmul', (a, b) => a.matmul(b), [rand([4, 3]), rand([3, 5])]))
  it('matmul chain (A@B@C)', () => void gradCheck('matmul3', (a, b, c) => a.matmul(b).matmul(c), [rand([2, 3]), rand([3, 4]), rand([4, 2])]))
  it('sum (all)', () => void gradCheck('sum', (a) => a.sum(), [rand([3, 4])]))
  it('sum axis 0', () => void gradCheck('sum0', (a) => a.sum(0), [rand([3, 4])]))
  it('sum axis 1 keepDims', () => void gradCheck('sum1', (a) => a.sum(1, true), [rand([3, 4])]))
  it('sum axis -1 on rank 3', () => void gradCheck('sum-1', (a) => a.sum(-1), [rand([2, 3, 4])]))
  it('mean', () => void gradCheck('mean', (a) => a.mean(), [rand([3, 4])]))
  it('mean axis 0', () => void gradCheck('mean0', (a) => a.mean(0), [rand([3, 4])]))
  it('softmax', () => void gradCheck('softmax', (a) => a.softmax(), [rand([4, 5], -3, 3)]))
  it('logSoftmax', () => void gradCheck('logSoftmax', (a) => a.logSoftmax(), [rand([4, 5], -3, 3)]))
})

describe('autograd: losses', () => {
  it('softmax cross-entropy', () => {
    const y = [0, 2, 1, 2]
    gradCheck('crossEntropy', (a) => crossEntropy(a, y), [rand([4, 3], -2, 2)])
  })
  it('cross-entropy equals −mean(logSoftmax[y])', () => {
    const logits = rand([5, 4], -3, 3)
    const y = [3, 0, 1, 1, 2]
    const ls = logits.logSoftmax()
    const manual = -y.reduce((s, c, i) => s + ls.data[i * 4 + c], 0) / 5
    assert.ok(Math.abs(crossEntropy(logits, y).item() - manual) < 1e-12)
  })
  it('binary cross-entropy with logits', () => {
    const y = [1, 0, 0, 1, 1]
    gradCheck('bce', (a) => bceWithLogits(a, y), [rand([5, 1], -3, 3)])
  })
  it('mean squared error', () => void gradCheck('mse', (a, b) => mse(a, b), [rand([6, 2]), rand([6, 2])]))
  it('cross-entropy is stable for huge logits', () => {
    const logits = new Tensor([1000, -1000, 0, 0], [2, 2])
    const l = crossEntropy(logits, [0, 1]).item()
    assert.ok(Number.isFinite(l))
    assert.ok(Math.abs(l - Math.log(2) / 2) < 1e-9)
  })
})

describe('autograd: whole network', () => {
  it('MLP parameters (tanh) match finite differences', () => {
    const model = buildMlp({ inputs: 3, hidden: [4, 3], outputs: 2, activation: 'tanh' }, seededRng(5))
    const X = rand([6, 3])
    const y = [0, 1, 1, 0, 1, 0]
    const params = model.parameters()
    // Re-bind the model's parameters to the probe tensors gradCheck passes in.
    gradCheck(
      'mlp',
      (...ps) => {
        const saved = params.map((p) => p.data)
        params.forEach((p, i) => {
          p.data = ps[i].data
          p.requiresGrad = ps[i].requiresGrad
        })
        // Swap the actual tensors so gradients land on the probes.
        const layers = model.linears()
        const originals = layers.map((l) => [l.W, l.b] as const)
        layers.forEach((l, i) => {
          l.W = ps[2 * i]
          l.b = ps[2 * i + 1]
        })
        const out = crossEntropy(model.forward(X), y)
        layers.forEach((l, i) => {
          l.W = originals[i][0]
          l.b = originals[i][1]
        })
        params.forEach((p, i) => (p.data = saved[i]))
        return out
      },
      params.map((p) => p.detach()),
    )
  })

  it('noGrad() records no graph', () => {
    const a = new Tensor([1, 2, 3], [3], true)
    const out = noGrad(() => a.mul(2).sum())
    assert.equal(out.requiresGrad, false)
    assert.equal(out.parents.length, 0)
  })
})
