// Minimal RFC 4180 CSV export for table data.

export interface CsvColumn<T> {
  header: string
  value: (row: T) => string | number | boolean | null | undefined
}

function escape(v: string | number | boolean | null | undefined): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv<T>(rows: readonly T[], columns: readonly CsvColumn<T>[]): string {
  const head = columns.map((c) => escape(c.header)).join(',')
  const body = rows.map((r) => columns.map((c) => escape(c.value(r))).join(','))
  return [head, ...body].join('\r\n') + '\r\n'
}

export function downloadCsv(filename: string, csv: string): void {
  // BOM so Excel opens UTF-8 (the £ sign, accented country names) correctly
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
