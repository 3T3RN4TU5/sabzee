/**
 * Validates the problem bank: metadata invariants, and that every reference
 * solution passes all of its own tests through the same judge code the
 * Web Worker uses. Run with `npm run verify`.
 */
import { PROBLEMS, starterCode } from '../src/problems/index.ts'
import { DIFFICULTIES, TAGS, type Comparator } from '../src/problems/types.ts'
import { matches } from '../src/runner/compare.ts'
import { loadSolution, runTest } from '../src/runner/execute.ts'

const errors: string[] = []
const fail = (slug: string, message: string) => errors.push(`${slug}: ${message}`)

const slugs = new Set<string>()
const ids = new Set<number>()
const usedTags = new Set<string>()

for (const problem of PROBLEMS) {
  const { slug } = problem
  if (slugs.has(slug)) fail(slug, 'duplicate slug')
  if (ids.has(problem.id)) fail(slug, `duplicate id ${problem.id}`)
  slugs.add(slug)
  ids.add(problem.id)

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) fail(slug, 'slug must be kebab-case')
  if (!/^[A-Za-z_$][\w$]*$/.test(problem.functionName)) fail(slug, 'functionName is not an identifier')
  if (!DIFFICULTIES.includes(problem.difficulty)) fail(slug, `unknown difficulty ${problem.difficulty}`)
  if (problem.tags.length === 0) fail(slug, 'needs at least one tag')
  for (const tag of problem.tags) {
    if (!(TAGS as readonly string[]).includes(tag)) fail(slug, `unknown tag ${tag}`)
    usedTags.add(tag)
  }
  if (problem.hints.length < 2 || problem.hints.length > 3) fail(slug, 'needs 2–3 hints')
  if (problem.constraints.length === 0) fail(slug, 'needs constraints')

  const visible = problem.tests.filter((test) => !test.hidden)
  const hidden = problem.tests.filter((test) => test.hidden)
  if (problem.tests.length < 6) fail(slug, `needs ≥ 6 tests (has ${problem.tests.length})`)
  if (visible.length < 2) fail(slug, 'needs ≥ 2 visible sample tests')
  if (hidden.length < 3) fail(slug, 'needs ≥ 3 hidden tests')
  const firstHidden = problem.tests.findIndex((test) => test.hidden)
  if (problem.tests.slice(firstHidden).some((test) => !test.hidden)) fail(slug, 'visible tests must come first')

  for (const [i, test] of problem.tests.entries()) {
    if (test.input.length !== problem.params.length) fail(slug, `test ${i + 1} has ${test.input.length} args, expected ${problem.params.length}`)
  }

  // The untouched starter must load but not be accepted.
  const starter = loadSolution(starterCode(problem), problem.functionName)
  if (!starter.ok) fail(slug, `starter code does not load: ${starter.error}`)

  const reference = loadSolution(problem.solution.code, problem.functionName)
  if (!reference.ok) {
    fail(slug, `reference solution does not load: ${reference.error}`)
    continue
  }

  let passed = 0
  let slowest = 0
  for (const [i, test] of problem.tests.entries()) {
    const outcome = await runTest(reference.fn, test, problem.comparator, problem.mutatesArg)
    slowest = Math.max(slowest, outcome.timeMs)
    if (outcome.status === 'passed') passed++
    else fail(slug, `test ${i + 1}${test.hidden ? ' (hidden)' : ''} ${outcome.status}${outcome.error ? `: ${outcome.error}` : ''}`)
  }

  if (starter.ok) {
    let starterPassed = 0
    for (const test of problem.tests) {
      if ((await runTest(starter.fn, test, problem.comparator, problem.mutatesArg)).status === 'passed') starterPassed++
    }
    if (starterPassed === problem.tests.length) fail(slug, 'the empty starter passes every test')
  }

  const status = passed === problem.tests.length ? 'ok ' : 'ERR'
  console.log(
    `${status} ${String(problem.id).padStart(2)}. ${problem.title.padEnd(48)} ${problem.difficulty.padEnd(6)} ` +
      `${passed}/${problem.tests.length} tests (${hidden.length} hidden)  slowest ${slowest.toFixed(1)} ms`,
  )
}

for (const tag of TAGS) {
  if (!usedTags.has(tag)) errors.push(`tag "${tag}" is not used by any problem`)
}

// Comparator invariants: wrong answers must never be accepted, equivalent ones always.
const comparatorChecks: [string, unknown, unknown, Comparator, boolean][] = [
  ['sparse array vs values', new Array(2), [0, 1], { kind: 'exact' }, false],
  ['sparse array, unordered', new Array(2), [0, 1], { kind: 'unordered' }, false],
  ['sparse array, unordered deep', new Array(1), [[0, 0, 0]], { kind: 'unordered', deep: true }, false],
  ['typed array', Int32Array.from([24, 12]), [24, 12], { kind: 'exact' }, true],
  ['-0 equals 0', [-0], [0], { kind: 'exact' }, true],
  ['order matters for exact', [1, 0], [0, 1], { kind: 'exact' }, false],
  ['top-level order ignored', [[8, 10], [1, 6]], [[1, 6], [8, 10]], { kind: 'unordered' }, true],
  ['nested order kept without deep', [[6, 1]], [[1, 6]], { kind: 'unordered' }, false],
  ['nested order ignored with deep', [[2, -1, -1]], [[-1, -1, 2]], { kind: 'unordered', deep: true }, true],
  ['duplicates counted', [1, 1], [1, 2], { kind: 'unordered' }, false],
  ['number vs string', ['1'], [1], { kind: 'unordered' }, false],
  ['float within tolerance', 2.000001, 2, { kind: 'float', tolerance: 1e-5 }, true],
  ['float outside tolerance', 2.001, 2, { kind: 'float', tolerance: 1e-5 }, false],
  ['float NaN', NaN, 2, { kind: 'float', tolerance: 1e-5 }, false],
]
for (const [name, actual, expected, comparator, want] of comparatorChecks) {
  if (matches(actual, expected, comparator) !== want) errors.push(`comparator: ${name} should be ${want ? 'accepted' : 'rejected'}`)
}

if (errors.length > 0) {
  console.error(`\n${errors.length} problem(s) found:\n- ${errors.join('\n- ')}`)
  process.exit(1)
}
console.log(`\nAll ${PROBLEMS.length} reference solutions pass all of their tests; ${comparatorChecks.length} comparator checks hold.`)
