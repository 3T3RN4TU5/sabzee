import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { categories, methods, todayISO, type PayMethod, type Transaction, type TxType } from '../lib/model'

type Draft = Omit<Transaction, 'id'>

export function TransactionForm({
  initial,
  onSave,
  onClose,
}: {
  initial?: Transaction
  onSave: (t: Draft) => void
  onClose: () => void
}) {
  const [type, setType] = useState<TxType>(initial?.type ?? 'expense')
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '')
  const [category, setCategory] = useState(initial?.category ?? 'food')
  const [date, setDate] = useState(initial?.date ?? todayISO())
  const [method, setMethod] = useState<PayMethod>(initial?.method ?? 'UPI')
  const [note, setNote] = useState(initial?.note ?? '')
  const [error, setError] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const options = categories.filter((c) => c.type === type)

  function switchType(t: TxType) {
    setType(t)
    setCategory(categories.find((c) => c.type === t)!.id)
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0) return setError('Enter an amount greater than zero.')
    if (value > 10_000_000) return setError('That amount looks too large.')
    if (!date) return setError('Pick a date.')
    onSave({ type, amount: Math.round(value * 100) / 100, category, date, method, note: note.trim() })
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-labelledby="tx-title">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={onClose} />
      <form onSubmit={submit} className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 id="tx-title" className="text-lg font-extrabold">
            {initial ? 'Edit transaction' : 'New transaction'}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
          {(['expense', 'income'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => switchType(t)}
              className={`rounded-lg py-2 text-sm font-bold capitalize transition ${
                type === t ? (t === 'expense' ? 'bg-white text-rose-600 shadow' : 'bg-white text-emerald-600 shadow') : 'text-slate-500'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <label className="mt-5 block">
          <span className="text-xs font-bold tracking-wide text-slate-500 uppercase">Amount (₹)</span>
          <input
            autoFocus
            inputMode="decimal"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value.replace(/[^\d.]/g, ''))
              setError('')
            }}
            placeholder="0"
            className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 text-2xl font-extrabold outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
          />
        </label>

        <fieldset className="mt-4">
          <legend className="text-xs font-bold tracking-wide text-slate-500 uppercase">Category</legend>
          <div className="mt-1.5 grid grid-cols-3 gap-2">
            {options.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                aria-pressed={category === c.id}
                className={`flex flex-col items-center gap-1 rounded-xl border px-1 py-2 text-[11px] font-semibold transition ${
                  category === c.id ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <span className="text-lg">{c.emoji}</span>
                <span className="truncate">{c.name}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-bold tracking-wide text-slate-500 uppercase">Date</span>
            <input
              type="date"
              value={date}
              max={todayISO()}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold tracking-wide text-slate-500 uppercase">Paid via</span>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as PayMethod)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            >
              {methods.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
        </div>

        <label className="mt-4 block">
          <span className="text-xs font-bold tracking-wide text-slate-500 uppercase">Note</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={80}
            placeholder="e.g. Dinner with team"
            className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
          />
        </label>

        {error && <p className="mt-3 text-sm font-semibold text-rose-600">{error}</p>}

        <button type="submit" className="mt-6 w-full rounded-xl bg-indigo-600 py-3 font-bold text-white transition hover:bg-indigo-700">
          {initial ? 'Save changes' : 'Add transaction'}
        </button>
      </form>
    </div>
  )
}
