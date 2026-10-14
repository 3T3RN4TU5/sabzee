/**
 * Type inference helpers. DuckDB reports types as strings (`BIGINT`, `DECIMAL(18,3)`,
 * `TIMESTAMP WITH TIME ZONE`, `VARCHAR[]`, `STRUCT(a INTEGER)`), and result sets arrive as
 * Apache Arrow types (`Int64`, `Float64`, `Utf8`, `Timestamp<MICROSECOND>`). Both are mapped
 * to one small set of categories that drive badges, formatting and which analyses apply.
 */

export type TypeCategory =
  | 'integer'
  | 'float'
  | 'decimal'
  | 'boolean'
  | 'string'
  | 'date'
  | 'timestamp'
  | 'time'
  | 'interval'
  | 'list'
  | 'struct'
  | 'blob'
  | 'other'

export function categoryFromDuckType(type: string): TypeCategory {
  const t = type.trim().toUpperCase()
  if (t.endsWith(']')) return 'list'
  if (t.startsWith('STRUCT') || t.startsWith('MAP') || t.startsWith('UNION')) return 'struct'
  if (t.startsWith('DECIMAL') || t.startsWith('NUMERIC')) return 'decimal'
  if (/^(U?(TINY|SMALL|BIG|HUGE)?INT(EGER)?|INT[1248]|INT128|UHUGEINT|LONG|SHORT|SIGNED)\b/.test(t)) return 'integer'
  if (/^(DOUBLE|FLOAT[48]?|REAL)\b/.test(t)) return 'float'
  if (t === 'BOOLEAN' || t === 'BOOL' || t === 'LOGICAL') return 'boolean'
  if (/^(VARCHAR|TEXT|STRING|CHAR|BPCHAR|UUID|ENUM|JSON)/.test(t)) return 'string'
  if (t.startsWith('TIMESTAMP') || t === 'DATETIME') return 'timestamp'
  if (t === 'DATE') return 'date'
  if (t.startsWith('TIME')) return 'time'
  if (t.startsWith('INTERVAL')) return 'interval'
  if (t.startsWith('BLOB') || t === 'BYTEA' || t.startsWith('BIT')) return 'blob'
  return 'other'
}

/** Map an Apache Arrow `DataType.toString()` to a category. */
export function categoryFromArrowType(type: string): TypeCategory {
  const t = type.trim()
  if (/^(List|FixedSizeList|LargeList)/.test(t)) return 'list'
  if (/^(Struct|Map|Union|DenseUnion|SparseUnion|Dictionary<.*Utf8)/.test(t)) return t.startsWith('Dictionary') ? 'string' : 'struct'
  if (/^Decimal/.test(t)) return 'decimal'
  if (/^(Int|Uint)(8|16|32|64)?$/.test(t)) return 'integer'
  if (/^Float(16|32|64)?$/.test(t)) return 'float'
  if (t === 'Bool') return 'boolean'
  if (/^(Utf8|LargeUtf8)$/.test(t)) return 'string'
  if (/^Date/.test(t)) return 'date'
  if (/^Timestamp/.test(t)) return 'timestamp'
  if (/^Time/.test(t)) return 'time'
  if (/^(Interval|Duration)/.test(t)) return 'interval'
  if (/^(Binary|LargeBinary|FixedSizeBinary)/.test(t)) return 'blob'
  if (t === 'Null') return 'other'
  return 'other'
}

export function isNumeric(c: TypeCategory): boolean {
  return c === 'integer' || c === 'float' || c === 'decimal'
}

export function isTemporal(c: TypeCategory): boolean {
  return c === 'date' || c === 'timestamp'
}

/** Can the column be used as a grouping dimension? */
export function isDimension(c: TypeCategory): boolean {
  return c === 'string' || c === 'boolean' || c === 'integer' || isTemporal(c) || c === 'decimal' || c === 'time'
}

const BADGES: Record<TypeCategory, string> = {
  integer: '123',
  float: '1.2',
  decimal: '1.0',
  boolean: 'T/F',
  string: 'ABC',
  date: 'DATE',
  timestamp: 'TIME',
  time: 'CLK',
  interval: 'DUR',
  list: '[ ]',
  struct: '{ }',
  blob: 'BIN',
  other: '?',
}

export function typeBadge(c: TypeCategory): string {
  return BADGES[c]
}

/** Tailwind classes for a type badge, grouped so related types share a hue. */
export function badgeTone(c: TypeCategory): string {
  if (isNumeric(c)) return 'text-sky-300 bg-sky-400/10 ring-sky-400/20'
  if (c === 'string') return 'text-amber-200 bg-amber-400/10 ring-amber-400/20'
  if (isTemporal(c) || c === 'time' || c === 'interval') return 'text-violet-300 bg-violet-400/10 ring-violet-400/20'
  if (c === 'boolean') return 'text-emerald-300 bg-emerald-400/10 ring-emerald-400/20'
  return 'text-slate-300 bg-slate-400/10 ring-slate-400/20'
}

/**
 * Infer a column type from raw text samples (used to describe pasted/unknown values and in
 * tests). Mirrors how a CSV sniffer decides: all-integer → integer, all-number → float,
 * all ISO dates → date / timestamp, true/false → boolean, otherwise string. Blanks are ignored.
 */
export function inferTypeFromStrings(values: readonly (string | null | undefined)[]): TypeCategory {
  const present = values.filter((v): v is string => v != null && v.trim() !== '' && !/^(null|na|n\/a|nan)$/i.test(v.trim()))
  if (present.length === 0) return 'other'
  const all = (re: RegExp) => present.every((v) => re.test(v.trim()))
  if (all(/^[-+]?\d+$/)) return 'integer'
  if (all(/^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/)) return 'float'
  if (all(/^(true|false)$/i)) return 'boolean'
  if (all(/^\d{4}-\d{2}-\d{2}$/)) return 'date'
  if (all(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/)) return 'timestamp'
  return 'string'
}
