import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { currentMonth, uid, type Transaction } from './lib/model'
import { defaultBudgets, seedTransactions } from './lib/seed'

interface State {
  transactions: Transaction[]
  budgets: Record<string, number>
  month: string
  setMonth: (m: string) => void
  addTransaction: (t: Omit<Transaction, 'id'>) => void
  updateTransaction: (id: string, t: Omit<Transaction, 'id'>) => void
  deleteTransaction: (id: string) => void
  importTransactions: (rows: Transaction[]) => void
  setBudget: (category: string, amount: number) => void
  resetDemo: () => void
  clearAll: () => void
}

const sortByDate = (txs: Transaction[]) => [...txs].sort((a, b) => b.date.localeCompare(a.date))

export const useStore = create<State>()(
  persist(
    (set) => ({
      transactions: seedTransactions(),
      budgets: defaultBudgets,
      month: currentMonth(),
      setMonth: (month) => set({ month }),
      addTransaction: (t) => set((s) => ({ transactions: sortByDate([{ ...t, id: uid() }, ...s.transactions]) })),
      updateTransaction: (id, t) => set((s) => ({ transactions: sortByDate(s.transactions.map((x) => (x.id === id ? { ...t, id } : x))) })),
      deleteTransaction: (id) => set((s) => ({ transactions: s.transactions.filter((x) => x.id !== id) })),
      importTransactions: (rows) => set((s) => ({ transactions: sortByDate([...rows, ...s.transactions]) })),
      setBudget: (category, amount) =>
        set((s) => {
          const budgets = { ...s.budgets }
          if (amount > 0) budgets[category] = amount
          else delete budgets[category]
          return { budgets }
        }),
      resetDemo: () => set({ transactions: seedTransactions(), budgets: defaultBudgets, month: currentMonth() }),
      clearAll: () => set({ transactions: [], budgets: {} }),
    }),
    {
      name: 'fintrack-v1',
      partialize: (s) => ({ transactions: s.transactions, budgets: s.budgets }),
    },
  ),
)
