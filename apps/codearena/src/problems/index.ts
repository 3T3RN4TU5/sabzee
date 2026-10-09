import { arraysHashing } from './arraysHashing.ts'
import { binarySearch } from './binarySearch.ts'
import { dynamicProgramming } from './dynamicProgramming.ts'
import { intervalsMatrix } from './intervalsMatrix.ts'
import { mathRecursion } from './mathRecursion.ts'
import { slidingWindow } from './slidingWindow.ts'
import { stack } from './stack.ts'
import { twoPointers } from './twoPointers.ts'
import type { Problem } from './types.ts'

/** The full problem bank, in curriculum order. */
export const PROBLEMS: readonly Problem[] = [
  ...arraysHashing,
  ...twoPointers,
  ...slidingWindow,
  ...stack,
  ...binarySearch,
  ...dynamicProgramming,
  ...intervalsMatrix,
  ...mathRecursion,
].sort((a, b) => a.id - b.id)

const BY_SLUG = new Map(PROBLEMS.map((problem) => [problem.slug, problem]))

export function findProblem(slug: string): Problem | undefined {
  return BY_SLUG.get(slug)
}

/** LeetCode-style starter code with a JSDoc signature. */
export function starterCode(problem: Problem): string {
  const doc = [
    '/**',
    ...problem.params.map((param) => ` * @param {${param.type}} ${param.name}`),
    problem.returns === 'void'
      ? ` * @return {void} Modify ${problem.params[problem.mutatesArg ?? 0].name} in place.`
      : ` * @return {${problem.returns}}`,
    ' */',
  ]
  const args = problem.params.map((param) => param.name).join(', ')
  return `${doc.join('\n')}\nfunction ${problem.functionName}(${args}) {\n  \n}\n`
}
