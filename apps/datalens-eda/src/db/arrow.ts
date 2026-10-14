import { Table, type RecordBatch, type Schema, type Vector } from 'apache-arrow'
import { categoryFromArrowType, type TypeCategory } from '../lib/types.ts'

export function tableFromBatches(schema: Schema | undefined, batches: RecordBatch[]): Table {
  if (batches.length) return new Table(batches)
  return schema ? new Table(schema) : new Table()
}

export interface ResultColumn {
  name: string
  arrowType: string
  category: TypeCategory
  vector: Vector | null
}

/** Column-oriented view over an Arrow table. Cells are read on demand — rows are never materialized. */
export function resultColumns(table: Table): ResultColumn[] {
  return table.schema.fields.map((f, i) => {
    const arrowType = String(f.type)
    return { name: f.name, arrowType, category: categoryFromArrowType(arrowType), vector: table.getChildAt(i) }
  })
}

/** Read a cell, normalising Arrow quirks (bigint stays bigint; Date → ms number). */
export function cellValue(col: ResultColumn, row: number): unknown {
  const v = col.vector?.get(row)
  if (v == null) return null
  if (v instanceof Date) return v.getTime()
  return v
}

/** Convert a small Arrow table into plain row objects (numbers instead of bigint where safe). */
export function toObjects<T = Record<string, unknown>>(table: Table): T[] {
  const cols = resultColumns(table)
  const out: T[] = []
  for (let r = 0; r < table.numRows; r++) {
    const o: Record<string, unknown> = {}
    for (const c of cols) {
      const v = cellValue(c, r)
      o[c.name] = typeof v === 'bigint' ? Number(v) : v
    }
    out.push(o as T)
  }
  return out
}

/** Numeric value for sorting/charting: bigint, Date and boolean coerce to number, strings stay. */
export function sortKey(v: unknown): number | string | null {
  if (v == null) return null
  if (typeof v === 'number') return v
  if (typeof v === 'bigint') return Number(v)
  if (typeof v === 'boolean') return v ? 1 : 0
  if (typeof v === 'string') return v
  return JSON.stringify(v, (_k, x) => (typeof x === 'bigint' ? x.toString() : x))
}

/**
 * Compute a sort permutation over a column (stable, NULLs last in both directions).
 * Numeric columns go through a Float64Array for speed: ~1M rows sort in a few hundred ms.
 */
export function sortPermutation(col: ResultColumn, rowCount: number, dir: 'asc' | 'desc'): Uint32Array {
  const idx = new Uint32Array(rowCount)
  for (let i = 0; i < rowCount; i++) idx[i] = i
  const sign = dir === 'asc' ? 1 : -1
  const numericLike = col.category !== 'string' && col.category !== 'list' && col.category !== 'struct' && col.category !== 'other' && col.category !== 'blob'
  if (numericLike) {
    const keys = new Float64Array(rowCount)
    for (let i = 0; i < rowCount; i++) {
      const k = sortKey(cellValue(col, i))
      keys[i] = typeof k === 'number' ? k : Number.NaN
    }
    const arr = Array.from(idx)
    arr.sort((a, b) => {
      const ka = keys[a]
      const kb = keys[b]
      const na = Number.isNaN(ka)
      const nb = Number.isNaN(kb)
      if (na || nb) return na === nb ? a - b : na ? 1 : -1
      return ka === kb ? a - b : (ka < kb ? -1 : 1) * sign
    })
    return Uint32Array.from(arr)
  }
  const keys: (string | null)[] = new Array(rowCount)
  for (let i = 0; i < rowCount; i++) {
    const k = sortKey(cellValue(col, i))
    keys[i] = k == null ? null : String(k)
  }
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })
  const arr = Array.from(idx)
  arr.sort((a, b) => {
    const ka = keys[a]
    const kb = keys[b]
    if (ka == null || kb == null) return ka === kb ? a - b : ka == null ? 1 : -1
    const c = collator.compare(ka, kb)
    return c === 0 ? a - b : c * sign
  })
  return Uint32Array.from(arr)
}
