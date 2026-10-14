import { useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartTooltip } from '../components/ChartTooltip.tsx'
import { DataTable, type Column } from '../components/DataTable.tsx'
import { FilterBar } from '../components/FilterBar.tsx'
import { Card, ErrorState, KpiTile, Loading, PageIntro, Segmented } from '../components/ui.tsx'
import { breakdown, type Filters } from '../lib/cube.ts'
import { useData } from '../lib/data.ts'
import { fmt, monthLabel } from '../lib/format.ts'
import { axisProps, C, SERIES } from '../lib/theme.ts'
import type { BasketPair, Cube, Products, TopProduct } from '../lib/types.ts'

const ABC_COLOR: Record<string, string> = { A: SERIES[0], B: SERIES[2], C: '#64748b' }

export default function ProductsPage({
  cube,
  filters,
  defaults,
  onFilters,
}: {
  cube: Cube
  filters: Filters
  defaults: Filters
  onFilters: (f: Filters) => void
}) {
  const s = useData('products')
  if (s.status === 'loading') return <Loading />
  if (s.status === 'error') return <ErrorState message={s.error} onRetry={s.retry} />
  const p = s.data.products
  const a = p.abc.find((x) => x.abc_class === 'A')

  return (
    <>
      <PageIntro eyebrow="Products" title="Which products drive revenue, and what sells together?">
        {fmt.int(p.n_products)} SKUs sold in the period. Pareto/ABC uses window functions over product revenue; basket analysis self-joins{' '}
        {fmt.int(p.basket.n_baskets)} invoices to find pairs bought together more often than chance.
      </PageIntro>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile label="Top 1% of SKUs" value={fmt.pct(p.top_share['0.01'])} deltaLabel="of revenue" />
        <KpiTile label="Top 20% of SKUs" value={fmt.pct(p.top_share['0.2'])} deltaLabel="of revenue: a classic 80/20" />
        <KpiTile label="A-class SKUs" value={fmt.int(a?.products)} deltaLabel={`${fmt.pct(a?.product_share)} of SKUs → 80% of revenue`} />
        <KpiTile label="Frequent pairs (≥1% support)" value={fmt.int(p.basket.n_pairs)} deltaLabel={`from ${fmt.int(p.basket.n_baskets)} baskets`} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-5">
        <ParetoCard className="xl:col-span-3" p={p} />
        <AbcCard className="xl:col-span-2" p={p} />
      </div>

      <div className="mt-8">
        <FilterBar
          cube={cube}
          filters={filters}
          defaults={defaults}
          onChange={onFilters}
          scope="Filters apply to the category table below. Pareto, top products and baskets cover the full period."
        />
        <CategoryCard cube={cube} filters={filters} p={p} />
      </div>

      <div className="mt-5">
        <TopProductsCard p={p} />
      </div>
      <div className="mt-5">
        <BasketCard p={p} />
      </div>
    </>
  )
}

function ParetoCard({ p, className }: { p: Products; className?: string }) {
  const data = p.pareto_curve.map((d) => ({ x: d.cum_product_share, y: d.cum_revenue_share }))
  const aShare = p.abc.find((x) => x.abc_class === 'A')?.product_share ?? 0
  return (
    <Card
      className={className}
      title="Pareto curve: cumulative revenue vs share of SKUs"
      subtitle="Products sorted by revenue, highest first."
      footnote="The long tail matters operationally: C-class SKUs are about half the range but 5% of revenue. They're candidates for range rationalisation or made-to-order, not for promotional spend."
    >
      <div className="h-72" role="img" aria-label="Pareto curve of cumulative revenue share against cumulative share of products">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
            <CartesianGrid stroke={C.grid} />
            <XAxis
              type="number"
              dataKey="x"
              domain={[0, 1]}
              ticks={[0, 0.2, 0.4, 0.6, 0.8, 1]}
              {...axisProps}
              tickFormatter={(v: number) => fmt.pct(v, 0)}
              label={{ value: 'Share of SKUs', fill: C.muted, fontSize: 11, position: 'insideBottom', offset: -4 }}
            />
            <YAxis domain={[0, 1]} ticks={[0, 0.2, 0.4, 0.6, 0.8, 1]} {...axisProps} axisLine={false} width={44} tickFormatter={(v: number) => fmt.pct(v, 0)} />
            <Tooltip
              content={({ active, payload, label }) => (
                <ChartTooltip
                  active={active}
                  payload={payload}
                  label={label}
                  labelFormat={(l) => `Top ${fmt.pct(Number(l))} of SKUs`}
                  valueFormat={(v) => `${fmt.pct(v)} of revenue`}
                />
              )}
            />
            <ReferenceLine y={0.8} stroke={C.muted} strokeDasharray="4 4" label={{ value: '80% of revenue', fill: C.ink, fontSize: 11, position: 'insideBottomRight' }} />
            <ReferenceLine x={aShare} stroke={C.muted} strokeDasharray="4 4" />
            <ReferenceDot x={aShare} y={0.8} r={5} fill={SERIES[0]} stroke={C.surface} strokeWidth={2} />
            <Area type="monotone" dataKey="y" name="Cumulative revenue" stroke={SERIES[0]} strokeWidth={2} fill={SERIES[0]} fillOpacity={0.15} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

function AbcCard({ p, className }: { p: Products; className?: string }) {
  return (
    <Card className={className} title="ABC classification" subtitle="A = first 80% of revenue, B = next 15%, C = last 5%.">
      <div className="mb-4 space-y-2.5" role="img" aria-label="Stacked comparison of SKU share and revenue share per ABC class">
        {(['products', 'revenue'] as const).map((k) => (
          <div key={k}>
            <p className="mb-1 text-[11px] text-slate-400">{k === 'products' ? 'Share of SKUs' : 'Share of revenue'}</p>
            <div className="flex h-6 gap-0.5 overflow-hidden rounded-md">
              {p.abc.map((x) => {
                const share = k === 'products' ? x.product_share : x.revenue_share
                return (
                  <div
                    key={x.abc_class}
                    className="flex items-center justify-center text-[11px] font-semibold text-white"
                    style={{ width: `${share * 100}%`, background: ABC_COLOR[x.abc_class] }}
                    title={`${x.abc_class}: ${fmt.pct(share)}`}
                  >
                    {share > 0.06 ? `${x.abc_class} ${fmt.pct(share, 0)}` : ''}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      <DataTable
        caption="ABC classes"
        dense
        csvName="abc-classes"
        rows={p.abc}
        columns={[
          { key: 'c', header: 'Class', value: (r) => r.abc_class },
          { key: 'n', header: 'SKUs', value: (r) => r.products, render: (r) => fmt.int(r.products), align: 'right' },
          { key: 'ps', header: '% SKUs', value: (r) => r.product_share, render: (r) => fmt.pct(r.product_share), align: 'right' },
          { key: 'rev', header: 'Revenue', value: (r) => r.revenue, render: (r) => fmt.moneyCompact(r.revenue), align: 'right' },
          { key: 'rs', header: '% revenue', value: (r) => r.revenue_share, render: (r) => fmt.pct(r.revenue_share), align: 'right' },
        ]}
      />
    </Card>
  )
}

interface CategoryRow {
  name: string
  revenue: number
  share: number
  orders: number
  A: number
  B: number
  C: number
}

function CategoryCard({ cube, filters, p }: { cube: Cube; filters: Filters; p: Products }) {
  const rows = useMemo<CategoryRow[]>(() => {
    const b = breakdown(cube, { ...filters, category: 0 }, 'category')
    const total = b.reduce((s, r) => s + r.revenue, 0)
    return b.map((r) => {
      const abc = p.category_abc.find((x) => x.category === r.name)
      return { name: r.name, revenue: r.revenue, share: total ? r.revenue / total : 0, orders: r.orders, A: abc?.A ?? 0, B: abc?.B ?? 0, C: abc?.C ?? 0 }
    })
  }, [cube, filters, p])
  const range = `${monthLabel(cube.months[filters.from])} – ${monthLabel(cube.months[filters.to])}`
  const country = filters.country ? cube.countries[filters.country] : 'all countries'
  const cols: Column<CategoryRow>[] = [
    {
      key: 'name',
      header: 'Category',
      value: (r) => r.name,
      render: (r) => <span className={filters.category && cube.categories[filters.category] === r.name ? 'font-semibold text-sky-300' : 'text-white'}>{r.name}</span>,
    },
    { key: 'revenue', header: 'Revenue', value: (r) => r.revenue, render: (r) => fmt.money(r.revenue), align: 'right' },
    {
      key: 'share',
      header: 'Share',
      value: (r) => r.share,
      align: 'right',
      render: (r) => (
        <span className="inline-flex items-center justify-end gap-2">
          <span className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-white/5 sm:inline-block" aria-hidden>
            <span className="block h-full rounded-full" style={{ width: `${(r.share / (rows[0]?.share || 1)) * 100}%`, background: SERIES[0] }} />
          </span>
          {fmt.pct(r.share)}
        </span>
      ),
    },
    { key: 'orders', header: 'Orders incl.', value: (r) => r.orders, render: (r) => fmt.int(r.orders), align: 'right' },
    { key: 'A', header: 'A SKUs', value: (r) => r.A, render: (r) => fmt.int(r.A), align: 'right' },
    { key: 'C', header: 'C SKUs', value: (r) => r.C, render: (r) => fmt.int(r.C), align: 'right' },
  ]
  return (
    <Card title="Category performance" subtitle={`${range} · ${country}. ABC counts are for the full period.`}>
      <DataTable rows={rows} columns={cols} caption="Category performance" initialSort={{ key: 'revenue', dir: 'desc' }} csvName="category-performance" pageSize={12} />
    </Card>
  )
}

function TopProductsCard({ p }: { p: Products }) {
  const cols: Column<TopProduct>[] = [
    { key: 'rank', header: '#', value: (r) => r.revenue_rank, align: 'right' },
    {
      key: 'desc',
      header: 'Product',
      value: (r) => r.description,
      render: (r) => (
        <span>
          <span className="text-white">{r.description}</span> <span className="font-mono text-[11px] text-slate-500">{r.stock_code}</span>
        </span>
      ),
    },
    { key: 'cat', header: 'Category', value: (r) => r.category, className: 'text-slate-400' },
    { key: 'rev', header: 'Revenue', value: (r) => r.revenue, render: (r) => fmt.money(r.revenue), align: 'right' },
    { key: 'units', header: 'Units', value: (r) => r.units, render: (r) => fmt.int(r.units), align: 'right' },
    { key: 'orders', header: 'Orders', value: (r) => r.orders, render: (r) => fmt.int(r.orders), align: 'right' },
    { key: 'cust', header: 'Customers', value: (r) => r.customers, render: (r) => fmt.int(r.customers), align: 'right' },
    { key: 'cum', header: 'Cum. share', value: (r) => r.cum_revenue_share, render: (r) => fmt.pct(r.cum_revenue_share), align: 'right' },
  ]
  return (
    <Card title="Top 60 products by revenue" subtitle="All A-class. Sort any column; export to CSV for the buying team.">
      <DataTable rows={p.top_products} columns={cols} caption="Top products by revenue" initialSort={{ key: 'rev', dir: 'desc' }} csvName="top-products" pageSize={12} />
    </Card>
  )
}

function BasketCard({ p }: { p: Products }) {
  const [mode, setMode] = useState<'all' | 'cross'>('all')
  const rows = mode === 'cross' ? p.basket.pairs.filter((r) => r.cross_category) : p.basket.pairs
  const cols: Column<BasketPair>[] = [
    { key: 'a', header: 'Product A', value: (r) => r.product_a, className: 'max-w-64 whitespace-normal text-white' },
    { key: 'b', header: 'Product B', value: (r) => r.product_b, className: 'max-w-64 whitespace-normal text-white' },
    { key: 'n', header: 'Baskets', value: (r) => r.baskets_together, render: (r) => fmt.int(r.baskets_together), align: 'right' },
    { key: 'support', header: 'Support', value: (r) => r.support, render: (r) => fmt.pct(r.support, 2), align: 'right' },
    { key: 'conf', header: 'Conf. A→B', value: (r) => r.confidence_a_to_b, render: (r) => fmt.pct(r.confidence_a_to_b, 0), align: 'right' },
    { key: 'confb', header: 'Conf. B→A', value: (r) => r.confidence_b_to_a, render: (r) => fmt.pct(r.confidence_b_to_a, 0), align: 'right' },
    {
      key: 'lift',
      header: 'Lift',
      value: (r) => r.lift,
      align: 'right',
      render: (r) => <span className={r.lift >= 10 ? 'font-semibold text-sky-300' : ''}>{fmt.num(r.lift, 1)}×</span>,
    },
  ]
  return (
    <Card
      title="Market-basket analysis: product pairs"
      subtitle={`Pairs with support ≥ ${fmt.pct(p.basket.min_support, 0)} of baskets, ranked by lift (how many times more often they co-occur than if independent).`}
      actions={
        <Segmented
          label="Pairs to show"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'all', label: 'Highest lift' },
            { value: 'cross', label: 'Cross-category' },
          ]}
        />
      }
      footnote="The highest-lift pairs are colour/design variants of the same item (herb markers, teacups, lunch bags): bundle them as sets. Cross-category pairs are the better cross-sell prompts for the product page."
    >
      <DataTable rows={rows} columns={cols} caption="Product pairs by lift" initialSort={{ key: 'lift', dir: 'desc' }} csvName={mode === 'cross' ? 'basket-pairs-cross-category' : 'basket-pairs'} pageSize={12} />
    </Card>
  )
}
