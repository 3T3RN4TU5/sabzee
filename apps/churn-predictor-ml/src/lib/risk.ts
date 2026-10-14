import type { GroupContribution } from '../ml/explain.ts'
import type { CustomerRow } from '../ml/types.ts'

export type Tier = { id: 'low' | 'elevated' | 'high'; label: string; className: string }

/** Tiers are anchored to the business threshold, not to 0.5. */
export function riskTier(p: number, threshold: number): Tier {
  if (p >= Math.max(0.5, threshold)) return { id: 'high', label: 'High risk', className: 'text-rose-300 bg-rose-500/10 border-rose-400/30' }
  if (p >= threshold) return { id: 'elevated', label: 'Elevated risk', className: 'text-amber-200 bg-amber-500/10 border-amber-400/30' }
  return { id: 'low', label: 'Low risk', className: 'text-emerald-300 bg-emerald-500/10 border-emerald-400/30' }
}

export interface Action {
  title: string
  why: string
  change: Partial<CustomerRow>
}

/** Map the strongest risk-increasing drivers to concrete retention levers. */
export function suggestActions(row: CustomerRow, groups: GroupContribution[]): Action[] {
  const pushing = new Set(groups.filter((g) => g.value > 0.05).map((g) => g.feature))
  const out: Action[] = []
  const internet = row.InternetService !== 'No'
  if ((pushing.has('Contract') || pushing.has('tenure_bucket')) && row.Contract === 'Month-to-month')
    out.push({ title: 'Offer a discounted 1-year contract', why: 'Month-to-month contract is a top churn driver.', change: { Contract: 'One year' } })
  if (pushing.has('PaymentMethod') && row.PaymentMethod === 'Electronic check')
    out.push({ title: 'Incentivise switching to auto-pay', why: 'Electronic-check payers churn far more than auto-pay customers.', change: { PaymentMethod: 'Credit card (automatic)' } })
  if (internet && pushing.has('TechSupport') && row.TechSupport === 'No')
    out.push({ title: 'Free 3-month tech-support trial', why: 'Customers without tech support churn more.', change: { TechSupport: 'Yes' } })
  if (internet && pushing.has('OnlineSecurity') && row.OnlineSecurity === 'No')
    out.push({ title: 'Bundle online security', why: 'No online security increases risk.', change: { OnlineSecurity: 'Yes' } })
  if (pushing.has('InternetService') && row.InternetService === 'Fiber optic')
    out.push({ title: 'Proactive fiber service-quality check', why: 'Fiber customers churn more (price / quality).', change: {} })
  if (pushing.has('MonthlyCharges') || pushing.has('charge_ratio'))
    out.push({ title: 'Review the bill for a loyalty discount', why: 'Charges are pushing risk up.', change: {} })
  return out.slice(0, 3)
}
