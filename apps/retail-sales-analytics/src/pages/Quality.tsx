import { useState } from 'react'
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartTooltip } from '../components/ChartTooltip.tsx'
import { DataTable } from '../components/DataTable.tsx'
import { Card, ErrorState, KpiTile, Loading, PageIntro, Segmented, StatusBadge } from '../components/ui.tsx'
import { useData } from '../lib/data.ts'
import { fmt } from '../lib/format.ts'
import { axisProps, C, SERIES } from '../lib/theme.ts'
import type { Meta, Quality, QualityCheck } from '../lib/types.ts'

const RULE_LABEL: Record<string, string> = {
  duplicate: 'R1 · Duplicates',
  non_merchandise: 'R2 · Non-merchandise',
  stock_adjustment: 'R3 · Stock write-offs',
  invalid_price: 'R4 · Price ≤ 0',
  cancelled_order: 'R5 · Cancelled orders',
  cancelled_order_reversal: 'R5 · Their reversals',
  implausible_line: 'R6 · Implausible lines',
}

export default function QualityPage({ meta }: { meta: Meta }) {
  const s = useData('quality')
  if (s.status === 'loading') return <Loading />
  if (s.status === 'error') return <ErrorState message={s.error} onRetry={s.retry} />
  const q = s.data.quality
  const removed = q.ledger.reduce((a, r) => a + r.rows, 0)

  return (
    <>
      <PageIntro eyebrow="Data quality" title="Can these numbers be trusted?">
        The ETL attributes every dropped row to exactly one rule, then runs {q.checks.length} named checks on the warehouse. Blocking checks raise and stop the
        pipeline before any JSON is published; warnings are recorded here with their evidence.
      </PageIntro>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KpiTile label="Raw rows" value={fmt.int(q.profile.rows)} deltaLabel="UCI Online Retail extract" />
        <KpiTile label="Rows removed" value={fmt.int(removed)} deltaLabel={`${fmt.pct(removed / q.profile.rows, 1)} of raw, by 6 rules`} />
        <KpiTile label="Clean sales lines" value={fmt.int(q.kept.sales_lines)} deltaLabel={`+ ${fmt.int(q.kept.return_lines)} return lines`} />
        <KpiTile label="Checks passed" value={`${q.summary.pass} / ${q.checks.length}`} deltaLabel={`${q.summary.warn} warning, ${q.summary.fail} failed`} />
        <KpiTile label="Guest lines kept" value={fmt.int(q.kept.guest_lines)} deltaLabel="no CustomerID: in revenue, not in customer analytics" />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-5">
        <LedgerCard className="xl:col-span-3" q={q} />
        <SchemaCard className="xl:col-span-2" q={q} />
      </div>

      <div className="mt-5">
        <ChecksCard q={q} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <ProfileCard q={q} />
        <ExamplesCard q={q} />
      </div>
      <p className="mt-6 text-center text-xs text-slate-500">Pipeline output generated {meta.generated}.</p>
    </>
  )
}

function LedgerCard({ q, className }: { q: Quality; className?: string }) {
  const data = q.ledger.map((r) => ({ name: RULE_LABEL[r.rule] ?? r.rule, rows: r.rows, description: r.description }))
  return (
    <Card
      className={className}
      title="Cleaning ledger: rows removed by rule"
      subtitle="Applied in order; each row is counted once. Raw = kept + removed is a blocking check."
      footnote="R5 is the interesting one: 2,817 purchase lines were exactly reversed by a later credit note (same customer, product and quantity). Counting those as sales would overstate revenue, and it removes the two infamous 80,995 and 74,215-unit keying errors without an arbitrary cap."
    >
      <div className="h-64" role="img" aria-label="Horizontal bar chart of rows removed by each cleaning rule">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 56, left: 0, bottom: 0 }} barCategoryGap={6}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" {...axisProps} axisLine={false} width={180} />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              content={({ active, payload, label }) => (
                <ChartTooltip
                  active={active}
                  payload={payload}
                  label={label}
                  valueFormat={(v) => `${fmt.int(v)} rows`}
                  extra={(p) => <p className="mt-1 max-w-56 text-[11px] text-slate-400">{(p[0]?.payload as { description: string } | undefined)?.description}</p>}
                />
              )}
            />
            <Bar isAnimationActive={false} dataKey="rows" name="Removed" radius={[0, 4, 4, 0]} label={{ position: 'right', fill: C.ink, fontSize: 11, formatter: (v: unknown) => fmt.int(Number(v)) }}>
              {data.map((d) => (
                <Cell key={d.name} fill={d.rows ? SERIES[1] : C.muted} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

function SchemaCard({ q, className }: { q: Quality; className?: string }) {
  const dims = [
    { name: 'dim_date', keys: 'date_key · month · iso_week · weekday' },
    { name: 'dim_customer', keys: 'customer_key · country · cohort_month' },
    { name: 'dim_product', keys: 'product_key · stock_code · category' },
  ]
  return (
    <Card
      className={className}
      title="DuckDB star schema"
      subtitle="PRIMARY / FOREIGN KEY and CHECK constraints are enforced on load."
      footnote="customer_key 0 is the guest member. Every fact row keeps source_row for lineage back to the raw file."
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {(['fact_sales', 'fact_returns'] as const).map((f) => (
            <div key={f} className="rounded-xl border border-sky-400/30 bg-sky-400/[0.07] p-3">
              <p className="font-mono text-sm font-semibold text-sky-200">{f}</p>
              <p className="num mt-0.5 text-xs text-slate-400">{fmt.int(q.tables[f])} rows</p>
              <p className="mt-1 text-[11px] text-slate-500">grain: invoice line</p>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-slate-500" aria-hidden>
          ↓ foreign keys ↓
        </p>
        <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
          {dims.map((d) => (
            <div key={d.name} className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
              <p className="font-mono text-sm font-semibold text-slate-200">{d.name}</p>
              <p className="num mt-0.5 text-xs text-slate-400">{fmt.int(q.tables[d.name])} rows</p>
              <p className="mt-1 text-[11px] text-slate-500">{d.keys}</p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

function ChecksCard({ q }: { q: Quality }) {
  const [filter, setFilter] = useState<'all' | 'pass' | 'warn' | 'fail'>('all')
  const rows = filter === 'all' ? q.checks : q.checks.filter((c) => c.status === filter)
  return (
    <Card
      title="Check results"
      subtitle="Grouped by pipeline stage. Status is shown with an icon and a label, never colour alone."
      actions={
        <Segmented
          label="Filter checks by status"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: `All ${q.checks.length}` },
            { value: 'pass', label: `Pass ${q.summary.pass}` },
            { value: 'warn', label: `Warn ${q.summary.warn}` },
            { value: 'fail', label: `Fail ${q.summary.fail}` },
          ]}
        />
      }
    >
      <DataTable<QualityCheck>
        caption="Data-quality checks"
        rows={rows}
        pageSize={40}
        csvName="data-quality-checks"
        columns={[
          { key: 'status', header: 'Status', value: (r) => r.status, render: (r) => <StatusBadge status={r.status} /> },
          { key: 'stage', header: 'Stage', value: (r) => r.stage, className: 'text-slate-400 capitalize' },
          { key: 'category', header: 'Type', value: (r) => r.category, className: 'text-slate-400' },
          {
            key: 'name',
            header: 'Check',
            value: (r) => r.name,
            className: 'min-w-64 whitespace-normal',
            render: (r) => (
              <span>
                <span className="text-white">{r.name}</span>
                {r.detail && <span className="mt-0.5 block text-[11px] text-slate-500">{r.detail}</span>}
              </span>
            ),
          },
          {
            key: 'observed',
            header: 'Observed',
            value: (r) => r.observed,
            align: 'right',
            render: (r) => (typeof r.observed === 'number' ? fmt.int(r.observed) : r.observed),
          },
          { key: 'expected', header: 'Expected', value: (r) => r.expected, className: 'text-slate-400' },
        ]}
      />
    </Card>
  )
}

function ProfileCard({ q }: { q: Quality }) {
  const p = q.profile
  return (
    <Card title="Raw data profile" subtitle="Before any cleaning.">
      <DataTable
        caption="Raw column profile"
        dense
        rows={p.columns}
        columns={[
          { key: 'c', header: 'Column', value: (r) => r.column, className: 'font-mono text-xs text-slate-200' },
          {
            key: 'n',
            header: 'Null rate',
            value: (r) => r.null_rate,
            align: 'right',
            render: (r) => <span className={r.null_rate > 0.1 ? 'text-amber-300' : ''}>{fmt.pct(r.null_rate, 2)}</span>,
          },
          { key: 'd', header: 'Distinct', value: (r) => r.distinct, render: (r) => fmt.int(r.distinct), align: 'right' },
        ]}
      />
      <ul className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-400">
        <li>
          Cancellation rows: <span className="num text-slate-200">{fmt.int(p.cancellation_rows)}</span>
        </li>
        <li>
          Negative quantities: <span className="num text-slate-200">{fmt.int(p.negative_quantity_rows)}</span>
        </li>
        <li>
          Price ≤ 0: <span className="num text-slate-200">{fmt.int(p.non_positive_price_rows)}</span>
        </li>
        <li>
          Quantity range: <span className="num text-slate-200">{fmt.int(p.min_quantity)} to {fmt.int(p.max_quantity)}</span>
        </li>
      </ul>
    </Card>
  )
}

function ExamplesCard({ q }: { q: Quality }) {
  const withEx = q.ledger.filter((r) => r.examples.length)
  const [rule, setRule] = useState(withEx[0]?.rule ?? '')
  const current = withEx.find((r) => r.rule === rule)
  return (
    <Card title="What each rule caught" subtitle="Sample rows from the raw file, for audit.">
      <label className="mb-3 block max-w-xs text-xs text-slate-400">
        Rule
        <select className="select mt-1" value={rule} onChange={(e) => setRule(e.target.value)}>
          {withEx.map((r) => (
            <option key={r.rule} value={r.rule}>
              {RULE_LABEL[r.rule] ?? r.rule} ({fmt.int(r.rows)})
            </option>
          ))}
        </select>
      </label>
      {current && (
        <>
          <p className="mb-2 text-xs text-slate-500">{current.description}</p>
          <DataTable
            caption={`Examples for ${current.rule}`}
            dense
            rows={current.examples}
            columns={['invoice_no', 'stock_code', 'description', 'quantity', 'unit_price'].map((k) => ({
              key: k,
              header: k.replace('_', ' '),
              value: (r: Record<string, string | number | null>) => r[k],
              align: k === 'quantity' || k === 'unit_price' ? ('right' as const) : undefined,
              className: k === 'description' ? 'max-w-56 whitespace-normal' : k === 'stock_code' || k === 'invoice_no' ? 'font-mono text-xs' : undefined,
            }))}
          />
        </>
      )}
    </Card>
  )
}
