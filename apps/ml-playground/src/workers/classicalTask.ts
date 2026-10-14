/**
 * Pure job runner for the Classical ML page (executed inside a worker):
 * builds the dataset, fits the chosen model, evaluates it and optionally
 * sweeps its main hyper-parameter to show under- vs over-fitting.
 */
import irisJson from '../data/iris.json'
import wineJson from '../data/wine.json'
import {
  accuracy,
  classificationReport,
  confusionMatrix,
  DecisionTree,
  fitPca,
  fromJson,
  GaussianNB,
  KNNClassifier,
  LogisticRegression,
  make2D,
  matrix,
  pcaTransform,
  predict,
  RandomForest,
  rocCurve,
  seededRng,
  SVM,
  trainTestSplit,
  type Classifier,
  type Dataset,
  type Dataset2DName,
  type KernelName,
  type RealDatasetJson,
} from '../engine/index.ts'

export type DataSource = Dataset2DName | 'iris' | 'wine'

export interface DataSpec {
  source: DataSource
  noise: number
  n: number
  classes: number
  seed: number
  trainRatio: number
}

export type ModelSpec =
  | { kind: 'logistic'; degree: number; l2: number }
  | { kind: 'knn'; k: number; weighted: boolean }
  | { kind: 'tree'; maxDepth: number; minSamplesSplit: number; criterion: 'gini' | 'entropy' }
  | { kind: 'forest'; nTrees: number; maxDepth: number }
  | { kind: 'nb' }
  | { kind: 'svm'; kernel: KernelName; C: number; gamma: number; degree: number }

export type ModelKind = ModelSpec['kind']

export interface ClassicalRequest {
  id: number
  data: DataSpec
  model: ModelSpec
}

export interface ClassicalResult {
  id: number
  train: { xy: Float32Array; y: Int32Array }
  test: { xy: Float32Array; y: Int32Array }
  numClasses: number
  classNames: string[]
  res: number
  grid: Float32Array
  trainAcc: number
  testAcc: number
  confusion: number[][]
  report: { precision: number[]; recall: number[]; f1: number[]; macro: { precision: number; recall: number; f1: number } }
  roc: { fpr: number[]; tpr: number[]; auc: number } | null
  fitMs: number
  info: string
  supportVectors: Float32Array | null
  sweep: { param: string; xs: number[]; labels: string[]; train: number[]; test: number[]; current: number } | null
  error?: string
}

const GRID_RES = 90

function realDataset2D(source: 'iris' | 'wine'): Dataset & { classNames: string[] } {
  const ds = fromJson((source === 'iris' ? irisJson : wineJson) as RealDatasetJson)
  // Standardised PCA to two components, then scaled into the [-1,1]² plot box.
  const pca = fitPca(ds.X, { k: 2, standardize: true })
  const Z = pcaTransform(pca, ds.X, 2)
  let max = 0
  for (const v of Z.data) max = Math.max(max, Math.abs(v))
  for (let i = 0; i < Z.data.length; i++) Z.data[i] /= max * 1.08
  return { X: Z, y: ds.y, numClasses: ds.numClasses, classNames: ds.classNames }
}

export function buildData(spec: DataSpec): { train: Dataset; test: Dataset; classNames: string[] } {
  let ds: Dataset
  let classNames: string[]
  if (spec.source === 'iris' || spec.source === 'wine') {
    const r = realDataset2D(spec.source)
    ds = r
    classNames = r.classNames
  } else {
    ds = make2D(spec.source, { n: spec.n, noise: spec.noise, seed: spec.seed, classes: spec.classes })
    classNames = Array.from({ length: ds.numClasses }, (_, c) => String(c))
  }
  const { train, test } = trainTestSplit(ds, spec.trainRatio, seededRng(spec.seed + 101))
  return { train, test, classNames }
}

export function makeModel(spec: ModelSpec): Classifier {
  switch (spec.kind) {
    case 'logistic':
      return new LogisticRegression({ degree: spec.degree, l2: spec.l2, solver: 'newton' })
    case 'knn':
      return new KNNClassifier(spec.k, spec.weighted)
    case 'tree':
      return new DecisionTree({ maxDepth: spec.maxDepth || Infinity, minSamplesSplit: spec.minSamplesSplit, criterion: spec.criterion })
    case 'forest':
      return new RandomForest({ nTrees: spec.nTrees, maxDepth: spec.maxDepth || Infinity, seed: 7 })
    case 'nb':
      return new GaussianNB()
    case 'svm':
      return new SVM({ kernel: spec.kernel, C: spec.C, gamma: spec.gamma, degree: spec.degree })
  }
}

function sweepFor(spec: ModelSpec): { param: string; values: number[]; labels: string[]; apply: (v: number) => ModelSpec; current: number } | null {
  switch (spec.kind) {
    case 'logistic': {
      const values = [1, 2, 3, 4, 5, 6, 8]
      return { param: 'polynomial degree', values, labels: values.map(String), apply: (v) => ({ ...spec, degree: v }), current: spec.degree }
    }
    case 'knn': {
      const values = [1, 2, 3, 5, 8, 12, 20, 30, 50, 80]
      return { param: 'k (neighbours)', values, labels: values.map(String), apply: (v) => ({ ...spec, k: v }), current: spec.k }
    }
    case 'tree': {
      const values = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 0]
      return { param: 'max depth', values, labels: values.map((v) => (v ? String(v) : '∞')), apply: (v) => ({ ...spec, maxDepth: v }), current: spec.maxDepth }
    }
    case 'forest': {
      const values = [1, 2, 3, 4, 6, 8, 12, 0]
      return { param: 'max depth', values, labels: values.map((v) => (v ? String(v) : '∞')), apply: (v) => ({ ...spec, maxDepth: v, nTrees: Math.min(spec.nTrees, 40) }), current: spec.maxDepth }
    }
    case 'svm':
      if (spec.kernel === 'rbf') {
        const values = [0.1, 0.3, 1, 3, 10, 30, 100, 300]
        return { param: 'RBF γ', values, labels: values.map(String), apply: (v) => ({ ...spec, gamma: v }), current: spec.gamma }
      } else {
        const values = [0.01, 0.1, 1, 10, 100]
        return { param: 'C', values, labels: values.map(String), apply: (v) => ({ ...spec, C: v }), current: spec.C }
      }
    default:
      return null
  }
}

function gridMatrix(res: number) {
  const m = matrix(res * res, 2)
  for (let r = 0; r < res; r++) {
    for (let c = 0; c < res; c++) {
      m.data[(r * res + c) * 2] = -1 + ((c + 0.5) / res) * 2
      m.data[(r * res + c) * 2 + 1] = 1 - ((r + 0.5) / res) * 2
    }
  }
  return m
}
const GRID = gridMatrix(GRID_RES)

function describe(model: Classifier): string {
  if (model instanceof DecisionTree) return `depth ${model.depth()} · ${model.leaves()} leaves`
  if (model instanceof RandomForest) return `${model.trees.length} trees · mean depth ${(model.trees.reduce((s, t) => s + t.depth(), 0) / (model.trees.length || 1)).toFixed(1)}`
  if (model instanceof SVM) return `${model.supportVectors().length} support vectors`
  if (model instanceof LogisticRegression) return `${model.weights.length / (model.numClasses === 2 ? 1 : model.numClasses)} features · ${model.iterations} Newton/GD steps`
  if (model instanceof KNNClassifier) return 'k-d tree index'
  return 'per-class Gaussians'
}

export function runClassical(req: ClassicalRequest, withSweep = true): ClassicalResult {
  const { train, test, classNames } = buildData(req.data)
  const k = train.numClasses
  const model = makeModel(req.model)
  const t0 = performance.now()
  model.fit(train.X, train.y, k)
  const fitMs = performance.now() - t0
  const grid = Float32Array.from(model.predictProba(GRID))
  const trainPred = predict(model, train.X)
  const testProba = model.predictProba(test.X)
  const testPred = Int32Array.from({ length: test.X.rows }, (_, i) => {
    let best = 0
    for (let c = 1; c < k; c++) if (testProba[i * k + c] > testProba[i * k + best]) best = c
    return best
  })
  const cm = confusionMatrix(test.y, testPred, k)
  const report = classificationReport(cm)
  let roc = null
  if (k === 2) {
    const scores = Array.from({ length: test.X.rows }, (_, i) => testProba[i * 2 + 1])
    roc = rocCurve(test.y, scores)
  }
  let supportVectors: Float32Array | null = null
  if (model instanceof SVM) {
    const sv = model.supportVectors()
    supportVectors = new Float32Array(sv.length * 2)
    sv.forEach((i, j) => {
      supportVectors![2 * j] = train.X.data[i * 2]
      supportVectors![2 * j + 1] = train.X.data[i * 2 + 1]
    })
  }

  let sweep: ClassicalResult['sweep'] = null
  const sw = withSweep ? sweepFor(req.model) : null
  if (sw) {
    const trainAcc: number[] = []
    const testAcc: number[] = []
    for (const v of sw.values) {
      const m = makeModel(sw.apply(v))
      m.fit(train.X, train.y, k)
      trainAcc.push(accuracy(train.y, predict(m, train.X)))
      testAcc.push(accuracy(test.y, predict(m, test.X)))
    }
    sweep = { param: sw.param, xs: sw.values, labels: sw.labels, train: trainAcc, test: testAcc, current: Math.max(0, sw.values.indexOf(sw.current)) }
  }

  return {
    id: req.id,
    train: { xy: Float32Array.from(train.X.data), y: train.y },
    test: { xy: Float32Array.from(test.X.data), y: test.y },
    numClasses: k,
    classNames,
    res: GRID_RES,
    grid,
    trainAcc: accuracy(train.y, trainPred),
    testAcc: accuracy(test.y, testPred),
    confusion: cm,
    report,
    roc,
    fitMs,
    info: describe(model),
    supportVectors,
    sweep,
  }
}
