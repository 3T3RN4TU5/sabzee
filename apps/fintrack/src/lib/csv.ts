import { categories, methods, uid, type PayMethod, type Transaction } from './model'

const header = ['date', 'type', 'category', 'amount', 'method', 'note']

const escape = (v: string | number) => {
  const s = String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCSV(txs: Transaction[]): string {
  return [header.join(','), ...txs.map((t) => [t.date, t.type, t.category, t.amount, t.method, t.note].map(escape).join(','))].join('\n')
}

function parseLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"'
        i++
      } else if (ch === '"') quoted = false
      else cur += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') {
      out.push(cur)
      cur = ''
    } else cur += ch
  }
  out.push(cur)
  return out.map((s) => s.trim())
}

export function fromCSV(text: string): { rows: Transaction[]; skipped: number } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length === 0) return { rows: [], skipped: 0 }
  const cols = parseLine(lines[0]).map((c) => c.toLowerCase())
  const idx = (name: string) => cols.indexOf(name)
  const rows: Transaction[] = []
  let skipped = 0
  for (const line of lines.slice(1)) {
    const f = parseLine(line)
    const date = f[idx('date')]
    const type = f[idx('type')] as Transaction['type']
    const amount = Number(f[idx('amount')])
    const category = f[idx('category')]
    const method = (f[idx('method')] as PayMethod) || 'UPI'
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? '') || !['income', 'expense'].includes(type) || !(amount > 0) || !categories.some((c) => c.id === category)) {
      skipped++
      continue
    }
    rows.push({ id: uid(), date, type, amount, category, method: methods.includes(method) ? method : 'UPI', note: f[idx('note')] ?? '' })
  }
  return { rows, skipped }
}

export function download(filename: string, content: string, mime = 'text/csv') {
  const url = URL.createObjectURL(new Blob([content], { type: mime }))
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  a.click()
  URL.revokeObjectURL(url)
}
