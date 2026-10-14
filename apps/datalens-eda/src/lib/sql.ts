/** Small, dependency-free SQL helpers. Everything here is pure and unit-tested. */

/** Quote an identifier for DuckDB: `my "col"` → `"my ""col"""`. */
export function quoteIdent(name: string): string {
  return `"${name.replaceAll('"', '""')}"`
}

/** Quote a string literal: `it's` → `'it''s'`. */
export function quoteLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`
}

/** Removes trailing whitespace, semicolons and line comments so a query can be wrapped as a subquery. */
export function stripTrailingSemicolons(sql: string): string {
  let s = sql.trim()
  // Drop a trailing `-- comment` line (common when people comment out the last clause).
  for (;;) {
    const lines = s.split('\n')
    const last = lines[lines.length - 1].trim()
    if (lines.length > 1 && last.startsWith('--')) {
      s = lines.slice(0, -1).join('\n').trim()
      continue
    }
    if (s.endsWith(';')) {
      s = s.slice(0, -1).trim()
      continue
    }
    return s
  }
}

/** Remove SQL comments (line and block) without touching string literals or quoted identifiers. */
export function stripComments(sql: string): string {
  let out = ''
  let i = 0
  while (i < sql.length) {
    const ch = sql[i]
    const next = sql[i + 1]
    if (ch === "'" || ch === '"') {
      const end = findClosingQuote(sql, i, ch)
      out += sql.slice(i, end)
      i = end
    } else if (ch === '-' && next === '-') {
      while (i < sql.length && sql[i] !== '\n') i++
    } else if (ch === '/' && next === '*') {
      const end = sql.indexOf('*/', i + 2)
      i = end === -1 ? sql.length : end + 2
      out += ' '
    } else {
      out += ch
      i++
    }
  }
  return out
}

function findClosingQuote(sql: string, start: number, quote: string): number {
  let i = start + 1
  while (i < sql.length) {
    if (sql[i] === quote) {
      if (sql[i + 1] === quote) {
        i += 2
        continue
      }
      return i + 1
    }
    i++
  }
  return sql.length
}

/** Split a script into statements on top-level semicolons (ignores `;` in strings and comments). */
export function splitStatements(sql: string): string[] {
  const clean = stripComments(sql)
  const parts: string[] = []
  let cur = ''
  let i = 0
  while (i < clean.length) {
    const ch = clean[i]
    if (ch === "'" || ch === '"') {
      const end = findClosingQuote(clean, i, ch)
      cur += clean.slice(i, end)
      i = end
    } else if (ch === ';') {
      if (cur.trim()) parts.push(cur.trim())
      cur = ''
      i++
    } else {
      cur += ch
      i++
    }
  }
  if (cur.trim()) parts.push(cur.trim())
  return parts
}

/**
 * True when the (last) statement produces rows and can be wrapped as
 * `SELECT … FROM (<sql>)` — used for EXPLAIN, export-to-Parquet and charting a result.
 */
export function isQueryStatement(sql: string): boolean {
  const statements = splitStatements(sql)
  if (statements.length !== 1) return false
  const head = statements[0].replace(/^\(+/, '').trimStart().slice(0, 12).toUpperCase()
  return /^(SELECT|WITH|FROM|VALUES|TABLE|PIVOT|UNPIVOT|SUMMARIZE|DESCRIBE)\b/.test(head)
}

export type FileFormat = 'csv' | 'tsv' | 'json' | 'parquet'

export function detectFormat(fileName: string): FileFormat | null {
  const lower = fileName.toLowerCase().replace(/\.(gz|zst)$/, '')
  if (lower.endsWith('.parquet') || lower.endsWith('.pq')) return 'parquet'
  if (lower.endsWith('.csv') || lower.endsWith('.txt')) return 'csv'
  if (lower.endsWith('.tsv') || lower.endsWith('.tab')) return 'tsv'
  if (lower.endsWith('.json') || lower.endsWith('.jsonl') || lower.endsWith('.ndjson')) return 'json'
  return null
}

/**
 * Turn a file name into a friendly, unique, unquoted-safe table name:
 * `Sales 2024 (Q1).csv` → `sales_2024_q1`; a clash with `taken` gets `_2`, `_3`…
 */
export function tableNameFromFile(fileName: string, taken: Iterable<string> = []): string {
  const base = fileName.replace(/\.(gz|zst)$/i, '').replace(/\.[^.]+$/, '')
  let name = base
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
  if (!name) name = 'data'
  if (/^[0-9]/.test(name)) name = `t_${name}`
  if (RESERVED.has(name)) name = `${name}_data`
  const used = new Set([...taken].map((t) => t.toLowerCase()))
  if (!used.has(name)) return name
  let n = 2
  while (used.has(`${name}_${n}`)) n++
  return `${name}_${n}`
}

const RESERVED = new Set([
  'select', 'from', 'where', 'table', 'order', 'group', 'by', 'limit', 'join', 'union', 'with', 'as', 'and', 'or',
  'not', 'null', 'true', 'false', 'case', 'when', 'then', 'else', 'end', 'in', 'is', 'on', 'create', 'drop', 'insert',
  'update', 'delete', 'having', 'distinct', 'all', 'any', 'pivot', 'unpivot', 'values', 'using', 'default', 'user',
])

/** The DuckDB reader call for a registered file. */
export function readerSql(format: FileFormat, fileName: string): string {
  const f = quoteLiteral(fileName)
  switch (format) {
    case 'parquet':
      return `read_parquet(${f})`
    case 'tsv':
      return `read_csv(${f}, delim = '\\t', header = true, sample_size = -1)`
    case 'json':
      return `read_json_auto(${f})`
    case 'csv':
      return `read_csv(${f}, sample_size = -1)`
  }
}

/** `CREATE OR REPLACE TABLE` statement that materializes a file into DuckDB's memory. */
export function createTableSql(table: string, format: FileFormat, fileName: string): string {
  return `CREATE OR REPLACE TABLE ${quoteIdent(table)} AS SELECT * FROM ${readerSql(format, fileName)}`
}

/** Wrap a query with a LIMIT preview unless it already ends with one. */
export function withPreviewLimit(sql: string, limit: number): string {
  const s = stripTrailingSemicolons(sql)
  if (/\blimit\s+\d+(\s+offset\s+\d+)?\s*$/i.test(s)) return s
  return `SELECT * FROM (\n${s}\n) LIMIT ${limit}`
}
