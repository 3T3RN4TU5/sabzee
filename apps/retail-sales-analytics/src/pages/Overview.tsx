import { useMemo, useState } from 'react'
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartTooltip } from '../components/ChartTooltip.tsx'
import { DataTable, type Column } from '../components/DataTable.tsx'
import { FilterBar } from '../components/FilterBar.tsx'
import { Heatmap, RampLegend } from '../components/Heatmap.tsx'
import { Callout, Card, ErrorState, KpiTile, Legend, LegendItem, Loading, PageIntro, Segmented } from '../components/ui.tsx'
import { breakdown, deltas, kpis, series, type Filters } from '../lib/cube.ts'
import { useData } from '../lib/data.ts'
import { dateLabel, fmt, monthLabel } from '../lib/format.ts'
import { axisProps, BLUE_RAMP, C, rampColor, SERIES } from '../lib/theme.ts'
import type { Cube, Forecast, ForecastModel, Meta, Monthly } from '../lib/types.ts'

export default function Overview({
  cube,
  meta,
  filters,
  defaults,
  onFilters,
}: {
  cube: Cube
  meta: Meta
  filters: Filters
  defaults: Filters
  onFilters: (f: Filters) => void
}) {
  const extra = useData('forecast', 'monthly')
  const points = useMemo(() => series(cube, filters.country, filters.category), [cube, filters.country, filters.category])
  const k = useMemo(() => kpis(points, filters.from, filters.to), [points, filters.from, filters.to])
  const d = useMemo(() => deltas(points, filters), [points, filters])
  const lastIdx = cube.months.length - 1
  const sliceName = [filters.country ? cube.countries[filters.country] : null, filters.category ? cube.categories[filters.category] : null]
    .filter(Boolean)
    .join(' · ')
  const empty = k.revenue === 0

  return (
    <>
      <PageIntro eyebrow="Executive overview" title="How is the business performing?">
        {fmt.money(meta.revenue)} of fulfilled sales from {fmt.int(meta.orders)} orders across {meta.countries} countries. Use the filters to
        slice by period, country and category; every number on this page is computed from a pre-aggregated SQL cube (
        <code className="font-mono text-xs text-sky-200">kpi_cube.sql</code>, <code className="font-mono text-xs text-sky-200">GROUPING SETS</code>).
      </PageIntro>

      <FilterBar
        cube={cube}
        filters={filters}
        defaults={defaults}
        onChange={onFilters}
        scope="Filters apply to KPIs, the revenue trend and the breakdowns. The forecast always covers the whole business."
      />

      {filters.to === lastIdx && (
        <div className="mb-4">
          <Callout tone="warn" title="December 2011 is a partial month">
            The extract ends on {dateLabel(meta.period_end)}, so the last month holds 8 trading days. Compare it like-for-like (see the trend card
            below) rather than with full months.
          </Callout>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KpiTile label="Revenue" value={fmt.moneyCompact(k.revenue)} delta={d.change.revenue} deltaLabel={d.label} hint={fmt.money(k.revenue)} />
        <KpiTile label={filters.category ? 'Orders with category' : 'Orders'} value={fmt.int(k.orders)} delta={d.change.orders} deltaLabel={d.label} />
        <KpiTile
          label={filters.category ? 'Category £ per order' : 'Avg order value'}
          value={fmt.money(k.aov)}
          delta={d.change.aov}
          deltaLabel={d.label}
        />
        <KpiTile
          label="Active customers / mo"
          value={fmt.int(k.avgCustomers)}
          delta={d.change.avgCustomers}
          deltaLabel={d.label}
          hint="Average monthly count of distinct identified customers (distinct counts don't add up across months)."
        />
        <KpiTile
          label="Return rate"
          value={fmt.pct(k.returnRate, 2)}
          delta={d.change.returnRate}
          deltaFormat="pp"
          invert
          deltaLabel={d.label}
          hint="Value of credit notes (partial returns) as a share of revenue. Fully cancelled orders are excluded from both."
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-5">
        <TrendCard className="xl:col-span-3" points={points} filters={filters} lastIdx={lastIdx} sliceName={sliceName} empty={empty} monthly={extra.status === 'ready' ? extra.data.monthly : null} />
        <BreakdownCard className="xl:col-span-2" cube={cube} filters={filters} onFilters={onFilters} />
      </div>

      <div className="mt-5">
        {extra.status === 'loading' && <Loading label="Loading forecast…" />}
        {extra.status === 'error' && <ErrorState message={extra.error} onRetry={extra.retry} />}
        {extra.status === 'ready' && (
          <div className="grid gap-5 xl:grid-cols-5">
            <ForecastCard className="xl:col-span-3" f={extra.data.forecast} />
            <WeekdayHourCard className="xl:col-span-2" monthly={extra.data.monthly} />
          </div>
        )}
      </div>
    </>
  )
}

function TrendCard({
  points,
  filters,
  lastIdx,
  sliceName,
  empty,
  monthly,
  className,
}: {
  points: ReturnType<typeof series>
  filters: Filters
  lastIdx: number
  sliceName: string
  empty: boolean
  monthly: Monthly | null
  className?: string
}) {
  const data = points.map((p, i) => ({
    ...p,
    label: monthLabel(p.month, true),
    inRange: i >= filters.from && i <= filters.to,
    partial: i === lastIdx,
    aov: p.orders ? p.revenue / p.orders : 0,
  }))
  const lfl = monthly?.like_for_like
  return (
    <Card
      className={className}
      title={`Monthly revenue${sliceName ? ` · ${sliceName}` : ''}`}
      subtitle="Selected months are highlighted; the rest of the timeline stays visible for context."
      footnote={
        lfl && (
          <>
            Like-for-like YoY: 1–9 Dec 2011 revenue {fmt.money(lfl.cur_revenue)} vs {fmt.money(lfl.prev_revenue)} for 1–9 Dec 2010 (
            {fmt.signedPct(lfl.cur_revenue / lfl.prev_revenue - 1)}). Calendar-month YoY isn't meaningful here: the extract holds only one overlapping month.
          </>
        )
      }
    >
      {empty ? (
        <p className="py-16 text-center text-sm text-slate-500">No sales for this combination of filters.</p>
      ) : (
        <div className="h-72" role="img" aria-label="Bar chart of monthly revenue for the selected slice">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="22%">
              <CartesianGrid stroke={C.grid} vertical={false} />
              <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={8} />
              <YAxis {...axisProps} axisLine={false} width={56} tickFormatter={(v: number) => fmt.moneyCompact(v)} />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                content={({ active, payload, label }) => (
                  <ChartTooltip
                    active={active}
                    payload={payload}
                    label={label}
                    valueFormat={(v) => fmt.money(v)}
                    extra={(p) => {
                      const row = p[0]?.payload as (typeof data)[number] | undefined
                      if (!row) return null
                      return (
                        <p className="mt-1.5 border-t border-white/10 pt-1.5 text-[11px] text-slate-400">
                          {fmt.int(row.orders)} orders · AOV {fmt.money(row.aov)}
                          {row.partial && <span className="block text-amber-300">Partial month (to 9 Dec)</span>}
                        </p>
                      )
                    }}
                  />
                )}
              />
              <Bar isAnimationActive={false} dataKey="revenue" name="Revenue" radius={[4, 4, 0, 0]} maxBarSize={44}>
                {data.map((p) => (
                  <Cell
                    key={p.month}
                    fill={SERIES[0]}
                    fillOpacity={p.inRange ? (p.partial ? 0.45 : 1) : 0.22}
                    stroke={p.partial ? SERIES[0] : undefined}
                    strokeDasharray={p.partial ? '3 3' : undefined}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}

function BreakdownCard({ cube, filters, onFilters, className }: { cube: Cube; filters: Filters; onFilters: (f: Filters) => void; className?: string }) {
  const [by, setBy] = useState<'country' | 'category'>('category')
  const rows = useMemo(() => breakdown(cube, filters, by), [cube, filters, by])
  const total = rows.reduce((s, r) => s + r.revenue, 0)
  // Categories are few, so show them all; countries fold into "Rest of world" after the top 9.
  const keep = by === 'category' ? rows.length : 9
  const top = rows.slice(0, keep)
  const rest = rows.slice(keep).reduce((s, r) => s + r.revenue, 0)
  const data = [
    ...top.map((r) => ({ ...r, share: r.revenue / total })),
    ...(rest > 0 ? [{ index: -1, name: `Rest of world (${rows.length - keep})`, revenue: rest, orders: 0, share: rest / total }] : []),
  ]
  const selected = by === 'country' ? filters.country : filters.category
  return (
    <Card
      className={className}
      title={`Revenue by ${by}`}
      subtitle="Click a bar to filter the page by it."
      actions={
        <Segmented
          label="Break down by"
          value={by}
          onChange={setBy}
          options={[
            { value: 'category', label: 'Category' },
            { value: 'country', label: 'Country' },
          ]}
        />
      }
      footnote={by === 'country' ? 'The United Kingdom is about 85% of revenue. Pick a country in the filter to see its own trend and KPIs.' : 'Categories come from ordered keyword rules on product descriptions (see Methodology).'}
    >
      {!data.length ? (
        <p className="py-16 text-center text-sm text-slate-500">No sales for this combination of filters.</p>
      ) : (
        <div style={{ height: Math.max(180, data.length * 30 + 20) }} role="img" aria-label={`Horizontal bar chart of revenue by ${by}`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 48, left: 0, bottom: 0 }} barCategoryGap={4}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" {...axisProps} axisLine={false} width={142} tick={{ fill: C.ink, fontSize: 11 }} />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                content={({ active, payload, label }) => (
                  <ChartTooltip
                    active={active}
                    payload={payload}
                    label={label}
                    valueFormat={(v, item) => `${fmt.money(v)} (${fmt.pct((item.payload as { share: number }).share)})`}
                  />
                )}
              />
              <Bar
                isAnimationActive={false}
                dataKey="revenue"
                name="Revenue"
                radius={[0, 4, 4, 0]}
                cursor="pointer"
                label={{ position: 'right', fill: C.ink, fontSize: 11, formatter: (v: unknown) => fmt.moneyCompact(Number(v)) }}
                onClick={(entry: unknown) => {
                  const idx = (entry as { index?: number; payload?: { index: number } }).payload?.index
                  if (idx === undefined || idx < 0) return
                  onFilters(by === 'country' ? { ...filters, country: selected === idx ? 0 : idx } : { ...filters, category: selected === idx ? 0 : idx })
                }}
              >
                {data.map((r) => (
                  <Cell key={r.name} fill={r.index === -1 ? C.muted : SERIES[0]} fillOpacity={selected && r.index !== selected ? 0.4 : 1} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}

function ForecastCard({ f, className }: { f: Forecast; className?: string }) {
  const [view, setView] = useState<'daily' | 'weekly'>('daily')
  const hw = f.models.find((m) => m.key === 'hw')!
  const holdoutDays = Math.round((Date.parse(f.holdout_end) - Date.parse(f.holdout_start)) / 86_400_000) + 1
  const naive = f.models.find((m) => m.key === 'naive')!
  const ma4 = f.models.find((m) => m.key === 'ma4')!
  const daily = f.daily.map((r) => ({
    ...r,
    band80: r.lo80 !== undefined && r.hi80 !== undefined ? [r.lo80, r.hi80] : undefined,
    band95: r.lo95 !== undefined && r.hi95 !== undefined ? [r.lo95, r.hi95] : undefined,
  }))
  const weekly = f.weekly.filter((w) => w.week >= '2011-06-01')
  const cols: Column<ForecastModel>[] = [
    { key: 'model', header: 'Model', value: (r) => r.model, sortable: false },
    { key: 'mape_weekly', header: 'Weekly MAPE', value: (r) => r.mape_weekly, render: (r) => fmt.pct(r.mape_weekly), align: 'right' },
    { key: 'mape_daily', header: 'Daily MAPE', value: (r) => r.mape_daily, render: (r) => fmt.pct(r.mape_daily), align: 'right' },
    { key: 'wape_daily', header: 'WAPE', value: (r) => r.wape_daily, render: (r) => fmt.pct(r.wape_daily), align: 'right' },
    { key: 'bias', header: 'Bias', value: (r) => r.bias, render: (r) => fmt.signedPct(r.bias), align: 'right' },
  ]
  return (
    <Card
      className={className}
      title="Revenue forecast · Holt-Winters with 80% / 95% prediction intervals"
      subtitle={`Trained ${dateLabel(f.train_start, true)} – ${dateLabel(f.train_end)}, back-tested on the ${holdoutDays}-day holdout, then refit to forecast the ${f.horizon_days} days to the Christmas shutdown.`}
      actions={
        <Segmented
          label="Granularity"
          value={view}
          onChange={setView}
          options={[
            { value: 'daily', label: 'Daily' },
            { value: 'weekly', label: 'Weekly' },
          ]}
        />
      }
    >
      <Legend>
        <LegendItem color={C.ink} label="Actual" />
        <LegendItem color={SERIES[1]} label="Holdout forecast" dashed />
        <LegendItem color={SERIES[0]} label="Forward forecast" />
        {view === 'daily' && <LegendItem color={SERIES[0]} label="80% / 95% interval" band />}
      </Legend>
      <div className="h-72" role="img" aria-label="Line chart of actual daily revenue with back-test and forward forecast">
        <ResponsiveContainer width="100%" height="100%">
          {view === 'daily' ? (
            <ComposedChart data={daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={C.grid} vertical={false} />
              <XAxis dataKey="date" {...axisProps} tickFormatter={(v: string) => dateLabel(v, true)} minTickGap={36} />
              <YAxis {...axisProps} axisLine={false} width={56} tickFormatter={(v: number) => fmt.moneyCompact(v)} />
              <ReferenceArea x1={f.holdout_start} x2={f.holdout_end} fill="#ffffff" fillOpacity={0.03} label={{ value: 'Holdout', fill: C.muted, fontSize: 11, position: 'insideTopLeft' }} />
              <Tooltip
                content={({ active, payload, label }) => (
                  <ChartTooltip active={active} payload={payload} label={label} labelFormat={(l) => dateLabel(String(l))} valueFormat={(v) => fmt.money(v)} />
                )}
              />
              <Area dataKey="band95" name="95% interval" stroke="none" fill={SERIES[0]} fillOpacity={0.14} isAnimationActive={false} />
              <Area dataKey="band80" name="80% interval" stroke="none" fill={SERIES[0]} fillOpacity={0.24} isAnimationActive={false} />
              <Line dataKey="actual" name="Actual" stroke={C.ink} strokeWidth={1.5} dot={false} isAnimationActive={false} />
              <Line dataKey="hw" name="Holdout forecast" stroke={SERIES[1]} strokeWidth={2} strokeDasharray="5 3" dot={false} isAnimationActive={false} />
              <Line dataKey="forecast" name="Forward forecast" stroke={SERIES[0]} strokeWidth={2} dot={{ r: 2.5, fill: SERIES[0] }} isAnimationActive={false} />
            </ComposedChart>
          ) : (
            <ComposedChart data={weekly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={C.grid} vertical={false} />
              <XAxis dataKey="week" {...axisProps} tickFormatter={(v: string) => dateLabel(v, true)} minTickGap={36} />
              <YAxis {...axisProps} axisLine={false} width={56} tickFormatter={(v: number) => fmt.moneyCompact(v)} />
              <Tooltip
                content={({ active, payload, label }) => (
                  <ChartTooltip active={active} payload={payload} label={label} labelFormat={(l) => `Week ending ${dateLabel(String(l))}`} valueFormat={(v) => fmt.money(v)} />
                )}
              />
              <ReferenceLine x={weekly.find((w) => w.hw !== undefined)?.week} stroke={C.muted} strokeDasharray="2 4" />
              <Line dataKey="actual" name="Actual" stroke={C.ink} strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line dataKey="hw" name="Holdout forecast" stroke={SERIES[1]} strokeWidth={2} strokeDasharray="5 3" dot={{ r: 3 }} isAnimationActive={false} />
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <Callout tone="warn" title={`Back-test: ${fmt.pct(hw.mape_weekly)} weekly MAPE, ${fmt.signedPct(hw.bias)} bias`}>
          Holt-Winters beats the seasonal-naive baseline ({fmt.pct(naive.mape_weekly)}) and is level with a simple 4-week average ({fmt.pct(ma4.mape_weekly)}), but
          every model under-forecasts the November peak: with under a year of history, no univariate model can learn the Q4 ramp. The 80% interval covered only {fmt.pct(f.interval_coverage_80, 0)} of holdout days.
        </Callout>
        <Callout title={`Next ${f.horizon_days} days: ${fmt.moneyCompact(f.forecast_total)} (80% PI ${fmt.moneyCompact(f.forecast_total_lo80)} – ${fmt.moneyCompact(f.forecast_total_hi80)})`}>
          The model carries the November level forward. Last year the same fortnight brought {fmt.moneyCompact(f.same_period_last_year)}; scaled by the
          like-for-like December growth ({fmt.signedPct(f.yoy_growth_lfl)}) that suggests ≈{fmt.moneyCompact(f.yoy_anchored_total)}. Plan to the YoY anchor; the
          model is the upside case.
        </Callout>
      </div>
      <div className="mt-4">
        <DataTable rows={f.models} columns={cols} caption="Forecast model comparison on the holdout" dense csvName="forecast-backtest" />
      </div>
    </Card>
  )
}

function WeekdayHourCard({ monthly, className }: { monthly: Monthly; className?: string }) {
  const days = [...new Map(monthly.weekday_hour.map((r) => [r.day_of_week, r.day_name])).entries()].sort((a, b) => a[0] - b[0])
  const hours = [...new Set(monthly.weekday_hour.map((r) => r.hour))].sort((a, b) => a - b).filter((h) => h >= 7 && h <= 20)
  const lookup = new Map(monthly.weekday_hour.map((r) => [`${r.day_of_week}-${r.hour}`, r]))
  const max = Math.max(...monthly.weekday_hour.map((r) => r.revenue))
  return (
    <Card
      className={className}
      title="When orders arrive"
      subtitle="Revenue by weekday and hour, full period (UK time)."
      footnote="No trading on Saturdays at all: this is a B2B wholesaler whose buyers order during office hours, peaking around noon on weekdays."
    >
      <Heatmap
        caption="Revenue by weekday and hour"
        rowHeader="Day"
        rows={days.map(([d, name]) => ({ key: String(d), label: name.slice(0, 3) }))}
        cols={hours.map((h) => ({ key: String(h), label: h }))}
        value={(ri, ci) => lookup.get(`${days[ri][0]}-${hours[ci]}`)?.revenue ?? 0}
        color={(v) => (v === 0 ? 'rgba(255,255,255,0.03)' : rampColor(Math.sqrt(v / max)))}
        describe={(ri, ci, v) => {
          const r = lookup.get(`${days[ri][0]}-${hours[ci]}`)
          return `${days[ri][1]} ${hours[ci]}:00–${hours[ci] + 1}:00: ${fmt.money(v)} from ${fmt.int(r?.orders ?? 0)} orders`
        }}
        minCell={22}
        legend={<RampLegend colors={BLUE_RAMP} min="£0" max={fmt.moneyCompact(max)} />}
      />
      <p className="eyebrow mt-6 mb-2">Top markets, full period</p>
      <DataTable
        caption="Revenue by country"
        dense
        pageSize={8}
        csvName="country-summary"
        rows={monthly.countries}
        initialSort={{ key: 'revenue', dir: 'desc' }}
        columns={[
          { key: 'country', header: 'Country', value: (r) => r.country, className: 'text-white' },
          { key: 'revenue', header: 'Revenue', value: (r) => r.revenue, render: (r) => fmt.moneyCompact(r.revenue), align: 'right' },
          { key: 'share', header: 'Share', value: (r) => r.revenue_share, render: (r) => fmt.pct(r.revenue_share), align: 'right' },
          { key: 'customers', header: 'Customers', value: (r) => r.customers, render: (r) => fmt.int(r.customers), align: 'right' },
          { key: 'aov', header: 'AOV', value: (r) => r.aov, render: (r) => fmt.money(r.aov), align: 'right' },
        ]}
      />
    </Card>
  )
}
