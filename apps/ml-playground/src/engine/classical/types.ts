import type { Matrix } from '../linalg.ts'
import { argmaxRows } from '../metrics.ts'

/** Common interface for every classifier in the playground. */
export interface Classifier {
  /** Train on X (n×d) with integer labels 0…numClasses−1. */
  fit(X: Matrix, y: Int32Array, numClasses: number): void
  /** Row-major n×numClasses class probabilities (or normalised scores). */
  predictProba(X: Matrix): Float64Array
  readonly numClasses: number
}

export function predict(model: Classifier, X: Matrix): Int32Array {
  return argmaxRows(model.predictProba(X), model.numClasses)
}
