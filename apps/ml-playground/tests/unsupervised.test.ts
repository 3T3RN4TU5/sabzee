/** Clustering, PCA, eigen-solvers, t-SNE and evaluation metrics. */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import {
  accuracy,
  classificationReport,
  confusionMatrix,
  dbscan,
  fitPca,
  fromJson,
  fromRows,
  jacobiEigen,
  kmeans,
  make2D,
  matmul,
  matrix,
  pcaTransform,
  powerIteration,
  rocCurve,
  seededRng,
  silhouetteScore,
  transpose,
  TSNE,
  type RealDatasetJson,
} from '../src/engine/index.ts'
import { close, closeArrays } from './helpers.ts'

const fixtures = JSON.parse(readFileSync(new URL('./fixtures/sklearn.json', import.meta.url), 'utf8'))
const iris = fromJson(JSON.parse(readFileSync(new URL('../src/data/iris.json', import.meta.url), 'utf8')) as RealDatasetJson)

/** Q diag(λ) Qᵀ for a random orthogonal Q (Gram–Schmidt): known eigenvalues. */
function craftedSymmetric(lambdas: number[], seed: number) {
  const n = lambdas.length
  const rng = seededRng(seed)
  const Q = matrix(n, n)
  for (let c = 0; c < n; c++) {
    const v = Array.from({ length: n }, () => rng() - 0.5)
    for (let p = 0; p < c; p++) {
      let d = 0
      for (let i = 0; i < n; i++) d += v[i] * Q.data[i * n + p]
      for (let i = 0; i < n; i++) v[i] -= d * Q.data[i * n + p]
    }
    const norm = Math.hypot(...v)
    for (let i = 0; i < n; i++) Q.data[i * n + c] = v[i] / norm
  }
  const D = matrix(n, n)
  lambdas.forEach((l, i) => (D.data[i * n + i] = l))
  return { A: matmul(matmul(Q, D), transpose(Q)), Q }
}

describe('eigendecomposition', () => {
  const lambdas = [9, 5, 2.5, 1, 0.25]
  const { A } = craftedSymmetric(lambdas, 3)

  it('Jacobi recovers the known eigenvalues and orthonormal eigenvectors', () => {
    const { values, vectors } = jacobiEigen(A)
    closeArrays(values, lambdas, 1e-10)
    const VVt = matmul(vectors, transpose(vectors))
    for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) close(VVt.data[i * 5 + j], i === j ? 1 : 0, 1e-10)
    // A v = λ v
    for (let k = 0; k < 5; k++) {
      for (let i = 0; i < 5; i++) {
        let s = 0
        for (let j = 0; j < 5; j++) s += A.data[i * 5 + j] * vectors.data[k * 5 + j]
        close(s, lambdas[k] * vectors.data[k * 5 + i], 1e-9)
      }
    }
  })

  it('power iteration with deflation finds the same top eigenpairs', () => {
    const p = powerIteration(A, 3, 5000, 1e-14)
    const j = jacobiEigen(A)
    closeArrays(p.values, lambdas.slice(0, 3), 1e-8)
    for (let k = 0; k < 3; k++) {
      const dot = Array.from({ length: 5 }, (_, i) => p.vectors.data[k * 5 + i] * j.vectors.data[k * 5 + i]).reduce((a, b) => a + b)
      close(Math.abs(dot), 1, 1e-6)
    }
  })

  it('2×2 textbook case', () => {
    const { values } = jacobiEigen(fromRows([[2, 1], [1, 2]]))
    closeArrays(values, [3, 1], 1e-12)
  })
})

describe('PCA', () => {
  it('matches scikit-learn explained variance and components on Iris', () => {
    for (const method of ['jacobi', 'power'] as const) {
      const pca = fitPca(iris.X, { method })
      closeArrays(pca.explainedVariance, fixtures.pcaIris.explainedVariance, 1e-6, method)
      closeArrays(pca.explainedVarianceRatio, fixtures.pcaIris.explainedVarianceRatio, 1e-7, method)
      for (let k = 0; k < 4; k++) {
        const ours = pca.components.data.subarray(k * 4, k * 4 + 4)
        const theirs = fixtures.pcaIris.components[k] as number[]
        const sign = Math.sign(ours.reduce((s, v, i) => s + v * theirs[i], 0))
        closeArrays(ours.map((v) => v * sign), theirs, 1e-5, `${method} component ${k}`)
      }
    }
  })

  it('projections are uncorrelated with variances equal to the eigenvalues', () => {
    const pca = fitPca(iris.X)
    const Z = pcaTransform(pca, iris.X, 2)
    let v0 = 0
    let c01 = 0
    for (let i = 0; i < Z.rows; i++) {
      v0 += Z.data[i * 2] ** 2
      c01 += Z.data[i * 2] * Z.data[i * 2 + 1]
    }
    close(v0 / (Z.rows - 1), pca.explainedVariance[0], 1e-9)
    close(c01 / (Z.rows - 1), 0, 1e-9)
  })
})

describe('k-means++', () => {
  it('recovers well-separated Gaussian blobs', () => {
    const centres = [
      [-5, -5],
      [5, -5],
      [0, 6],
      [8, 8],
    ]
    const rng = seededRng(4)
    const rows: number[][] = []
    const truth: number[] = []
    for (let i = 0; i < 400; i++) {
      const c = i % 4
      rows.push([centres[c][0] + (rng() - 0.5), centres[c][1] + (rng() - 0.5)])
      truth.push(c)
    }
    const X = fromRows(rows)
    const res = kmeans(X, 4, { seed: 9 })
    // Every true centre has a fitted centroid within 0.2.
    for (const [cx, cy] of centres) {
      const best = Math.min(...Array.from({ length: 4 }, (_, k) => Math.hypot(res.centroids.data[k * 2] - cx, res.centroids.data[k * 2 + 1] - cy)))
      assert.ok(best < 0.2, `centre ${cx},${cy} off by ${best}`)
    }
    // Clusters are pure: each fitted label maps to exactly one true label.
    const mapping = new Map<number, number>()
    for (let i = 0; i < 400; i++) {
      const prev = mapping.get(res.labels[i])
      if (prev === undefined) mapping.set(res.labels[i], truth[i])
      else assert.equal(prev, truth[i])
    }
    assert.ok(silhouetteScore(X, res.labels) > 0.85)
  })

  it('inertia decreases monotonically with k (elbow curve)', () => {
    const ds = make2D('blobs', { n: 300, noise: 0.2, seed: 2, classes: 4 })
    let prev = Infinity
    for (let k = 1; k <= 6; k++) {
      const r = kmeans(ds.X, k, { seed: 1, nInit: 4 })
      assert.ok(r.inertia <= prev + 1e-9)
      prev = r.inertia
    }
  })
})

describe('DBSCAN', () => {
  it('finds both moons and labels far outliers as noise', () => {
    const ds = make2D('moons', { n: 300, noise: 0.05, seed: 3 })
    const rows = []
    for (let i = 0; i < ds.X.rows; i++) rows.push([ds.X.data[i * 2], ds.X.data[i * 2 + 1]])
    rows.push([5, 5], [-5, 5])
    const res = dbscan(fromRows(rows), 0.2, 5)
    assert.equal(res.numClusters, 2)
    assert.equal(res.labels[300], -1)
    assert.equal(res.labels[301], -1)
    // Cluster labels agree with the true moon labels (up to permutation).
    const agree = Array.from(ds.y).filter((c, i) => c === res.labels[i]).length / 300
    assert.ok(agree > 0.97 || agree < 0.03)
  })
})

describe('t-SNE', () => {
  it('reduces the KL divergence and separates two distant clusters', () => {
    const rng = seededRng(6)
    const rows: number[][] = []
    for (let i = 0; i < 60; i++) rows.push(Array.from({ length: 5 }, () => (i < 30 ? 0 : 10) + rng()))
    const tsne = new TSNE(fromRows(rows), { perplexity: 10 })
    tsne.step()
    for (let i = 0; i < 300; i++) tsne.step()
    const early = new TSNE(fromRows(rows), { perplexity: 10 })
    for (let i = 0; i < 101; i++) early.step()
    assert.ok(tsne.kl < early.kl)
    const labels = Array.from({ length: 60 }, (_, i) => (i < 30 ? 0 : 1))
    assert.ok(silhouetteScore({ rows: 60, cols: 2, data: tsne.Y }, labels) > 0.7)
  })
})

describe('metrics', () => {
  it('confusion matrix, precision / recall / F1', () => {
    const yTrue = [0, 0, 1, 1, 1, 2]
    const yPred = [0, 1, 1, 1, 0, 2]
    const cm = confusionMatrix(yTrue, yPred, 3)
    assert.deepEqual(cm, [
      [1, 1, 0],
      [1, 2, 0],
      [0, 0, 1],
    ])
    const rep = classificationReport(cm)
    closeArrays(rep.precision, [0.5, 2 / 3, 1], 1e-12)
    closeArrays(rep.recall, [0.5, 2 / 3, 1], 1e-12)
    close(accuracy(yTrue, yPred), 4 / 6, 1e-12)
  })

  it('ROC AUC equals the probability a positive outranks a negative', () => {
    const y = [0, 0, 1, 1, 0, 1]
    const s = [0.1, 0.4, 0.35, 0.8, 0.2, 0.9]
    // Pairs (pos, neg) correctly ordered: 0.35>0.1,0.2 ; 0.8>all ; 0.9>all → 8 of 9.
    close(rocCurve(y, s).auc, 8 / 9, 1e-12)
    close(rocCurve([0, 1], [0.2, 0.8]).auc, 1, 1e-12)
    close(rocCurve([0, 1, 0, 1], [0.5, 0.5, 0.5, 0.5]).auc, 0.5, 1e-12)
  })
})
