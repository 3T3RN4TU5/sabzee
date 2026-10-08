import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ArrowDownRight, ArrowUpRight, PiggyBank, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { useStore } from '../store'
import { categoryById, compactINR, currentMonth, daysInMonth, formatDay, formatINR, monthKey, monthLabel, shiftMonth, todayISO, totals } from '../lib/model'
import { Card, CategoryIcon } from './ui'

const tooltipStyle = { borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 10px 30px -10px rgb(15 23 42 / 0.2)', fontSize: 12 }

export function Dashboard({ onSeeAll }: { onSeeAll: () => void }) {
  const transactions = useStore((s) => s.transactions)
  const budgets = useStore((s) => s.budgets)
  const month = useStore((s) => s.month)

  const data = useMemo(() => {
    const inMonth = transactions.filter((t) => monthKey(t.date) === month)
    const prev = transactions.filter((t) => monthKey(t.date) === shiftMonth(month, -1))
    const cur = totals(inMonth)
    const last = totals(prev)

    const trend = Array.from({ length: 6 }, (_, i) => {
      const key = shiftMonth(month, i - 5)
      const t = totals(transactions.filter((x) => monthKey(x.date) === key))
      return { month: monthLabel(key, 'short'), Income: t.income, Expenses: t.expense }
    })

    const byCat = new Map<string, number>()
    for (const t of inMonth) if (t.type === 'expense') byCat.set(t.category, (byCat.get(t.category) ?? 0) + t.amount)
    const breakdown = [...byCat.entries()]
      .map(([id, value]) => ({ id, name: categoryById(id).name, value, color: categoryById(id).color }))
      .sort((a, b) => b.value - a.value)

    const days = month === currentMonth() ? Number(todayISO().slice(8)) : daysInMonth(month)
    const daily = Array.from({ length: days }, (_, i) => {
      const day = `${month}-${String(i + 1).padStart(2, '0')}`
      return { day: i + 1, Spent: inMonth.filter((t) => t.type === 'expense' && t.date === day).reduce((s, t) => s + t.amount, 0), Cumulative: 0 }
    }).reduce<{ day: number; Spent: number; Cumulative: number }[]>(
      (acc, d) => [...acc, { ...d, Cumulative: (acc.at(-1)?.Cumulative ?? 0) + d.Spent }],
      [],
    )

    const budgetRows = Object.entries(budgets)
      .map(([id, limit]) => ({ id, limit, spent: byCat.get(id) ?? 0 }))
      .sort((a, b) => b.spent / b.limit - a.spent / a.limit)
      .slice(0, 5)

    return { inMonth, cur, last, trend, breakdown, daily, budgetRows }
  }, [transactions, budgets, month])

  const change = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 100) : null)

  const kpis = [
    { label: 'Income', value: data.cur.income, delta: change(data.cur.income, data.last.income), good: 'up', icon: TrendingUp, tone: 'bg-emerald-50 text-emerald-600' },
    { label: 'Expenses', value: data.cur.expense, delta: change(data.cur.expense, data.last.expense), good: 'down', icon: TrendingDown, tone: 'bg-rose-50 text-rose-600' },
    { label: 'Net savings', value: data.cur.net, delta: change(data.cur.net, data.last.net), good: 'up', icon: Wallet, tone: 'bg-indigo-50 text-indigo-600' },
    { label: 'Savings rate', value: null, text: `${data.cur.rate}%`, delta: data.last.income ? data.cur.rate - data.last.rate : null, good: 'up', icon: PiggyBank, tone: 'bg-amber-50 text-amber-600', unit: 'pts' },
  ] as const

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => {
          const Icon = k.icon
          const positive = k.delta !== null && k.delta >= 0
          const isGood = k.delta === null ? null : (k.good === 'up') === positive
          return (
            <Card key={k.label} className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">{k.label}</p>
                <span className={`grid h-9 w-9 place-items-center rounded-xl ${k.tone}`}>
                  <Icon className="h-4.5 w-4.5" />
                </span>
              </div>
              <p className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900">{'text' in k ? k.text : formatINR(k.value ?? 0)}</p>
              {k.delta !== null ? (
                <p className={`mt-1 inline-flex items-center gap-0.5 text-xs font-semibold ${isGood ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {positive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                  {Math.abs(k.delta)}
                  {'unit' in k ? ' pts' : '%'} vs last month
                </p>
              ) : (
                <p className="mt-1 text-xs text-slate-400">No data for last month</p>
              )}
            </Card>
          )
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <Card className="p-5 xl:col-span-3">
          <h2 className="font-bold text-slate-900">Income vs expenses</h2>
          <p className="text-xs text-slate-500">Last 6 months</p>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.trend} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickFormatter={compactINR} tickLine={false} axisLine={false} fontSize={12} width={56} />
                <Tooltip formatter={(v) => formatINR(Number(v))} contentStyle={tooltipStyle} cursor={{ fill: '#f1f5f9' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Income" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={28} />
                <Bar dataKey="Expenses" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 xl:col-span-2">
          <h2 className="font-bold text-slate-900">Spending by category</h2>
          <p className="text-xs text-slate-500">{monthLabel(month)}</p>
          {data.breakdown.length === 0 ? (
            <p className="grid h-72 place-items-center text-sm text-slate-400">No expenses this month</p>
          ) : (
            <div className="mt-2 grid items-center gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <div className="relative h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.breakdown} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="92%" paddingAngle={2} stroke="none">
                      {data.breakdown.map((d) => (
                        <Cell key={d.id} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatINR(Number(v))} contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                  <div>
                    <p className="text-xs text-slate-500">Spent</p>
                    <p className="text-lg font-extrabold">{compactINR(data.cur.expense)}</p>
                  </div>
                </div>
              </div>
              <ul className="space-y-2">
                {data.breakdown.slice(0, 6).map((d) => (
                  <li key={d.id} className="flex items-center gap-2 text-sm">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="flex-1 truncate text-slate-600">{d.name}</span>
                    <span className="font-semibold">{Math.round((d.value / data.cur.expense) * 100)}%</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <Card className="p-5 xl:col-span-3">
          <h2 className="font-bold text-slate-900">Daily spending</h2>
          <p className="text-xs text-slate-500">Cumulative spend through {monthLabel(month)}</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.daily}>
                <defs>
                  <linearGradient id="spend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} interval="preserveStartEnd" />
                <YAxis tickFormatter={compactINR} tickLine={false} axisLine={false} fontSize={12} width={56} />
                <Tooltip formatter={(v) => formatINR(Number(v))} labelFormatter={(d) => `Day ${d}`} contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="Cumulative" stroke="#6366f1" strokeWidth={2.5} fill="url(#spend)" />
                <Area type="monotone" dataKey="Spent" stroke="#f59e0b" strokeWidth={1.5} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 xl:col-span-2">
          <h2 className="font-bold text-slate-900">Budget health</h2>
          <p className="text-xs text-slate-500">Most stretched categories</p>
          <ul className="mt-4 space-y-4">
            {data.budgetRows.map((b) => {
              const pct = Math.round((b.spent / b.limit) * 100)
              const cat = categoryById(b.id)
              return (
                <li key={b.id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-700">
                      {cat.emoji} {cat.name}
                    </span>
                    <span className={`font-semibold ${pct > 100 ? 'text-rose-600' : pct > 80 ? 'text-amber-600' : 'text-slate-500'}`}>
                      {formatINR(b.spent)} / {compactINR(b.limit)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${pct > 100 ? 'bg-rose-500' : pct > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </li>
              )
            })}
            {data.budgetRows.length === 0 && <p className="text-sm text-slate-400">No budgets set yet.</p>}
          </ul>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-slate-900">Recent transactions</h2>
          <button type="button" onClick={onSeeAll} className="text-sm font-semibold text-indigo-600 hover:underline">
            See all →
          </button>
        </div>
        <ul className="mt-3 divide-y divide-slate-100">
          {data.inMonth.slice(0, 6).map((t) => (
            <li key={t.id} className="flex items-center gap-3 py-3">
              <CategoryIcon id={t.category} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">{t.note || categoryById(t.category).name}</p>
                <p className="text-xs text-slate-500">
                  {categoryById(t.category).name} · {formatDay(t.date)} · {t.method}
                </p>
              </div>
              <span className={`text-sm font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-slate-900'}`}>
                {t.type === 'income' ? '+' : '−'}
                {formatINR(t.amount)}
              </span>
            </li>
          ))}
          {data.inMonth.length === 0 && <li className="py-6 text-center text-sm text-slate-400">No transactions in {monthLabel(month)}.</li>}
        </ul>
      </Card>
    </div>
  )
}
