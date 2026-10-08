import { useMemo } from 'react'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useStore } from '../store'
import { categories, compactINR, currentMonth, daysInMonth, formatINR, monthKey, monthLabel, todayISO } from '../lib/model'
import { Card, CategoryIcon } from './ui'

export function Budgets() {
  const transactions = useStore((s) => s.transactions)
  const budgets = useStore((s) => s.budgets)
  const month = useStore((s) => s.month)
  const setBudget = useStore((s) => s.setBudget)

  const spent = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of transactions) if (t.type === 'expense' && monthKey(t.date) === month) map.set(t.category, (map.get(t.category) ?? 0) + t.amount)
    return map
  }, [transactions, month])

  const expenseCats = categories.filter((c) => c.type === 'expense')
  const totalBudget = Object.values(budgets).reduce((s, v) => s + v, 0)
  const totalSpent = Object.keys(budgets).reduce((s, id) => s + (spent.get(id) ?? 0), 0)
  const over = Object.entries(budgets).filter(([id, limit]) => (spent.get(id) ?? 0) > limit)

  const elapsed = month === currentMonth() ? Number(todayISO().slice(8)) / daysInMonth(month) : 1

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm text-slate-500">Total monthly budget</p>
          <p className="mt-2 text-2xl font-extrabold">{formatINR(totalBudget)}</p>
          <p className="text-xs text-slate-400">across {Object.keys(budgets).length} categories</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-slate-500">Spent in budgeted categories</p>
          <p className="mt-2 text-2xl font-extrabold">{formatINR(totalSpent)}</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.min(100, totalBudget ? (totalSpent / totalBudget) * 100 : 0)}%` }} />
          </div>
        </Card>
        <Card className={`p-5 ${over.length ? 'border-rose-200 bg-rose-50/50' : 'border-emerald-200 bg-emerald-50/50'}`}>
          <p className="flex items-center gap-2 text-sm font-semibold">
            {over.length ? <AlertTriangle className="h-4 w-4 text-rose-600" /> : <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
            {over.length ? `${over.length} budget(s) exceeded` : 'All budgets on track'}
          </p>
          <p className="mt-2 text-xs text-slate-600">
            {over.length
              ? over.map(([id]) => categories.find((c) => c.id === id)?.name).join(', ')
              : `Nice! You're within every limit for ${monthLabel(month)}.`}
          </p>
        </Card>
      </div>

      <Card>
        <div className="border-b border-slate-100 p-5">
          <h2 className="font-bold">Category budgets · {monthLabel(month)}</h2>
          <p className="text-xs text-slate-500">
            Set a monthly limit for each category. The marker shows where you should be at this point in the month ({Math.round(elapsed * 100)}%).
          </p>
        </div>
        <ul className="divide-y divide-slate-100">
          {expenseCats.map((c) => {
            const limit = budgets[c.id] ?? 0
            const used = spent.get(c.id) ?? 0
            const pct = limit ? (used / limit) * 100 : 0
            const tone = !limit ? 'bg-slate-300' : pct > 100 ? 'bg-rose-500' : pct > elapsed * 100 + 10 ? 'bg-amber-500' : 'bg-emerald-500'
            return (
              <li key={c.id} className="grid items-center gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_150px]">
                <div className="flex items-center gap-3">
                  <CategoryIcon id={c.id} />
                  <div>
                    <p className="font-semibold">{c.name}</p>
                    <p className="text-xs text-slate-500">{formatINR(used)} spent</p>
                  </div>
                </div>
                <div>
                  <div className="relative h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full transition-all ${tone}`} style={{ width: `${Math.min(100, pct)}%` }} />
                    {limit > 0 && <div className="absolute top-0 h-full w-0.5 bg-slate-900/40" style={{ left: `${elapsed * 100}%` }} />}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {limit
                      ? pct > 100
                        ? `Over by ${formatINR(used - limit)}`
                        : `${formatINR(limit - used)} left · ${Math.round(pct)}% used`
                      : 'No budget set'}
                  </p>
                </div>
                <label className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">Limit ₹</span>
                  <input
                    type="number"
                    min={0}
                    step={500}
                    value={limit || ''}
                    placeholder="—"
                    aria-label={`${c.name} budget`}
                    onChange={(e) => setBudget(c.id, Math.max(0, Number(e.target.value)))}
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-semibold outline-none focus:border-indigo-400"
                  />
                </label>
              </li>
            )
          })}
        </ul>
        <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">Tip: clear a limit to remove that budget. Typical rent budget: {compactINR(18000)}.</p>
      </Card>
    </div>
  )
}
