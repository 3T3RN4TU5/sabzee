import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, LayoutDashboard, ListOrdered, Plus, RotateCcw, Target, Wallet } from 'lucide-react'
import { useStore } from './store'
import { currentMonth, monthLabel, shiftMonth, type Transaction } from './lib/model'
import { Dashboard } from './components/Dashboard'
import { Transactions } from './components/Transactions'
import { Budgets } from './components/Budgets'
import { TransactionForm } from './components/TransactionForm'

type Tab = 'dashboard' | 'transactions' | 'budgets'

const tabs: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'transactions', label: 'Transactions', icon: ListOrdered },
  { id: 'budgets', label: 'Budgets', icon: Target },
]

const initialTab = (): Tab => {
  const hash = window.location.hash.slice(1)
  return tabs.some((t) => t.id === hash) ? (hash as Tab) : 'dashboard'
}

export default function App() {
  const month = useStore((s) => s.month)
  const setMonth = useStore((s) => s.setMonth)
  const addTransaction = useStore((s) => s.addTransaction)
  const updateTransaction = useStore((s) => s.updateTransaction)
  const resetDemo = useStore((s) => s.resetDemo)
  const [tab, setTab] = useState<Tab>(initialTab)
  const [form, setForm] = useState<{ open: boolean; editing?: Transaction }>({ open: false })
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    window.history.replaceState(null, '', `#${tab}`)
  }, [tab])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(t)
  }, [toast])

  const closeForm = useCallback(() => setForm({ open: false }), [])
  const isCurrent = month === currentMonth()
  const active = tabs.find((t) => t.id === tab)!

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900 lg:flex">
      <aside className="flex items-center gap-2 bg-slate-950 px-4 py-3 text-slate-300 lg:sticky lg:top-0 lg:h-dvh lg:w-64 lg:flex-col lg:items-stretch lg:gap-0 lg:px-4 lg:py-6">
        <div className="flex items-center gap-2.5 lg:px-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-linear-to-br from-emerald-400 to-indigo-500 text-white">
            <Wallet className="h-5 w-5" />
          </span>
          <span className="text-lg font-extrabold text-white">FinTrack</span>
        </div>
        <nav className="ml-auto flex gap-1 lg:mt-8 lg:ml-0 lg:flex-col">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              aria-current={tab === id ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                tab === id ? 'bg-white/10 text-white' : 'hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon className="h-4.5 w-4.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </nav>
        <div className="mt-auto hidden space-y-3 lg:block">
          <div className="rounded-2xl bg-linear-to-br from-indigo-500/20 to-emerald-500/10 p-4 text-xs leading-relaxed text-slate-300">
            <p className="font-bold text-white">💡 Money tip</p>
            Aim to save at least 20% of your income. Automate SIPs right after payday.
          </div>
          <button
            type="button"
            onClick={() => {
              if (confirm('Reset to the demo data? Your changes will be lost.')) {
                resetDemo()
                setToast('Demo data restored')
              }
            }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-400 hover:bg-white/5 hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset demo data
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-slate-200 bg-slate-50/90 px-4 py-4 backdrop-blur sm:px-8">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">{active.label}</h1>
            <p className="text-xs text-slate-500">Personal finance, made simple · amounts in INR</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center rounded-xl border border-slate-200 bg-white">
              <button type="button" aria-label="Previous month" onClick={() => setMonth(shiftMonth(month, -1))} className="rounded-l-xl p-2.5 hover:bg-slate-50">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-36 text-center text-sm font-bold">{monthLabel(month)}</span>
              <button
                type="button"
                aria-label="Next month"
                disabled={isCurrent}
                onClick={() => setMonth(shiftMonth(month, 1))}
                className="rounded-r-xl p-2.5 hover:bg-slate-50 disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => setForm({ open: true })}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-indigo-600/30 transition hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Add transaction</span>
            </button>
          </div>
        </header>

        <main className="p-4 sm:p-8">
          {tab === 'dashboard' && <Dashboard onSeeAll={() => setTab('transactions')} />}
          {tab === 'transactions' && <Transactions onEdit={(t) => setForm({ open: true, editing: t })} notify={setToast} />}
          {tab === 'budgets' && <Budgets />}
        </main>
      </div>

      {form.open && (
        <TransactionForm
          initial={form.editing}
          onClose={closeForm}
          onSave={(t) => {
            if (form.editing) {
              updateTransaction(form.editing.id, t)
              setToast('Transaction updated')
            } else {
              addTransaction(t)
              setToast('Transaction added')
            }
            closeForm()
          }}
        />
      )}

      {toast && (
        <div role="status" className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  )
}
