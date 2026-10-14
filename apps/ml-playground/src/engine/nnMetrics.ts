/** Cross-entropy and accuracy from class-probability rows. */
export function metricsFromProbs(probs: Float64Array, y: ArrayLike<number>, k: number): { loss: number; accuracy: number } {
  const n = y.length
  let loss = 0
  let correct = 0
  for (let i = 0; i < n; i++) {
    loss -= Math.log(Math.max(probs[i * k + y[i]], 1e-12))
    let best = 0
    for (let c = 1; c < k; c++) if (probs[i * k + c] > probs[i * k + best]) best = c
    if (best === y[i]) correct++
  }
  return { loss: n ? loss / n : 0, accuracy: n ? correct / n : 0 }
}
