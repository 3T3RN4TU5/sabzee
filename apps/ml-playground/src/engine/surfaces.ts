/**
 * Classic 2-D optimisation test functions for the optimizer race. Each
 * surface is defined twice: a plain numeric version (for contour plots) and
 * a Tensor version, so gradients come from the autograd engine rather than
 * hand-written derivatives.
 */
import { clipGradNorm, createOptimizer, type Optimizer, type OptimizerName } from './optim.ts'
import { Tensor } from './tensor.ts'

export type SurfaceName = 'rosenbrock' | 'beale' | 'saddle' | 'himmelblau'

export interface Surface {
  id: SurfaceName
  label: string
  formula: string
  f: (x: number, y: number) => number
  tensor: (x: Tensor, y: Tensor) => Tensor
  domain: { xMin: number; xMax: number; yMin: number; yMax: number }
  start: [number, number]
  minima: [number, number][]
  /** Tuned learning rate per optimizer. */
  lr: Record<OptimizerName, number>
}

export const SURFACES: Surface[] = [
  {
    id: 'rosenbrock',
    label: 'Rosenbrock',
    formula: 'f(x,y) = (1-x)^2 + 100\\,(y-x^2)^2',
    f: (x, y) => (1 - x) ** 2 + 100 * (y - x * x) ** 2,
    tensor: (x, y) => x.neg().add(1).square().add(y.sub(x.square()).square().mul(100)),
    domain: { xMin: -2, xMax: 2, yMin: -1, yMax: 3 },
    start: [-1.2, 1],
    minima: [[1, 1]],
    lr: { sgd: 0.0006, momentum: 0.0003, nesterov: 0.0003, rmsprop: 0.005, adam: 0.05, adamw: 0.05 },
  },
  {
    id: 'beale',
    label: 'Beale',
    formula: 'f(x,y) = (1.5-x+xy)^2 + (2.25-x+xy^2)^2 + (2.625-x+xy^3)^2',
    f: (x, y) => (1.5 - x + x * y) ** 2 + (2.25 - x + x * y * y) ** 2 + (2.625 - x + x * y ** 3) ** 2,
    tensor: (x, y) => {
      const t1 = x.neg().add(x.mul(y)).add(1.5).square()
      const t2 = x.neg().add(x.mul(y.square())).add(2.25).square()
      const t3 = x.neg().add(x.mul(y.pow(3))).add(2.625).square()
      return t1.add(t2).add(t3)
    },
    domain: { xMin: -4.5, xMax: 4.5, yMin: -4.5, yMax: 4.5 },
    start: [1, 1.5],
    minima: [[3, 0.5]],
    lr: { sgd: 0.002, momentum: 0.0005, nesterov: 0.0005, rmsprop: 0.01, adam: 0.05, adamw: 0.05 },
  },
  {
    id: 'saddle',
    label: 'Saddle',
    formula: 'f(x,y) = x^2 - y^2 + \\tfrac{1}{2}y^4',
    f: (x, y) => x * x - y * y + 0.5 * y ** 4,
    tensor: (x, y) => x.square().sub(y.square()).add(y.pow(4).mul(0.5)),
    domain: { xMin: -2, xMax: 2, yMin: -2, yMax: 2 },
    start: [1.8, 0.002],
    minima: [
      [0, 1],
      [0, -1],
    ],
    lr: { sgd: 0.03, momentum: 0.01, nesterov: 0.01, rmsprop: 0.01, adam: 0.03, adamw: 0.03 },
  },
  {
    id: 'himmelblau',
    label: 'Himmelblau',
    formula: 'f(x,y) = (x^2+y-11)^2 + (x+y^2-7)^2',
    f: (x, y) => (x * x + y - 11) ** 2 + (x + y * y - 7) ** 2,
    tensor: (x, y) => x.square().add(y).sub(11).square().add(x.add(y.square()).sub(7).square()),
    domain: { xMin: -5, xMax: 5, yMin: -5, yMax: 5 },
    start: [-0.3, -0.9],
    minima: [
      [3, 2],
      [-2.805118, 3.131312],
      [-3.77931, -3.283186],
      [3.584428, -1.848126],
    ],
    lr: { sgd: 0.004, momentum: 0.0015, nesterov: 0.0015, rmsprop: 0.02, adam: 0.08, adamw: 0.08 },
  },
]

/** Drives one optimizer over a surface, recording its trajectory. */
export class SurfaceRunner {
  readonly x: Tensor
  readonly y: Tensor
  readonly optimizer: Optimizer
  readonly surface: Surface
  readonly path: number[] = []
  readonly losses: number[] = []
  diverged = false

  constructor(surface: Surface, name: OptimizerName, lr: number, start: [number, number]) {
    this.surface = surface
    this.x = new Tensor(Float64Array.of(start[0]), [1], true)
    this.y = new Tensor(Float64Array.of(start[1]), [1], true)
    this.optimizer = createOptimizer(name, [this.x, this.y], { lr })
    this.path.push(start[0], start[1])
    this.losses.push(surface.f(start[0], start[1]))
  }

  get position(): [number, number] {
    return [this.x.data[0], this.y.data[0]]
  }

  step(): void {
    if (this.diverged) return
    this.optimizer.zeroGrad()
    const loss = this.surface.tensor(this.x, this.y)
    loss.backward()
    clipGradNorm([this.x, this.y], 1e3)
    this.optimizer.step()
    const [px, py] = this.position
    const { xMin, xMax, yMin, yMax } = this.surface.domain
    const w = xMax - xMin
    const h = yMax - yMin
    if (!Number.isFinite(px) || !Number.isFinite(py) || px < xMin - w || px > xMax + w || py < yMin - h || py > yMax + h) {
      this.diverged = true
      return
    }
    this.path.push(px, py)
    this.losses.push(this.surface.f(px, py))
  }
}
