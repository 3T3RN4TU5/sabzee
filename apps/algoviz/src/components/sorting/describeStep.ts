import type { SortFrame } from '../../algorithms/sorting/timeline.ts'

/** A one-line, human-readable explanation of the step that produced `frame`. */
export function describeStep(frame: SortFrame): string {
  const { step, values } = frame
  if (!step) return 'Ready — press play or step forward to begin.'
  switch (step.type) {
    case 'compare':
      return `Compare A[${step.i}] with A[${step.j}]`
    case 'swap':
      return `Swap A[${step.i}] = ${values[step.j]} ↔ A[${step.j}] = ${values[step.i]}`
    case 'overwrite':
      return `Write ${step.value} into A[${step.i}]`
    case 'pivot':
      return step.i === -1 ? 'Release the pivot / key marker' : `Pivot / key is A[${step.i}] = ${values[step.i]}`
    case 'sorted':
      // Algorithms finalise the last slots in different ways, so check the whole array.
      if (frame.sorted.every((done) => done === 1)) return 'Done — the whole array is sorted ✓'
      return step.from === step.to
        ? `A[${step.from}] = ${values[step.from]} is in its final position`
        : `A[${step.from}…${step.to}] are in their final positions`
  }
}
