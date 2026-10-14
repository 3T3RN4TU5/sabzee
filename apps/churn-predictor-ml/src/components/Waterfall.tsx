import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { GroupContribution } from '../ml/explain.ts'
import { FEATURE_LABELS } from '../ml/schema.ts'
import type { CustomerRow } from '../ml/types.ts'
import { signed } from '../lib/format.ts'
import { tooltipStyle } from '../lib/chart.ts'

interface Step {
  name: string
  detail: string
  range: [number, number]
  delta: number
  kind: 'base' | 'up' | 'down' | 'total'
}

const COLORS = { base: '#64748b', total: '#cbd5e1', up: 'var(--push-up)', down: 'var(--push-down)' }

function describe(feature: string, row: CustomerRow): string {
  const v = row[feature]
  if (v === undefined) return 'derived feature'
  if (feature === 'tenure') return `${v} months`
  if (feature === 'MonthlyCharges' || feature === 'TotalCharges') return v === null || v === '' ? 'missing' : `$${v}`
  if (feature === 'SeniorCitizen') return Number(v) === 1 ? 'Yes' : 'No'
  return String(v)
}

/**
 * Explains one prediction as a waterfall in log-odds: start at the average
 * customer's score, add each feature's SHAP value, land on this customer's score.
 */
export function Waterfall({ base, score, groups, row, top = 9, space }: {
  base: number
  score: number
  groups: GroupContribution[]
  row: CustomerRow
  top?: number
  space: string
}) {
  const shown = groups.slice(0, top)
  const rest = groups.slice(top).reduce((s, g) => s + g.value, 0)
  const steps: Step[] = []
  const mark = Math.max(0.02, (Math.abs(score - base) + 1) * 0.008)
  steps.push({ name: 'Average customer', detail: 'expected score (base value)', range: [base - mark, base + mark], delta: base, kind: 'base' })
  let cur = base
  const add = (name: string, detail: string, v: number) => {
    steps.push({ name, detail, range: [cur, cur + v], delta: v, kind: v >= 0 ? 'up' : 'down' })
    cur += v
  }
  for (const g of shown) add(FEATURE_LABELS[g.feature] ?? g.feature, describe(g.feature, row), g.value)
  if (groups.length > top) add(`${groups.length - top} other features`, 'combined', rest)
  steps.push({ name: 'This customer', detail: 'model score', range: [score - mark, score + mark], delta: score, kind: 'total' })

  return (
    <div>
      <ResponsiveContainer width="100%" height={steps.length * 30 + 40} initialDimension={{ width: 600, height: 300 }}>
        <BarChart data={steps} layout="vertical" margin={{ top: 4, right: 16, bottom: 18, left: 8 }} barCategoryGap={4}>
          <CartesianGrid horizontal={false} stroke="var(--chart-grid)" />
          <XAxis
            type="number"
            domain={['auto', 'auto']}
            tickFormatter={(v: number) => v.toFixed(1)}
            stroke="var(--chart-grid)"
            label={{ value: `${space} of churn  →  higher = riskier`, position: 'insideBottom', offset: -10, fill: '#94a3b8', fontSize: 11 }}
          />
          <YAxis type="category" dataKey="name" width={150} stroke="var(--chart-grid)" tick={{ fontSize: 11.5 }} interval={0} />
          <ReferenceLine x={base} stroke="#64748b" strokeDasharray="3 3" />
          <Tooltip
            {...tooltipStyle}
            cursor={{ fill: 'rgb(255 255 255 / 0.04)' }}
            formatter={(_v, _n, item) => {
              const s = item.payload as Step
              return [s.kind === 'base' || s.kind === 'total' ? s.delta.toFixed(3) : signed(s.delta, 3), s.detail]
            }}
          />
          <Bar dataKey="range" radius={3} isAnimationActive={false}>
            {steps.map((s, i) => (
              <Cell key={i} fill={COLORS[s.kind]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
