export type TxType = 'income' | 'expense'
export type PayMethod = 'UPI' | 'Card' | 'Cash' | 'Bank'

export interface Transaction {
  id: string
  type: TxType
  amount: number
  category: string
  note: string
  date: string // YYYY-MM-DD
  method: PayMethod
}

export interface CategoryMeta {
  id: string
  name: string
  emoji: string
  color: string
  type: TxType
}

export const categories: CategoryMeta[] = [
  { id: 'food', name: 'Food & Dining', emoji: '🍔', color: '#f97316', type: 'expense' },
  { id: 'groceries', name: 'Groceries', emoji: '🛒', color: '#22c55e', type: 'expense' },
  { id: 'transport', name: 'Transport', emoji: '🚕', color: '#eab308', type: 'expense' },
  { id: 'shopping', name: 'Shopping', emoji: '🛍️', color: '#ec4899', type: 'expense' },
  { id: 'bills', name: 'Bills & Utilities', emoji: '💡', color: '#06b6d4', type: 'expense' },
  { id: 'rent', name: 'Rent', emoji: '🏠', color: '#8b5cf6', type: 'expense' },
  { id: 'entertainment', name: 'Entertainment', emoji: '🎬', color: '#f43f5e', type: 'expense' },
  { id: 'health', name: 'Health', emoji: '💊', color: '#14b8a6', type: 'expense' },
  { id: 'education', name: 'Education', emoji: '📚', color: '#3b82f6', type: 'expense' },
  { id: 'travel', name: 'Travel', emoji: '✈️', color: '#a855f7', type: 'expense' },
  { id: 'other', name: 'Other', emoji: '📦', color: '#64748b', type: 'expense' },
  { id: 'salary', name: 'Salary', emoji: '💼', color: '#10b981', type: 'income' },
  { id: 'freelance', name: 'Freelance', emoji: '💻', color: '#0ea5e9', type: 'income' },
  { id: 'investments', name: 'Investments', emoji: '📈', color: '#6366f1', type: 'income' },
  { id: 'gifts', name: 'Gifts', emoji: '🎁', color: '#f59e0b', type: 'income' },
]

export const methods: PayMethod[] = ['UPI', 'Card', 'Cash', 'Bank']

export const categoryById = (id: string): CategoryMeta =>
  categories.find((c) => c.id === id) ?? { id, name: id, emoji: '❔', color: '#94a3b8', type: 'expense' }

export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4)

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
export const formatINR = (n: number) => inr.format(n)
export const compactINR = (n: number) =>
  Math.abs(n) >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : Math.abs(n) >= 1000 ? `₹${(n / 1000).toFixed(1)}k` : `₹${Math.round(n)}`

export const monthKey = (date: string) => date.slice(0, 7)

export function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function monthLabel(key: string, style: 'long' | 'short' = 'long'): string {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: style, year: style === 'long' ? 'numeric' : '2-digit' })
}

export function daysInMonth(key: string): number {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

export function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function totals(txs: Transaction[]) {
  const income = txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expense = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  return { income, expense, net: income - expense, rate: income ? Math.round(((income - expense) / income) * 100) : 0 }
}

export function formatDay(iso: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', opts)
}
