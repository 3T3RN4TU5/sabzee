import { toPlain } from './format.ts'

/**
 * RFC 4180 CSV writing. A field is quoted when it contains the delimiter, a quote, CR/LF, or
 * leading/trailing whitespace (which spreadsheet apps would otherwise trim); quotes are
 * doubled. NULL is written as an empty field.
 */
export function csvEscape(value: unknown, delimiter = ','): string {
  if (value == null) return ''
  let s: string
  if (typeof value === 'string') s = value
  else if (typeof value === 'number' || typeof value === 'bigint' || typeof value === 'boolean') s = String(value)
  else if (value instanceof Date) s = value.toISOString()
  else s = JSON.stringify(toPlain(value)) ?? ''
  const needsQuotes =
    s.includes(delimiter) || s.includes('"') || s.includes('\n') || s.includes('\r') || /^\s|\s$/.test(s)
  return needsQuotes ? `"${s.replaceAll('"', '""')}"` : s
}

export function csvRow(values: readonly unknown[], delimiter = ','): string {
  return values.map((v) => csvEscape(v, delimiter)).join(delimiter)
}

/**
 * Yield a CSV document in chunks (header first), so exporting a million rows never builds one
 * giant string. `getRow(i)` returns already-formatted cell values for row i.
 */
export function* csvChunks(
  header: readonly string[],
  rowCount: number,
  getRow: (i: number) => readonly unknown[],
  { delimiter = ',', chunkRows = 10_000 }: { delimiter?: string; chunkRows?: number } = {},
): Generator<string> {
  yield csvRow(header, delimiter) + '\r\n'
  for (let start = 0; start < rowCount; start += chunkRows) {
    const end = Math.min(rowCount, start + chunkRows)
    let chunk = ''
    for (let i = start; i < end; i++) chunk += csvRow(getRow(i), delimiter) + '\r\n'
    yield chunk
  }
}

/** Parse CSV text (RFC 4180 subset) — used by tests to round-trip the writer. */
export function parseCsv(text: string, delimiter = ','): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let i = 0
  let quoted = false
  while (i < text.length) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        quoted = false
        i++
        continue
      }
      field += ch
      i++
      continue
    }
    if (ch === '"') {
      quoted = true
      i++
    } else if (ch === delimiter) {
      row.push(field)
      field = ''
      i++
    } else if (ch === '\r' || ch === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      i += ch === '\r' && text[i + 1] === '\n' ? 2 : 1
    } else {
      field += ch
      i++
    }
  }
  if (field !== '' || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

/** JSON export of rows as an array of objects; BigInt-safe. */
export function* jsonChunks(
  header: readonly string[],
  rowCount: number,
  getRow: (i: number) => readonly unknown[],
  chunkRows = 5_000,
): Generator<string> {
  yield '['
  for (let start = 0; start < rowCount; start += chunkRows) {
    const end = Math.min(rowCount, start + chunkRows)
    const parts: string[] = []
    for (let i = start; i < end; i++) {
      const values = getRow(i)
      const obj: Record<string, unknown> = {}
      header.forEach((h, j) => (obj[h] = toPlain(values[j])))
      parts.push(JSON.stringify(obj))
    }
    yield (start === 0 ? '\n' : ',\n') + parts.join(',\n')
  }
  yield '\n]\n'
}
