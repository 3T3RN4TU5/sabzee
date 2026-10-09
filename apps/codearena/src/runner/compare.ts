import type { Comparator } from '../problems/types.ts'

/** Checks a returned value against the expected answer using the problem's comparator. */
export function matches(actual: unknown, expected: unknown, comparator: Comparator): boolean {
  switch (comparator.kind) {
    case 'exact':
      return deepEqual(actual, expected)
    case 'unordered':
      return unorderedEqual(actual, expected, comparator.deep ?? false)
    case 'float':
      return floatEqual(actual, expected, comparator.tolerance)
  }
}

/**
 * Arrays as dense lists: a typed array answer (`Int32Array`, say) counts as a
 * plain array, and the holes of a sparse array such as `new Array(n)` become
 * `undefined`. `Array#every` and friends skip holes, which would otherwise let
 * an empty array of the right length match any expected array.
 */
function asList(value: unknown): unknown[] | null {
  if (Array.isArray(value)) return Array.from(value)
  if (ArrayBuffer.isView(value) && !(value instanceof DataView)) return Array.from(value as unknown as ArrayLike<unknown>)
  return null
}

/** Structural equality for JSON-like data. `0` equals `-0`, `NaN` equals `NaN`. */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a === 'number' && typeof b === 'number') return Number.isNaN(a) && Number.isNaN(b)
  if (!isObject(a) || !isObject(b)) return false
  const listA = asList(a)
  const listB = asList(b)
  if (listA || listB) {
    if (!listA || !listB || listA.length !== listB.length) return false
    return listA.every((item, i) => deepEqual(item, listB[i]))
  }
  const keysA = Object.keys(a)
  const keysB = Object.keys(b)
  if (keysA.length !== keysB.length) return false
  return keysA.every((key) => Object.hasOwn(b, key) && deepEqual(a[key], b[key]))
}

function unorderedEqual(actual: unknown, expected: unknown, deep: boolean): boolean {
  const listA = asList(actual)
  const listB = asList(expected)
  if (!listA || !listB || listA.length !== listB.length) return false
  const a = listA.map((item) => canonical(item, deep)).sort()
  const b = listB.map((item) => canonical(item, deep)).sort()
  return a.every((key, i) => key === b[i])
}

function floatEqual(actual: unknown, expected: unknown, tolerance: number): boolean {
  if (typeof expected === 'number') {
    if (typeof actual !== 'number') return false
    if (actual === expected) return true
    return Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected))
  }
  const expectedList = asList(expected)
  if (expectedList) {
    const actualList = asList(actual)
    return (
      actualList !== null &&
      actualList.length === expectedList.length &&
      expectedList.every((item, i) => floatEqual(actualList[i], item, tolerance))
    )
  }
  return deepEqual(actual, expected)
}

/**
 * A string key that is identical for structurally equal values. With `deep`,
 * nested arrays are sorted so their order does not matter either.
 */
function canonical(value: unknown, deep: boolean): string {
  const list = asList(value)
  if (list) {
    const items = list.map((item) => canonical(item, deep))
    if (deep) items.sort()
    return `[${items.join(',')}]`
  }
  if (typeof value === 'number') return Object.is(value, -0) ? '0' : String(value)
  if (isObject(value)) {
    const keys = Object.keys(value).sort()
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonical(value[key], deep)}`).join(',')}}`
  }
  return typeof value === 'string' ? JSON.stringify(value) : String(value)
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
