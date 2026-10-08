# 💸 FinTrack — Personal finance dashboard

Track income and expenses, set monthly budgets per category and understand where your money goes with interactive charts. All amounts are in Indian Rupees (₹).

**Tech:** React 19 · TypeScript · Vite · Recharts · Tailwind CSS v4 · Zustand (persisted) · Lucide icons

## Features

- **Dashboard** with month-over-month KPIs (income, expenses, net savings, savings rate)
- **Charts** — 6-month income vs expense bars, category donut, cumulative daily spending area chart
- **Transactions** — add / edit / delete with validation, search, type & category filters, sortable columns, monthly or all-time view
- **CSV export & import** (RFC-4180 quoting, invalid rows are skipped and reported)
- **Budgets** — per-category monthly limits with progress bars, "pace" marker for the current day and over-budget alerts
- **Month navigator** to browse history; six months of realistic demo data generated with a seeded PRNG
- Data persisted in `localStorage`, deep-linkable tabs (`#dashboard`, `#transactions`, `#budgets`), responsive layout
- Vendor code split into cacheable `react` and `charts` chunks via Rolldown `codeSplitting`

## Getting started

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # type-check + production build
npm run lint      # oxlint
```

## Structure

```
src/
├── store.ts                  # Zustand store (transactions, budgets, selected month)
├── lib/
│   ├── model.ts              # Types, categories, money/date helpers
│   ├── seed.ts               # Deterministic demo data
│   └── csv.ts                # CSV serialise / parse / download
└── components/
    ├── Dashboard.tsx         # KPIs + Recharts visualisations
    ├── Transactions.tsx      # Table, filters, import/export
    ├── TransactionForm.tsx   # Add / edit dialog
    └── Budgets.tsx           # Category limits & alerts
```
