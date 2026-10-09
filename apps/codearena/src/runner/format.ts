const MAX_ITEMS = 60
const MAX_DEPTH = 6
const MAX_LENGTH = 4000

/**
 * Renders any JavaScript value as compact, LeetCode-style text
 * (`[1,2,3]`, `"abc"`, `[[1,2],[3,4]]`). Safe for cycles, huge arrays,
 * exotic objects and throwing getters, so it can format untrusted results.
 */
export function formatValue(value: unknown): string {
  let text: string
  try {
    text = format(value, 0, [])
  } catch {
    text = '[Unprintable value]'
  }
  return text.length > MAX_LENGTH ? `${text.slice(0, MAX_LENGTH)}…` : text
}

/** Formats `console.log` arguments the way a terminal would: strings are printed raw. */
export function formatLogArgs(args: unknown[]): string {
  return args.map((arg) => (typeof arg === 'string' ? arg : formatValue(arg))).join(' ')
}

function format(value: unknown, depth: number, ancestors: object[]): string {
  switch (typeof value) {
    case 'undefined':
      return 'undefined'
    case 'number':
      return Object.is(value, -0) ? '0' : String(value)
    case 'bigint':
      return `${value}n`
    case 'string':
      return JSON.stringify(value)
    case 'boolean':
      return String(value)
    case 'symbol':
      return value.toString()
    case 'function':
      return `[Function ${value.name || 'anonymous'}]`
  }
  if (value === null) return 'null'

  const obj = value as object
  if (ancestors.includes(obj)) return '[Circular]'
  if (depth >= MAX_DEPTH) return Array.isArray(obj) ? '[…]' : '{…}'
  const next = [...ancestors, obj]

  if (Array.isArray(obj) || ArrayBuffer.isView(obj)) {
    const items = obj as ArrayLike<unknown>
    return `[${list(items.length, (i) => format(items[i], depth + 1, next))}]`
  }
  if (obj instanceof Map) {
    const entries = [...obj]
    const entry = (i: number) => `${format(entries[i][0], depth + 1, next)} => ${format(entries[i][1], depth + 1, next)}`
    return `Map(${obj.size}) {${list(entries.length, entry)}}`
  }
  if (obj instanceof Set) {
    const items = [...obj]
    return `Set(${obj.size}) {${list(items.length, (i) => format(items[i], depth + 1, next))}}`
  }
  if (obj instanceof Error) return `${obj.name}: ${obj.message}`
  if (obj instanceof Date) return Number.isNaN(obj.getTime()) ? 'Invalid Date' : obj.toISOString()

  const keys = Object.keys(obj)
  const property = (i: number) => `${JSON.stringify(keys[i])}:${format((obj as Record<string, unknown>)[keys[i]], depth + 1, next)}`
  return `{${list(keys.length, property)}}`
}

/** Joins the first MAX_ITEMS rendered items; the rest are only counted, never formatted. */
function list(length: number, render: (index: number) => string): string {
  const shown = Array.from({ length: Math.min(length, MAX_ITEMS) }, (_, i) => render(i)).join(',')
  return length > MAX_ITEMS ? `${shown},… ${length - MAX_ITEMS} more` : shown
}
