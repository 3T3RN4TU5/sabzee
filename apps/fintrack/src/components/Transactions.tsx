import { useMemo, useRef, useState } from 'react'
import { ArrowUpDown, Download, Pencil, Search, Trash2, Upload } from 'lucide-react'
import { useStore } from '../store'
import { categories, categoryById, formatDay, formatINR, monthKey, monthLabel, totals, type Transaction } from '../lib/model'
import { download, fromCSV, toCSV } from '../lib/csv'
import { Card, CategoryIcon } from './ui'

type Sort = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'

export function Transactions({ onEdit, notify }: { onEdit: (t: Transaction) => void; notify: (msg: string) => void }) {
  const transactions = useStore((s) => s.transactions)
  const month = useStore((s) => s.month)
  const deleteTransaction = useStore((s) => s.deleteTransaction)
  const importTransactions = useStore((s) => s.importTransactions)
  const [query, setQuery] = useState('')
  const [type, setType] = useState<'all' | 'income' | 'expense'>('all')
  const [category, setCategory] = useState('all')
  const [scope, setScope] = useState<'month' | 'all'>('month')
  const [sort, setSort] = useState<Sort>('date-desc')
  const fileRef = useRef<HTMLInputElement>(null)

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = transactions.filter(
      (t) =>
        (scope === 'all' || monthKey(t.date) === month) &&
        (type === 'all' || t.type === type) &&
        (category === 'all' || t.category === category) &&
        (!q || t.note.toLowerCase().includes(q) || categoryById(t.category).name.toLowerCase().includes(q) || String(t.amount).includes(q)),
    )
    const [key, dir] = sort.split('-') as ['date' | 'amount', 'asc' | 'desc']
    return [...list].sort((a, b) => {
      const cmp = key === 'date' ? a.date.localeCompare(b.date) : a.amount - b.amount
      return dir === 'asc' ? cmp : -cmp
    })
  }, [transactions, query, type, category, scope, month, sort])

  const sum = totals(rows)

  async function onImport(file: File) {
    const { rows: imported, skipped } = fromCSV(await file.text())
    importTransactions(imported)
    notify(`Imported ${imported.length} transaction(s)${skipped ? `, skipped ${skipped} invalid row(s)` : ''}`)
  }

  const toggleSort = (key: 'date' | 'amount') => setSort((s) => (s === `${key}-desc` ? `${key}-asc` : `${key}-desc`))

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4">
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes, categories, amounts…"
            aria-label="Search transactions"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-3 pl-9 text-sm outline-none focus:border-indigo-400 focus:bg-white"
          />
        </div>
        <select value={scope} onChange={(e) => setScope(e.target.value as 'month' | 'all')} aria-label="Period" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold">
          <option value="month">{monthLabel(month)}</option>
          <option value="all">All time</option>
        </select>
        <select value={type} onChange={(e) => setType(e.target.value as typeof type)} aria-label="Type" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold">
          <option value="all">All types</option>
          <option value="income">Income</option>
          <option value="expense">Expenses</option>
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold">
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.emoji} {c.name}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => download(`fintrack-${scope === 'all' ? 'all' : month}.csv`, toCSV(rows))}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-4 w-4" /> Export
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Upload className="h-4 w-4" /> Import
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onImport(f)
              e.target.value = ''
            }}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-1 px-4 py-3 text-sm">
        <span className="text-slate-500">
          <b className="text-slate-900">{rows.length}</b> transactions
        </span>
        <span className="text-slate-500">
          In <b className="text-emerald-600">{formatINR(sum.income)}</b>
        </span>
        <span className="text-slate-500">
          Out <b className="text-rose-600">{formatINR(sum.expense)}</b>
        </span>
        <span className="text-slate-500">
          Net <b className={sum.net >= 0 ? 'text-slate-900' : 'text-rose-600'}>{formatINR(sum.net)}</b>
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-y border-slate-100 bg-slate-50/70 text-xs font-bold tracking-wide text-slate-500 uppercase">
            <tr>
              <th className="px-4 py-3">Transaction</th>
              <th className="px-4 py-3">
                <button type="button" onClick={() => toggleSort('date')} className="inline-flex items-center gap-1 uppercase">
                  Date <ArrowUpDown className="h-3.5 w-3.5" />
                </button>
              </th>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3 text-right">
                <button type="button" onClick={() => toggleSort('amount')} className="inline-flex items-center gap-1 uppercase">
                  Amount <ArrowUpDown className="h-3.5 w-3.5" />
                </button>
              </th>
              <th className="w-24 px-4 py-3" aria-label="Actions" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((t) => (
              <tr key={t.id} className="group hover:bg-slate-50/70">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <CategoryIcon id={t.category} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-800">{t.note || categoryById(t.category).name}</p>
                      <p className="text-xs text-slate-500">{categoryById(t.category).name}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-slate-600">{formatDay(t.date, { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                <td className="px-4 py-3">
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{t.method}</span>
                </td>
                <td className={`px-4 py-3 text-right font-bold whitespace-nowrap ${t.type === 'income' ? 'text-emerald-600' : 'text-slate-900'}`}>
                  {t.type === 'income' ? '+' : '−'}
                  {formatINR(t.amount)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100">
                    <button type="button" onClick={() => onEdit(t)} aria-label="Edit" className="rounded-lg p-1.5 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        deleteTransaction(t.id)
                        notify('Transaction deleted')
                      }}
                      aria-label="Delete"
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="py-16 text-center text-sm text-slate-400">No transactions match these filters.</p>}
      </div>
    </Card>
  )
}
