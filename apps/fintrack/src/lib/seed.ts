import { currentMonth, daysInMonth, shiftMonth, todayISO, type PayMethod, type Transaction } from './model'

// Small deterministic PRNG so the demo data looks the same on every first load.
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const recurring: { day: number; category: string; amount: number; note: string; method: PayMethod; type: 'income' | 'expense' }[] = [
  { day: 1, category: 'salary', amount: 85000, note: 'Monthly salary', method: 'Bank', type: 'income' },
  { day: 3, category: 'rent', amount: 18000, note: 'Flat rent', method: 'Bank', type: 'expense' },
  { day: 5, category: 'bills', amount: 1499, note: 'Electricity bill', method: 'UPI', type: 'expense' },
  { day: 7, category: 'bills', amount: 799, note: 'Broadband + OTT', method: 'Card', type: 'expense' },
  { day: 10, category: 'investments', amount: 2400, note: 'Mutual fund dividend', method: 'Bank', type: 'income' },
  { day: 12, category: 'education', amount: 999, note: 'Online course subscription', method: 'Card', type: 'expense' },
]

const variable: { category: string; min: number; max: number; notes: string[]; perMonth: number }[] = [
  { category: 'food', min: 150, max: 900, notes: ['Swiggy order', 'Zomato dinner', 'Cafe with friends', 'Office lunch', 'Chai & snacks'], perMonth: 12 },
  { category: 'groceries', min: 300, max: 2200, notes: ['Sabzee order', 'BigBasket', 'Local kirana', 'DMart run'], perMonth: 6 },
  { category: 'transport', min: 60, max: 650, notes: ['Uber ride', 'Metro recharge', 'Petrol', 'Rapido bike'], perMonth: 9 },
  { category: 'shopping', min: 499, max: 3999, notes: ['Myntra', 'Amazon order', 'Shoes', 'Gadgets'], perMonth: 3 },
  { category: 'entertainment', min: 199, max: 1200, notes: ['Movie tickets', 'Concert', 'Gaming', 'Bowling'], perMonth: 3 },
  { category: 'health', min: 200, max: 2500, notes: ['Pharmacy', 'Gym membership', 'Doctor visit'], perMonth: 2 },
  { category: 'travel', min: 1500, max: 9000, notes: ['Weekend trip', 'Train tickets', 'Hotel stay'], perMonth: 1 },
]

const methods: PayMethod[] = ['UPI', 'UPI', 'UPI', 'Card', 'Cash']

export function seedTransactions(): Transaction[] {
  const rand = mulberry32(2410)
  const now = currentMonth()
  const today = todayISO()
  const txs: Transaction[] = []
  let n = 0

  for (let back = 5; back >= 0; back--) {
    const month = shiftMonth(now, -back)
    const days = daysInMonth(month)
    const add = (day: number, t: Omit<Transaction, 'id' | 'date'>) => {
      const date = `${month}-${String(Math.min(day, days)).padStart(2, '0')}`
      if (date <= today) txs.push({ ...t, id: `seed-${n++}`, date })
    }

    for (const r of recurring) add(r.day, { type: r.type, category: r.category, amount: r.amount, note: r.note, method: r.method })
    if (rand() > 0.45) add(15 + Math.floor(rand() * 10), { type: 'income', category: 'freelance', amount: Math.round((8000 + rand() * 22000) / 100) * 100, note: 'Freelance web project', method: 'Bank' })

    for (const v of variable) {
      const count = Math.max(0, Math.round(v.perMonth * (0.7 + rand() * 0.6)))
      for (let i = 0; i < count; i++) {
        add(1 + Math.floor(rand() * days), {
          type: 'expense',
          category: v.category,
          amount: Math.round(v.min + rand() * (v.max - v.min)),
          note: v.notes[Math.floor(rand() * v.notes.length)],
          method: methods[Math.floor(rand() * methods.length)],
        })
      }
    }
  }
  return txs.sort((a, b) => b.date.localeCompare(a.date))
}

export const defaultBudgets: Record<string, number> = {
  food: 6000,
  groceries: 7000,
  transport: 3000,
  shopping: 5000,
  bills: 3000,
  rent: 18000,
  entertainment: 2500,
  health: 3000,
}
