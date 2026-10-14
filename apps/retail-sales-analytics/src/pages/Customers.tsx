import { useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts'
import { ChartTooltip } from '../components/ChartTooltip.tsx'
import { DataTable, type Column } from '../components/DataTable.tsx'
import { Heatmap, RampLegend } from '../components/Heatmap.tsx'
import { Callout, Card, ErrorState, KpiTile, Legend, LegendItem, Loading, PageIntro, Segmented, Stat } from '../components/ui.tsx'
import { useData } from '../lib/data.ts'
import { fmt, monthLabel } from '../lib/format.ts'
import { axisProps, BLUE_RAMP, C, rampColor, SEGMENT_COLOR, SERIES } from '../lib/theme.ts'
import type { Clv, Customers, Segment } from '../lib/types.ts'

export default function CustomersPage() {
  const s = useData('customers', 'clv')
  if (s.status === 'loading') return <Loading />
  if (s.status === 'error') return <ErrorState message={s.error} onRetry={s.retry} />
  const { customers: c, clv } = s.data
  const champs = c.segmentation.segments.find((x) => x.segment === 'Champions')
  const top10 = clv.deciles[0]

  return (
    <>
      <PageIntro eyebrow="Customers" title="Who buys, do they come back, and what are they worth?">
        Customer analytics use the {fmt.int(c.repeat.customers)} identified customers (guest checkouts carry no ID and are excluded here). Cohorts and
        RFM are pure SQL; segmentation is k-means on log-scaled RFM features; lifetime value comes from a probabilistic MBG/NBD + Gamma-Gamma model.
      </PageIntro>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KpiTile label="Identified customers" value={fmt.int(c.repeat.customers)} deltaLabel={`${fmt.num(c.repeat.avg_orders_per_customer, 1)} orders each on average`} />
        <KpiTile label="Repeat-purchase rate" value={fmt.pct(c.repeat.repeat_rate)} deltaLabel={`${fmt.int(c.repeat.repeat_customers)} ordered twice or more`} />
        <KpiTile label="Revenue from repeat orders" value={fmt.pct(c.repeat.revenue_share_repeat_orders)} deltaLabel="2nd and later orders" />
        <KpiTile label="Median days to 2nd order" value={fmt.int(c.repeat.median_days_to_second_order)} deltaLabel={`then every ${fmt.int(c.repeat.median_days_between_orders)} days (median)`} />
        <KpiTile
          label="Champions' revenue share"
          value={fmt.pct(champs?.revenue_share)}
          deltaLabel={`from ${fmt.pct(champs?.customer_share, 0)} of customers`}
        />
      </div>

      <div className="mt-5">
        <CohortCard c={c} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-5">
        <SegmentsCard className="xl:col-span-3" c={c} />
        <KSelectionCard className="xl:col-span-2" c={c} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <ScatterCard c={c} />
        <RfmGridCard c={c} />
      </div>

      <h2 className="mt-10 mb-1 text-lg font-bold text-white">Customer lifetime value (next 12 months)</h2>
      <p className="mb-4 max-w-3xl text-sm text-slate-400">
        {clv.method}. A transaction is a {clv.transaction_definition}; values are revenue (no cost data), discounted at {fmt.pct(clv.monthly_discount, 0)} a
        month.
      </p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile label="12-month CLV, all customers" value={fmt.moneyCompact(clv.total_clv_12m)} deltaLabel="expected revenue from today's base" />
        <KpiTile label="Mean / median CLV" value={`${fmt.money(clv.mean_clv_12m)}`} deltaLabel={`median ${fmt.money(clv.median_clv_12m)}: heavily skewed`} />
        <KpiTile label="Top-decile share of CLV" value={fmt.pct(top10?.share)} deltaLabel={`${fmt.int(top10?.customers)} customers`} />
        <KpiTile label="Holdout error (repeat transactions)" value={fmt.signedPct(clv.validation_error)} deltaLabel={`r = ${fmt.num(clv.validation_corr, 2)} at customer level`} />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <ClvValidationCard clv={clv} />
        <ClvDecilesCard clv={clv} />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-5">
        <ClvSegmentsCard className="xl:col-span-3" clv={clv} />
        <ClvNotesCard className="xl:col-span-2" clv={clv} />
      </div>
    </>
  )
}

function CohortCard({ c }: { c: Customers }) {
  const [mode, setMode] = useState<'pct' | 'count'>('pct')
  const maxLen = Math.max(...c.cohorts.map((x) => x.retention.length))
  const cols = Array.from({ length: maxLen }, (_, i) => ({ key: String(i), label: `M${i}` }))
  return (
    <Card
      title="Monthly cohort retention"
      subtitle="Share of each acquisition cohort that bought again N months after its first order."
      actions={
        <Segmented
          label="Cell values"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'pct', label: '% retained' },
            { value: 'count', label: 'Customers' },
          ]}
        />
      }
      footnote={
        <>
          The Dec 2010 cohort is left-censored: it contains every customer active before the extract began, so its retention (~35–50%) overstates a new
          customer's. For genuinely new cohorts, month-1 retention averages {fmt.pct(c.avg_month1_retention_excl_first)}. Month 12 for Dec 2010 and the
          final column are partial (data ends 9 Dec 2011).
        </>
      }
    >
      <Heatmap
        caption="Cohort retention matrix"
        rowHeader="Cohort"
        rows={c.cohorts.map((x) => ({ key: x.cohort, label: monthLabel(x.cohort, true), sub: fmt.int(x.size) }))}
        cols={cols}
        value={(ri, ci) => c.cohorts[ri].retention[ci] ?? null}
        color={(v) => (v >= 1 ? '#334155' : rampColor(v / 0.5))}
        cellText={(v) => (mode === 'pct' ? (v >= 1 ? '100' : (v * 100).toFixed(0)) : '')}
        describe={(ri, ci, v) => {
          const co = c.cohorts[ri]
          return `${monthLabel(co.cohort)} cohort, month ${ci}: ${fmt.pct(v)} retained (${fmt.int(Math.round(v * co.size))} of ${fmt.int(co.size)} customers)`
        }}
        legend={<RampLegend colors={BLUE_RAMP} min="0%" max="≥50%" />}
      />
      {mode === 'count' && (
        <div className="mt-3">
          <DataTable
            caption="Cohort retention counts"
            dense
            pageSize={13}
            csvName="cohort-retention"
            rows={c.cohorts}
            columns={[
              { key: 'cohort', header: 'Cohort', value: (r) => r.cohort },
              { key: 'size', header: 'Size', value: (r) => r.size, align: 'right', render: (r) => fmt.int(r.size) },
              ...cols.slice(1).map((col, i) => ({
                key: col.key,
                header: col.label,
                align: 'right' as const,
                value: (r: Customers['cohorts'][number]) => (r.retention[i + 1] === undefined ? null : Math.round(r.retention[i + 1] * r.size)),
                render: (r: Customers['cohorts'][number]) => (r.retention[i + 1] === undefined ? '' : fmt.int(Math.round(r.retention[i + 1] * r.size))),
              })),
            ]}
          />
        </div>
      )}
    </Card>
  )
}

function SegmentsCard({ c, className }: { c: Customers; className?: string }) {
  const seg = c.segmentation
  const data = seg.segments.map((s) => ({ name: s.segment, customers: s.customer_share, revenue: s.revenue_share }))
  const cols: Column<Segment>[] = [
    {
      key: 'segment',
      header: 'Segment',
      value: (r) => r.segment,
      render: (r) => (
        <span className="inline-flex items-center gap-2 font-medium text-white">
          <span className="size-2.5 rounded-sm" style={{ background: SEGMENT_COLOR[r.segment] ?? C.muted }} aria-hidden />
          {r.segment}
        </span>
      ),
    },
    { key: 'customers', header: 'Customers', value: (r) => r.customers, render: (r) => fmt.int(r.customers), align: 'right' },
    { key: 'revenue', header: 'Revenue', value: (r) => r.revenue, render: (r) => fmt.moneyCompact(r.revenue), align: 'right' },
    { key: 'rec', header: 'Recency (med, d)', value: (r) => r.median_recency, render: (r) => fmt.int(r.median_recency), align: 'right' },
    { key: 'freq', header: 'Orders (med)', value: (r) => r.median_frequency, render: (r) => fmt.int(r.median_frequency), align: 'right' },
    { key: 'mon', header: 'Spend (med)', value: (r) => r.median_monetary, render: (r) => fmt.money(r.median_monetary), align: 'right' },
    { key: 'action', header: 'Recommended play', value: (r) => r.action, sortable: false, className: 'min-w-64 whitespace-normal text-slate-400' },
  ]
  return (
    <Card
      className={className}
      title={`k-means segments (k = ${seg.chosen_k})`}
      subtitle="Share of customers vs share of revenue: the gap is where the value concentrates."
    >
      <Legend>
        <LegendItem color={SERIES[6]} label="% of customers" />
        <LegendItem color={SERIES[0]} label="% of revenue" />
      </Legend>
      <div className="h-52" role="img" aria-label="Grouped bar chart of customer share and revenue share by segment">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2} barCategoryGap="28%">
            <CartesianGrid stroke={C.grid} vertical={false} />
            <XAxis dataKey="name" {...axisProps} />
            <YAxis {...axisProps} axisLine={false} width={44} tickFormatter={(v: number) => fmt.pct(v, 0)} />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              content={({ active, payload, label }) => <ChartTooltip active={active} payload={payload} label={label} valueFormat={(v) => fmt.pct(v)} />}
            />
            <Bar isAnimationActive={false} dataKey="customers" name="% of customers" fill={SERIES[6]} radius={[4, 4, 0, 0]} maxBarSize={40} />
            <Bar isAnimationActive={false} dataKey="revenue" name="% of revenue" fill={SERIES[0]} radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4">
        <DataTable rows={seg.segments} columns={cols} caption="Segment profiles" csvName="kmeans-segments" />
      </div>
    </Card>
  )
}

function KSelectionCard({ c, className }: { c: Customers; className?: string }) {
  const seg = c.segmentation
  const rules = seg.rule_segments
  return (
    <Card
      className={className}
      title="Choosing k"
      subtitle={`Silhouette score on standardised ${seg.features.join(', ')}.`}
      footnote="k = 2 scores highest but only splits active from lapsed buyers, too coarse to act on, so k is chosen by silhouette among k ≥ 3. The rule-based RFM grid (NTILE quintiles in rfm.sql) is shown for comparison."
    >
      <div className="h-40" role="img" aria-label="Line chart of silhouette score by number of clusters">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={seg.k_selection} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={C.grid} vertical={false} />
            <XAxis dataKey="k" {...axisProps} />
            <YAxis {...axisProps} axisLine={false} width={40} domain={['auto', 'auto']} tickFormatter={(v: number) => v.toFixed(2)} />
            <Tooltip content={({ active, payload, label }) => <ChartTooltip active={active} payload={payload} label={`k = ${label}`} valueFormat={(v) => v.toFixed(3)} />} />
            <Line
              dataKey="silhouette"
              name="Silhouette"
              stroke={SERIES[0]}
              strokeWidth={2}
              isAnimationActive={false}
              dot={(p: { cx?: number; cy?: number; payload?: { k: number } }) => (
                <circle
                  key={p.payload?.k}
                  cx={p.cx}
                  cy={p.cy}
                  r={p.payload?.k === seg.chosen_k ? 6 : 3.5}
                  fill={p.payload?.k === seg.chosen_k ? SERIES[0] : C.surface}
                  stroke={SERIES[0]}
                  strokeWidth={2}
                />
              )}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="eyebrow mt-4 mb-2">Rule-based RFM segments</p>
      <DataTable
        caption="Rule-based RFM segments"
        dense
        pageSize={8}
        rows={rules}
        initialSort={{ key: 'revenue', dir: 'desc' }}
        csvName="rfm-rule-segments"
        columns={[
          { key: 'seg', header: 'Segment', value: (r) => r.rfm_segment },
          { key: 'customers', header: 'Customers', value: (r) => r.customers, render: (r) => fmt.int(r.customers), align: 'right' },
          { key: 'revenue', header: 'Revenue share', value: (r) => r.revenue_share, render: (r) => fmt.pct(r.revenue_share), align: 'right' },
        ]}
      />
    </Card>
  )
}

function ScatterCard({ c }: { c: Customers }) {
  const groups = c.segmentation.segments.map((s) => s.segment)
  return (
    <Card
      title="Recency vs spend by segment"
      subtitle="Stratified sample of up to 160 customers per segment; spend on a log scale."
      footnote="Segments separate mainly on recency and order count. Spend overlaps more, which is why value-based actions also use the RFM grid."
    >
      <Legend>
        {groups.map((g) => (
          <LegendItem key={g} color={SEGMENT_COLOR[g] ?? C.muted} label={g} />
        ))}
      </Legend>
      <div className="h-72" role="img" aria-label="Scatter plot of days since last order against total spend, coloured by segment">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
            <CartesianGrid stroke={C.grid} />
            <XAxis type="number" dataKey="recency" name="Days since last order" {...axisProps} label={{ value: 'Days since last order', fill: C.muted, fontSize: 11, position: 'insideBottom', offset: -4 }} />
            <YAxis type="number" dataKey="monetary" name="Spend" scale="log" domain={[10, 'auto']} allowDataOverflow {...axisProps} axisLine={false} width={56} tickFormatter={(v: number) => fmt.moneyCompact(v)} />
            <ZAxis range={[22, 22]} />
            <Tooltip
              cursor={{ strokeDasharray: '3 3', stroke: C.axis }}
              content={({ active, payload }) => {
                const p = payload?.[0]?.payload as { segment: string; recency: number; frequency: number; monetary: number } | undefined
                if (!active || !p) return null
                return (
                  <div className="rounded-lg border border-white/10 bg-slate-950/95 px-3 py-2 text-xs shadow-xl">
                    <p className="font-semibold text-white">{p.segment}</p>
                    <p className="num text-slate-300">
                      {fmt.money(p.monetary)} · {p.frequency} orders · last {p.recency} d ago
                    </p>
                  </div>
                )
              }}
            />
            {groups.map((g) => (
              <Scatter
                key={g}
                name={g}
                data={c.segmentation.scatter.filter((p) => p.segment === g && p.monetary > 0)}
                fill={SEGMENT_COLOR[g] ?? C.muted}
                fillOpacity={0.75}
                stroke={C.surface}
                strokeWidth={1}
                isAnimationActive={false}
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

function RfmGridCard({ c }: { c: Customers }) {
  const [metric, setMetric] = useState<'customers' | 'avg_monetary'>('customers')
  const grid = c.segmentation.rfm_grid
  const get = (r: number, f: number) => grid.find((g) => g.r_score === r && g.f_score === f)
  const max = Math.max(...grid.map((g) => g[metric]))
  return (
    <Card
      title="RFM grid: recency × frequency score"
      subtitle="Quintile scores from rfm.sql (5 = most recent / most frequent)."
      actions={
        <Segmented
          label="Cell metric"
          value={metric}
          onChange={setMetric}
          options={[
            { value: 'customers', label: 'Customers' },
            { value: 'avg_monetary', label: 'Avg spend' },
          ]}
        />
      }
      footnote="Top-right = Champions. The R1–2 / F4–5 cells (‘Cannot lose’) are high-value customers who have gone quiet: the cheapest revenue to win back."
    >
      <Heatmap
        caption="RFM grid"
        rowHeader="Recency ↓ / Frequency →"
        rows={[5, 4, 3, 2, 1].map((r) => ({ key: String(r), label: `R${r}` }))}
        cols={[1, 2, 3, 4, 5].map((f) => ({ key: String(f), label: `F${f}` }))}
        value={(ri, ci) => get(5 - ri, ci + 1)?.[metric] ?? null}
        color={(v) => rampColor(Math.sqrt(v / max))}
        cellText={(v) => (metric === 'customers' ? fmt.int(v) : fmt.moneyCompact(v))}
        describe={(ri, ci) => {
          const g = get(5 - ri, ci + 1)
          return `R${5 - ri} F${ci + 1}: ${fmt.int(g?.customers)} customers, average spend ${fmt.money(g?.avg_monetary)}`
        }}
        minCell={64}
        legend={<RampLegend colors={BLUE_RAMP} min="low" max="high" />}
      />
    </Card>
  )
}

function ClvValidationCard({ clv }: { clv: Clv }) {
  return (
    <Card
      title="Model validation: predicted vs actual repeat purchases"
      subtitle={`Calibrated to ${clv.calibration_end}, predicting the next ${clv.holdout_days} days; customers grouped by calibration-period repeat count.`}
      footnote={`Total: ${fmt.int(clv.validation_total_predicted)} predicted vs ${fmt.int(clv.validation_total_actual)} actual (${fmt.signedPct(clv.validation_error)}). The model ranks customers well but under-predicts the level because the holdout is the Q4 peak and the model assumes stationary purchase rates.`}
    >
      <Legend>
        <LegendItem color={SERIES[0]} label="Predicted" />
        <LegendItem color={SERIES[2]} label="Actual" />
      </Legend>
      <div className="h-60" role="img" aria-label="Grouped bars of predicted and actual repeat transactions per customer by calibration frequency">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={clv.validation} margin={{ top: 8, right: 8, left: 0, bottom: 8 }} barGap={2}>
            <CartesianGrid stroke={C.grid} vertical={false} />
            <XAxis dataKey="bucket" {...axisProps} label={{ value: 'Repeat purchases in calibration period', fill: C.muted, fontSize: 11, position: 'insideBottom', offset: -4 }} />
            <YAxis {...axisProps} axisLine={false} width={36} />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              content={({ active, payload, label }) => (
                <ChartTooltip
                  active={active}
                  payload={payload}
                  label={`${label} repeat purchases`}
                  valueFormat={(v) => `${v.toFixed(2)} per customer`}
                  extra={(p) => <p className="mt-1 text-[11px] text-slate-500">{fmt.int((p[0]?.payload as { customers: number } | undefined)?.customers)} customers</p>}
                />
              )}
            />
            <Bar isAnimationActive={false} dataKey="predicted" name="Predicted" fill={SERIES[0]} radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar isAnimationActive={false} dataKey="actual" name="Actual" fill={SERIES[2]} radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

function ClvDecilesCard({ clv }: { clv: Clv }) {
  const data = clv.deciles.map((d) => ({ ...d, label: `D${d.decile}` }))
  return (
    <Card title="CLV concentration by decile" subtitle="Customers ranked by predicted 12-month value; D1 = top 10%.">
      <div className="h-60" role="img" aria-label="Bar chart of share of total CLV by customer decile">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={C.grid} vertical={false} />
            <XAxis dataKey="label" {...axisProps} />
            <YAxis {...axisProps} axisLine={false} width={40} tickFormatter={(v: number) => fmt.pct(v, 0)} />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              content={({ active, payload, label }) => (
                <ChartTooltip
                  active={active}
                  payload={payload}
                  label={label}
                  valueFormat={(v, item) => `${fmt.pct(v)} · mean ${fmt.money((item.payload as { mean_clv: number }).mean_clv)}`}
                />
              )}
            />
            <Bar isAnimationActive={false} dataKey="share" name="Share of CLV" radius={[4, 4, 0, 0]} maxBarSize={40} label={{ position: 'top', fill: C.ink, fontSize: 10, formatter: (v: unknown) => fmt.pct(Number(v), 0) }}>
              {data.map((d) => (
                <Cell key={d.decile} fill={d.decile === 1 ? SERIES[0] : '#475569'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

function ClvSegmentsCard({ clv, className }: { clv: Clv; className?: string }) {
  return (
    <Card className={className} title="CLV by segment and top accounts">
      <DataTable
        caption="CLV by segment"
        dense
        csvName="clv-by-segment"
        rows={clv.by_segment}
        columns={[
          { key: 'segment', header: 'Segment', value: (r) => r.segment },
          { key: 'customers', header: 'Customers', value: (r) => r.customers, render: (r) => fmt.int(r.customers), align: 'right' },
          { key: 'total', header: '12-mo CLV', value: (r) => r.total_clv, render: (r) => fmt.moneyCompact(r.total_clv), align: 'right' },
          { key: 'mean', header: 'Mean', value: (r) => r.mean_clv, render: (r) => fmt.money(r.mean_clv), align: 'right' },
          { key: 'median', header: 'Median', value: (r) => r.median_clv, render: (r) => fmt.money(r.median_clv), align: 'right' },
          { key: 'tx', header: 'Exp. orders', value: (r) => r.exp_tx_12m, render: (r) => fmt.num(r.exp_tx_12m, 1), align: 'right' },
        ]}
      />
      <p className="eyebrow mt-5 mb-2">Top 15 customers by predicted CLV</p>
      <DataTable
        caption="Top customers by CLV"
        dense
        pageSize={8}
        csvName="clv-top-customers"
        rows={clv.top_customers}
        initialSort={{ key: 'clv', dir: 'desc' }}
        columns={[
          { key: 'id', header: 'Customer ID', value: (r) => r.customer_id, className: 'font-mono text-xs' },
          { key: 'segment', header: 'Segment', value: (r) => r.segment },
          { key: 'x', header: 'Repeat days', value: (r) => r.x, render: (r) => fmt.int(r.x), align: 'right' },
          { key: 'tx', header: 'Exp. orders', value: (r) => r.exp_tx_12m, render: (r) => fmt.num(r.exp_tx_12m, 1), align: 'right' },
          { key: 'spend', header: 'Exp. £ / order', value: (r) => r.exp_spend, render: (r) => fmt.money(r.exp_spend), align: 'right' },
          { key: 'clv', header: '12-mo CLV', value: (r) => r.clv_12m, render: (r) => fmt.money(r.clv_12m), align: 'right' },
        ]}
      />
    </Card>
  )
}

function ClvNotesCard({ clv, className }: { clv: Clv; className?: string }) {
  const p = clv.params_mbgnbd
  const g = clv.params_gamma_gamma
  return (
    <Card className={className} title="Assumptions & diagnostics">
      <div className="grid grid-cols-2 gap-2">
        <Stat label="MBG/NBD r, α" value={`${fmt.num(p.r, 2)}, ${fmt.num(p.alpha, 1)}`} sub="purchase-rate heterogeneity" />
        <Stat label="Dropout prob. a/(a+b)" value={clv.dropout_probability < 0.0001 ? '≈ 0' : fmt.pct(clv.dropout_probability, 2)} sub="per purchase" />
        <Stat label="Gamma-Gamma p, q, v" value={`${fmt.num(g.p, 2)}, ${fmt.num(g.q, 2)}, ${fmt.num(g.v, 0)}`} sub="spend per transaction" />
        <Stat label="Freq ↔ spend correlation" value={fmt.num(clv.freq_monetary_corr, 2)} sub="Gamma-Gamma needs ≈ 0" />
      </div>
      <div className="mt-4 space-y-3">
        <Callout tone="warn" title="Churn isn't identifiable from 12 months of B2B data">
          The likelihood is maximised with essentially zero dropout: over one year, a slow buyer and a churned buyer look the same, and r = {fmt.num(p.r, 2)}{' '}
          means purchase rates vary enormously. So P(alive) ≈ 1 for everyone and the CLV figures are an upper bound on retained value.
        </Callout>
        <Callout title="Sanity check against realised value">
          The Jan 2011 cohort ({fmt.int(clv.benchmark_jan_cohort_size)} customers) actually spent {fmt.money(clv.benchmark_jan_cohort_realised_11m)} each in its first 11
          months; the model expects {fmt.money(clv.benchmark_jan_cohort_model_12m)} from them over the next 12. That is the same order of magnitude, with some decay.
        </Callout>
      </div>
    </Card>
  )
}
