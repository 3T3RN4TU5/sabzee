/**
 * Classical models: closed-form vs iterative solvers, cross-checks against
 * scikit-learn fixtures (tests/fixtures/sklearn.json, from
 * scripts/make_fixtures.py), and behavioural guarantees.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import {
  accuracy,
  bruteForceKnn,
  DecisionTree,
  fitLinearRegression,
  fitLinearRegressionGD,
  fitPolynomial1D,
  fromJson,
  fromRows,
  GaussianNB,
  KDTree,
  KNNClassifier,
  LogisticRegression,
  make2D,
  makeRegression1D,
  meanSquaredError,
  monomials,
  polynomialFeatures,
  predict,
  predictPolynomial1D,
  qrSolve,
  RandomForest,
  seededRng,
  SVM,
  trainTestSplit,
  type RealDatasetJson,
} from '../src/engine/index.ts'
import { close, closeArrays } from './helpers.ts'

const fixtures = JSON.parse(readFileSync(new URL('./fixtures/sklearn.json', import.meta.url), 'utf8'))
const iris = fromJson(JSON.parse(readFileSync(new URL('../src/data/iris.json', import.meta.url), 'utf8')) as RealDatasetJson)

describe('linear regression', () => {
  const { X, y, coef, intercept, ridgeAlpha, ridgeCoef, ridgeIntercept } = fixtures.linear
  const Xm = fromRows(X)

  it('Cholesky normal equations match scikit-learn LinearRegression', () => {
    const m = fitLinearRegression(Xm, y, { method: 'cholesky' })
    closeArrays(m.weights, coef, 1e-8, 'coef')
    close(m.bias, intercept, 1e-8, 'intercept')
  })

  it('Householder QR matches the Cholesky solution', () => {
    const a = fitLinearRegression(Xm, y, { method: 'qr' })
    const b = fitLinearRegression(Xm, y, { method: 'cholesky' })
    closeArrays(a.weights, b.weights, 1e-10)
    close(a.bias, b.bias, 1e-10)
  })

  it('ridge (both solvers) matches scikit-learn Ridge', () => {
    for (const method of ['cholesky', 'qr'] as const) {
      const m = fitLinearRegression(Xm, y, { alpha: ridgeAlpha, method })
      closeArrays(m.weights, ridgeCoef, 1e-8, method)
      close(m.bias, ridgeIntercept, 1e-8, method)
    }
  })

  it('gradient descent (autograd) converges to the closed-form optimum', () => {
    const gd = fitLinearRegressionGD(Xm, y, { lr: 0.3, epochs: 1500 })
    closeArrays(gd.weights, coef, 1e-6, 'gd coef')
    close(gd.bias, intercept, 1e-6, 'gd intercept')
  })

  it('QR solves an exactly determined system', () => {
    const x = qrSolve(fromRows([[2, 1], [1, 3]]), [3, 5])
    closeArrays(x, [0.8, 1.4], 1e-12)
  })

  it('polynomial features enumerate all monomials', () => {
    assert.equal(monomials(2, 3).length, 9) // x, y, x², xy, y², x³, x²y, xy², y³
    const F = polynomialFeatures(fromRows([[2, 3]]), 2)
    assert.deepEqual(Array.from(F.data).sort((a, b) => a - b), [2, 3, 4, 6, 9])
  })

  it('bias–variance: training error falls with degree while test error turns back up', () => {
    const train = makeRegression1D(20, 0.2, 1)
    const test = makeRegression1D(500, 0.2, 2)
    const err = (deg: number) => {
      const m = fitPolynomial1D(train.x, train.y, deg, 0)
      return {
        train: meanSquaredError(predictPolynomial1D(m, train.x), train.y),
        test: meanSquaredError(predictPolynomial1D(m, test.x), test.y),
      }
    }
    const e1 = err(1)
    const e4 = err(4)
    const e15 = err(15)
    assert.ok(e15.train < e4.train && e4.train < e1.train)
    assert.ok(e4.test < e1.test, 'underfit line is worse than degree 4')
    assert.ok(e15.test > e4.test, 'degree 15 overfits')
  })
})

describe('logistic regression', () => {
  const { X, y, coef, intercept } = fixtures.logistic
  const Xm = fromRows(X)
  const ym = Int32Array.from(y)

  it('Newton/IRLS matches scikit-learn (no penalty)', () => {
    const m = new LogisticRegression({ l2: 0, solver: 'newton' })
    m.fit(Xm, ym, 2)
    closeArrays(m.weights, coef, 1e-6, 'coef')
    close(m.bias[0], intercept, 1e-6, 'intercept')
    assert.ok(m.iterations < 15)
  })

  it('gradient descent reaches the same optimum as Newton', () => {
    const gd = new LogisticRegression({ l2: 0, solver: 'gd', iters: 6000, lr: 1 })
    gd.fit(Xm, ym, 2)
    closeArrays(gd.weights, coef, 1e-4, 'gd coef')
    close(gd.bias[0], intercept, 1e-4, 'gd intercept')
  })

  it('softmax regression separates three blobs', () => {
    const ds = make2D('blobs', { n: 300, noise: 0, seed: 4, classes: 3 })
    const m = new LogisticRegression({ l2: 1e-4 })
    m.fit(ds.X, ds.y, 3)
    assert.ok(accuracy(ds.y, predict(m, ds.X)) > 0.97)
  })

  it('polynomial features let logistic regression solve circles', () => {
    const ds = make2D('circles', { n: 300, noise: 0.05, seed: 2 })
    const lin = new LogisticRegression({ degree: 1 })
    const quad = new LogisticRegression({ degree: 2 })
    lin.fit(ds.X, ds.y, 2)
    quad.fit(ds.X, ds.y, 2)
    assert.ok(accuracy(ds.y, predict(lin, ds.X)) < 0.7)
    assert.ok(accuracy(ds.y, predict(quad, ds.X)) > 0.98)
  })
})

describe('k-nearest neighbours', () => {
  it('k-d tree returns exactly the brute-force neighbours', () => {
    const rng = seededRng(8)
    const rows = Array.from({ length: 500 }, () => [rng(), rng(), rng()])
    const X = fromRows(rows)
    const tree = new KDTree(X)
    for (let q = 0; q < 100; q++) {
      const query = [rng(), rng(), rng()]
      for (const k of [1, 5, 17]) {
        const a = tree.query(query, k)
        const b = bruteForceKnn(X, query, k)
        closeArrays(a.dist2, b.dist2, 1e-12)
      }
    }
  })

  it('1-NN memorises the training set; k-NN generalises on moons', () => {
    const ds = make2D('moons', { n: 400, noise: 0.15, seed: 5 })
    const { train, test } = trainTestSplit(ds, 0.7, seededRng(2))
    const one = new KNNClassifier(1)
    one.fit(train.X, train.y, 2)
    assert.equal(accuracy(train.y, predict(one, train.X)), 1)
    const fifteen = new KNNClassifier(15)
    fifteen.fit(train.X, train.y, 2)
    assert.ok(accuracy(test.y, predict(fifteen, test.X)) > 0.9)
  })
})

describe('trees and forests', () => {
  for (const criterion of ['gini', 'entropy'] as const) {
    it(`unlimited-depth tree (${criterion}) fits the training data perfectly`, () => {
      const ds = make2D('spiral', { n: 300, noise: 0.3, seed: 9 })
      const tree = new DecisionTree({ criterion })
      tree.fit(ds.X, ds.y, 2)
      assert.equal(accuracy(ds.y, predict(tree, ds.X)), 1)
      assert.ok(tree.depth() > 3)
    })
  }

  it('maxDepth limits the tree', () => {
    const ds = make2D('spiral', { n: 300, noise: 0.3, seed: 9 })
    const tree = new DecisionTree({ maxDepth: 3 })
    tree.fit(ds.X, ds.y, 2)
    assert.ok(tree.depth() <= 3)
    assert.ok(tree.leaves() <= 8)
  })

  it('a random forest beats a single deep tree on held-out noisy data', () => {
    const ds = make2D('moons', { n: 500, noise: 1, seed: 3 })
    const { train, test } = trainTestSplit(ds, 0.6, seededRng(3))
    const tree = new DecisionTree()
    tree.fit(train.X, train.y, 2)
    const forest = new RandomForest({ nTrees: 60, maxDepth: 8, seed: 4 })
    forest.fit(train.X, train.y, 2)
    assert.ok(accuracy(test.y, predict(forest, test.X)) > accuracy(test.y, predict(tree, test.X)))
  })
})

describe('Gaussian naive Bayes', () => {
  it('matches scikit-learn means, variances and predictions on Iris', () => {
    const nb = new GaussianNB()
    nb.fit(iris.X, iris.y, 3)
    closeArrays(nb.theta, fixtures.gnbIris.theta.flat(), 1e-8, 'theta')
    closeArrays(nb.variance, fixtures.gnbIris.var.flat(), 1e-8, 'var')
    assert.deepEqual(Array.from(predict(nb, iris.X)), fixtures.gnbIris.predictions)
  })
})

describe('support vector machine (SMO)', () => {
  it('a linear SVM separates linearly separable data with margin', () => {
    const ds = make2D('linear', { n: 200, noise: 0, seed: 6 })
    const svm = new SVM({ kernel: 'linear', C: 100 })
    svm.fit(ds.X, ds.y, 2)
    assert.equal(accuracy(ds.y, predict(svm, ds.X)), 1)
    // Functional margin y·f(x) ≥ 1 − tol for every training point (hard-margin regime).
    const f = svm.decisionFunction(ds.X)
    for (let i = 0; i < ds.y.length; i++) assert.ok((ds.y[i] === 1 ? 1 : -1) * f[i] > 0.99)
    // Only a few points are support vectors.
    assert.ok(svm.supportVectors().length < 12)
  })

  it('the RBF kernel solves concentric circles', () => {
    const ds = make2D('circles', { n: 300, noise: 0.1, seed: 3 })
    const { train, test } = trainTestSplit(ds, 0.7, seededRng(5))
    const svm = new SVM({ kernel: 'rbf', gamma: 3, C: 3 })
    svm.fit(train.X, train.y, 2)
    assert.ok(accuracy(test.y, predict(svm, test.X)) > 0.95)
  })

  it('one-vs-rest handles three classes', () => {
    const ds = make2D('blobs', { n: 240, noise: 0, seed: 1, classes: 3 })
    const svm = new SVM({ kernel: 'rbf', gamma: 2, C: 1 })
    svm.fit(ds.X, ds.y, 3)
    assert.ok(accuracy(ds.y, predict(svm, ds.X)) > 0.97)
  })
})
