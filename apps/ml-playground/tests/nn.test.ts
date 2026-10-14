/** Neural-network module, optimizers, schedules and the training loop. */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  createOptimizer,
  Dropout,
  fromRows,
  initStd,
  Linear,
  make2D,
  OPTIMIZER_NAMES,
  scheduledLr,
  seededRng,
  SURFACES,
  SurfaceRunner,
  Tensor,
  Trainer,
  trainTestSplit,
  type TrainConfig,
} from '../src/engine/index.ts'
import { close } from './helpers.ts'

describe('optimizers', () => {
  /**
   * Ill-conditioned convex quadratic f(w) = ½ Σ λᵢ (wᵢ − cᵢ)² with
   * condition number 10; the unique minimiser is c.
   */
  const lambdas = [1, 3, 10]
  const target = [2, -1, 0.5]
  const lrFor: Record<string, number> = { sgd: 0.09, momentum: 0.05, nesterov: 0.05, rmsprop: 0.01, adam: 0.05, adamw: 0.05 }
  for (const name of OPTIMIZER_NAMES) {
    it(`${name} converges on a convex quadratic`, () => {
      const w = Tensor.zeros([3], true)
      const lam = new Tensor(lambdas, [3])
      const c = new Tensor(target, [3])
      const opt = createOptimizer(name, [w], { lr: lrFor[name] })
      let loss = Infinity
      for (let t = 0; t < 3000; t++) {
        opt.zeroGrad()
        const f = w.sub(c).square().mul(lam).sum().mul(0.5)
        loss = f.item()
        f.backward()
        opt.step()
        // Decay the step for the adaptive methods so they settle exactly.
        if (name === 'rmsprop' || name.startsWith('adam')) opt.lr = lrFor[name] / Math.sqrt(1 + t / 50)
      }
      assert.ok(loss < 1e-6, `${name} final loss ${loss}`)
      for (let i = 0; i < 3; i++) close(w.data[i], target[i], 2e-3, `${name} w[${i}]`)
    })
  }

  it('momentum beats plain SGD at the same step size on an ill-conditioned bowl', () => {
    const run = (name: 'sgd' | 'momentum') => {
      const w = new Tensor([5, 5], [2], true)
      const lam = new Tensor([1, 50], [2])
      const opt = createOptimizer(name, [w], { lr: 0.015 })
      for (let t = 0; t < 150; t++) {
        opt.zeroGrad()
        w.square().mul(lam).sum().mul(0.5).backward()
        opt.step()
      }
      return Math.hypot(w.data[0], w.data[1])
    }
    assert.ok(run('momentum') < run('sgd') / 10)
  })

  it('weight decay: coupled L2 shrinks matrices but not bias vectors', () => {
    const W = new Tensor([1, 1, 1, 1], [2, 2], true)
    const b = new Tensor([1, 1], [2], true)
    W.ensureGrad()
    b.ensureGrad()
    const opt = createOptimizer('sgd', [W, b], { lr: 0.1, weightDecay: 0.5 })
    opt.step()
    close(W.data[0], 1 - 0.1 * 0.5, 1e-12)
    close(b.data[0], 1, 1e-12)
  })

  it('AdamW decays weights independently of the gradient scale', () => {
    const W = new Tensor([2, 2, 2, 2], [2, 2], true)
    W.ensureGrad() // zero gradient
    const opt = createOptimizer('adamw', [W], { lr: 0.1, weightDecay: 0.1 })
    opt.step()
    close(W.data[0], 2 * (1 - 0.01), 1e-9)
  })

  it('learning-rate schedules', () => {
    close(scheduledLr(0.1, { kind: 'constant' }, 99), 0.1, 1e-15)
    close(scheduledLr(0.1, { kind: 'step', stepSize: 10, gamma: 0.5 }, 25), 0.025, 1e-15)
    close(scheduledLr(0.1, { kind: 'cosine', period: 100, minFactor: 0 }, 0), 0.1, 1e-15)
    close(scheduledLr(0.1, { kind: 'cosine', period: 100, minFactor: 0 }, 50), 0.05, 1e-12)
    close(scheduledLr(0.1, { kind: 'cosine', period: 100, minFactor: 0.1 }, 99.9999), 0.01, 1e-6)
  })

  it('Adam reaches the Rosenbrock valley minimum on the race surface', () => {
    const rb = SURFACES.find((s) => s.id === 'rosenbrock')!
    const runner = new SurfaceRunner(rb, 'adam', rb.lr.adam, rb.start)
    for (let i = 0; i < 3000; i++) runner.step()
    const [x, y] = runner.position
    assert.ok(!runner.diverged)
    assert.ok(Math.hypot(x - 1, y - 1) < 0.05, `ended at ${x}, ${y}`)
  })

  it('surface autograd gradients equal the analytic Rosenbrock gradient', () => {
    const rb = SURFACES.find((s) => s.id === 'rosenbrock')!
    const x = new Tensor([-0.7], [1], true)
    const y = new Tensor([1.3], [1], true)
    rb.tensor(x, y).backward()
    close(x.grad![0], -2 * (1 - -0.7) - 400 * -0.7 * (1.3 - 0.49), 1e-9)
    close(y.grad![0], 200 * (1.3 - 0.49), 1e-9)
  })
})

describe('nn layers', () => {
  it('Xavier and He initialisation have the right variance', () => {
    const rng = seededRng(1)
    for (const [init, expected] of [
      ['xavier', Math.sqrt(2 / (200 + 300))],
      ['he', Math.sqrt(2 / 200)],
    ] as const) {
      const lin = new Linear(200, 300, rng, init)
      let s = 0
      for (const v of lin.W.data) s += v * v
      close(Math.sqrt(s / lin.W.size), expected, expected * 0.03, init)
      assert.equal(initStd(init, 200, 300), expected)
    }
  })

  it('inverted dropout keeps the expected activation and is a no-op at inference', () => {
    const d = new Dropout(0.3, seededRng(3))
    const x = Tensor.ones([100, 100])
    const y = d.forward(x, true)
    const mean = y.data.reduce((a, b) => a + b, 0) / y.size
    close(mean, 1, 0.03)
    assert.ok(y.data.some((v) => v === 0))
    assert.equal(d.forward(x, false), x)
  })
})

describe('training loop', () => {
  const baseCfg: TrainConfig = {
    features: ['x1', 'x2'],
    hidden: [8],
    activation: 'tanh',
    optimizer: 'adam',
    lr: 0.03,
    batchSize: 16,
    l2: 0,
    dropout: 0,
    schedule: { kind: 'constant' },
    seed: 7,
  }

  it('an MLP solves XOR (the four canonical points) to 100%', () => {
    const X = fromRows([
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
    ])
    const ds = { X, y: Int32Array.from([0, 1, 1, 0]), numClasses: 2 }
    const trainer = new Trainer({ ...baseCfg, hidden: [4], batchSize: 4, lr: 0.05 }, ds)
    for (let e = 0; e < 500; e++) trainer.trainEpoch()
    const r = trainer.evaluate(ds)
    assert.equal(r.accuracy, 1)
    assert.ok(r.loss < 0.01, `loss ${r.loss}`)
  })

  it('an MLP classifies the noisy XOR dataset to > 99% on held-out data', () => {
    const ds = make2D('xor', { n: 600, noise: 0, seed: 11 })
    const { train, test } = trainTestSplit(ds, 0.7, seededRng(1))
    const trainer = new Trainer({ ...baseCfg, hidden: [8, 8] }, train)
    for (let e = 0; e < 300; e++) trainer.trainEpoch()
    const r = trainer.evaluate(test)
    assert.ok(r.accuracy > 0.99, `test accuracy ${r.accuracy}`)
  })

  it('an MLP fits the two-arm spiral', () => {
    const ds = make2D('spiral', { n: 400, noise: 0.05, seed: 3 })
    const trainer = new Trainer({ ...baseCfg, hidden: [16, 16], activation: 'relu', lr: 0.01 }, ds)
    for (let e = 0; e < 400; e++) trainer.trainEpoch()
    const r = trainer.evaluate(ds)
    assert.ok(r.accuracy > 0.97, `train accuracy ${r.accuracy}`)
  })

  it('forwardWithActivations exposes every hidden layer and proper probabilities', () => {
    const ds = make2D('circles', { n: 50, noise: 0.1, seed: 2 })
    const trainer = new Trainer({ ...baseCfg, hidden: [5, 3], features: ['x1', 'x2', 'x1sq'] }, ds)
    const { features, layers, probs } = trainer.forwardWithActivations(ds.X)
    assert.equal(features.cols, 3)
    assert.deepEqual(
      layers.map((l) => l.cols),
      [5, 3],
    )
    for (let i = 0; i < 50; i++) close(probs[2 * i] + probs[2 * i + 1], 1, 1e-12)
  })
})
