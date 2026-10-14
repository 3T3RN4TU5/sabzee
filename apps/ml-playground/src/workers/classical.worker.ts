/**
 * Fits classical models off the main thread so dragging a slider never
 * blocks rendering. Only the latest request is answered.
 */
import { runClassical, type ClassicalRequest, type ClassicalResult } from './classicalTask.ts'

let pending: ClassicalRequest | null = null
let busy = false

function drain() {
  if (busy || !pending) return
  const req = pending
  pending = null
  busy = true
  let result: ClassicalResult
  try {
    result = runClassical(req)
  } catch (err) {
    result = { id: req.id, error: String(err) } as ClassicalResult
  }
  const transfer = result.grid ? [result.grid.buffer] : []
  ;(self as unknown as { postMessage(m: unknown, t: Transferable[]): void }).postMessage(result, transfer)
  busy = false
  // Let newer messages arrive before picking up the next job.
  setTimeout(drain, 0)
}

self.addEventListener('message', (e: MessageEvent<ClassicalRequest>) => {
  pending = e.data
  setTimeout(drain, 0)
})
