import { CheckCircle2, FlaskConical, XCircle } from 'lucide-react'
import { Area, CartesianGrid, ComposedChart, Line, LineChart, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartTooltip } from '../components/ChartTooltip.tsx'
import { DataTable } from '../components/DataTable.tsx'
import { Callout, Card, ErrorState, KpiTile, Legend, LegendItem, Loading, PageIntro, Stat } from '../components/ui.tsx'
import { useData } from '../lib/data.ts'
import { dateLabel, fmt } from '../lib/format.ts'
import { axisProps, C, SERIES } from '../lib/theme.ts'
import type { Experiment } from '../lib/types.ts'

export default function ExperimentPage() {
  const s = useData('experiment')
  if (s.status === 'loading') return <Loading />
  if (s.status === 'error') return <ErrorState message={s.error} onRetry={s.retry} />
  const e = s.data.experiment
  const conv = e.conversion
  const ship = e.decision.startsWith('Ship')

  return (
    <>
      <PageIntro eyebrow="Experiment readout" title={e.name}>
        A 50/50 visitor-level test run {dateLabel(e.start)} – {dateLabel(e.end)}. The public dataset contains no experiment, so this one is{' '}
        <strong className="text-amber-200">simulated</strong> (seeded, reproducible) on top of the real order-value distribution, with a known planted effect
        so the analysis can be checked against ground truth.
      </PageIntro>

      <div className={`card mb-5 flex flex-wrap items-center gap-4 border-l-4 p-4 ${ship ? 'border-l-emerald-500' : 'border-l-amber-400'}`}>
        {ship ? <CheckCircle2 className="size-7 text-emerald-400" aria-hidden /> : <XCircle className="size-7 text-amber-300" aria-hidden />}
        <div className="min-w-0 flex-1">
          <p className="eyebrow">Recommendation</p>
          <p className="text-lg font-semibold text-white">{e.decision}</p>
          <p className="text-sm text-slate-400">
            Conversion {fmt.signedPct(conv.rel_lift)} (95% CI {fmt.signedPct(conv.rel_ci_low)} to {fmt.signedPct(conv.rel_ci_high)}, p = {fmt.pValue(conv.p_value)}),
            sample ratio healthy, AOV guardrail not breached. The win is concentrated on mobile.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KpiTile label="Control conversion" value={fmt.pct(conv.p_control, 2)} deltaLabel={`${fmt.int(e.arms.control.orders)} / ${fmt.int(e.arms.control.visitors)}`} />
        <KpiTile label="Treatment conversion" value={fmt.pct(conv.p_treatment, 2)} deltaLabel={`${fmt.int(e.arms.treatment.orders)} / ${fmt.int(e.arms.treatment.visitors)}`} />
        <KpiTile label="Absolute lift" value={fmt.pp(conv.diff)} deltaLabel={`95% CI ${fmt.pp(conv.ci_low)} to ${fmt.pp(conv.ci_high)}`} />
        <KpiTile label="z-test p-value" value={fmt.pValue(conv.p_value)} deltaLabel={`z = ${fmt.num(conv.z, 2)}, α = ${e.pre_registration.alpha}`} />
        <KpiTile
          label="Sample ratio check"
          value={e.srm.passed ? 'Pass' : 'Fail'}
          deltaLabel={`χ² p = ${fmt.num(e.srm.p_value, 3)} (${fmt.pct(e.srm.observed_share, 2)} control)`}
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-5">
        <ForestCard className="xl:col-span-3" e={e} />
        <PreRegCard className="xl:col-span-2" e={e} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <TrajectoryCard e={e} />
        <PowerCard e={e} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-5">
        <ArmsCard className="xl:col-span-3" e={e} />
        <TruthCard className="xl:col-span-2" e={e} />
      </div>
    </>
  )
}

interface ForestRow {
  label: string
  sub: string
  est: number
  lo: number
  hi: number
  primary?: boolean
}

function ForestCard({ e, className }: { e: Experiment; className?: string }) {
  const rows: ForestRow[] = [
    { label: 'Conversion rate', sub: 'primary · z-test', est: e.conversion.rel_lift, lo: e.conversion.rel_ci_low, hi: e.conversion.rel_ci_high, primary: true },
    ...e.by_device.map((d) => ({
      label: `· ${d.device[0].toUpperCase()}${d.device.slice(1)}`,
      sub: `p = ${fmt.pValue(d.p_value)}`,
      est: d.rel_lift,
      lo: d.rel_ci_low,
      hi: d.rel_ci_high,
    })),
    { label: 'Revenue / visitor', sub: 'bootstrap', est: e.rpv.rel_diff, lo: e.rpv.rel_ci_low, hi: e.rpv.rel_ci_high },
    {
      label: 'Avg order value',
      sub: `guardrail · Welch p = ${fmt.num(e.aov.p_value, 3)}`,
      est: e.aov.rel_diff,
      lo: e.aov.boot_ci_low / e.aov.mean_control,
      hi: e.aov.boot_ci_high / e.aov.mean_control,
    },
  ]
  const min = Math.min(-0.1, ...rows.map((r) => r.lo))
  const max = Math.max(0.1, ...rows.map((r) => r.hi))
  const pad = (max - min) * 0.05
  const lo = min - pad
  const hi = max + pad
  const W = 600
  const rowH = 40
  const left = 150
  const right = 160
  const plotW = W - left - right
  const x = (v: number) => left + ((v - lo) / (hi - lo)) * plotW
  const H = rows.length * rowH + 30
  const ticks = [-0.2, 0, 0.2, 0.4, 0.6].filter((t) => t >= lo && t <= hi)
  return (
    <Card
      className={className}
      title="Effect sizes with 95% confidence intervals"
      subtitle="Relative change, treatment vs control. Intervals crossing 0% are not statistically significant."
      footnote="Order value has a heavy right tail (wholesale baskets), so the AOV and revenue-per-visitor intervals are percentile bootstraps (4,000 resamples) rather than normal approximations. Device splits are exploratory: no multiplicity correction."
    >
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[520px]" role="img" aria-label="Forest plot of relative effects with confidence intervals">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={x(t)} x2={x(t)} y1={6} y2={H - 22} stroke={t === 0 ? '#64748b' : C.grid} strokeDasharray={t === 0 ? undefined : '3 4'} />
              <text x={x(t)} y={H - 6} textAnchor="middle" fontSize="11" fill={C.ink}>
                {fmt.signedPct(t, 0)}
              </text>
            </g>
          ))}
          {rows.map((r, i) => {
            const y = 10 + i * rowH + rowH / 2
            const sig = r.lo > 0 || r.hi < 0
            const color = sig ? SERIES[0] : '#94a3b8'
            return (
              <g key={r.label}>
                <title>{`${r.label}: ${fmt.signedPct(r.est)} (95% CI ${fmt.signedPct(r.lo)} to ${fmt.signedPct(r.hi)})`}</title>
                <text x={0} y={y - 2} fontSize="12.5" fill={C.text} fontWeight={r.primary ? 600 : 400}>
                  {r.label}
                </text>
                <text x={0} y={y + 13} fontSize="10.5" fill={C.muted}>
                  {r.sub}
                </text>
                <line x1={x(r.lo)} x2={x(r.hi)} y1={y} y2={y} stroke={color} strokeWidth={2} strokeLinecap="round" />
                <line x1={x(r.lo)} x2={x(r.lo)} y1={y - 5} y2={y + 5} stroke={color} strokeWidth={2} />
                <line x1={x(r.hi)} x2={x(r.hi)} y1={y - 5} y2={y + 5} stroke={color} strokeWidth={2} />
                <rect x={x(r.est) - 5} y={y - 5} width={10} height={10} rx={2} fill={color} stroke={C.surface} strokeWidth={2} />
                <text x={W - right + 12} y={y + 4} fontSize="12" fill={C.text} className="num">
                  {fmt.signedPct(r.est)}
                  <tspan fill={C.muted} fontSize="10.5">{` [${fmt.signedPct(r.lo, 0)}, ${fmt.signedPct(r.hi, 0)}]`}</tspan>
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </Card>
  )
}

function PreRegCard({ e, className }: { e: Experiment; className?: string }) {
  const pr = e.pre_registration
  const n = Math.min(e.arms.control.visitors, e.arms.treatment.visitors)
  return (
    <Card className={className} title="Pre-registered design" subtitle={pr.hypothesis}>
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Primary metric" value={<span className="text-sm">Conversion</span>} sub="orders / visitors" />
        <Stat label="Baseline / MDE" value={`${fmt.pct(pr.baseline_cvr, 1)} / ${fmt.signedPct(pr.mde_relative, 0)}`} sub="relative MDE" />
        <Stat label="α / power" value={`${pr.alpha} / ${fmt.pct(pr.power, 0)}`} sub="two-sided" />
        <Stat label="Required per arm" value={fmt.int(pr.required_n_per_arm)} sub={`achieved ${fmt.int(n)} (${fmt.pct(n / pr.required_n_per_arm, 0)})`} />
      </div>
      <div className="mt-4">
        <Callout tone="good" title="Validity checks">
          <ul className="list-disc space-y-1 pl-4">
            <li>
              SRM χ² p = {fmt.num(e.srm.p_value, 3)} ≥ 0.001: the {fmt.pct(e.srm.observed_share, 2)} / {fmt.pct(1 - e.srm.observed_share, 2)} split is consistent with 50/50.
            </li>
            <li>Ran the full {pr.planned_days} planned days (4 complete weeks), so weekday effects are balanced.</li>
            <li>Decision rule fixed in advance: no early stopping on the daily p-value.</li>
          </ul>
        </Callout>
      </div>
    </Card>
  )
}

function TrajectoryCard({ e }: { e: Experiment }) {
  const data = e.daily.map((d) => ({ ...d, band: [d.rel_ci_low, d.rel_ci_high] as [number, number] }))
  const firstSig = e.daily.find((d) => d.p_value < 0.05)
  const week1 = e.daily.slice(0, 7).map((d) => d.rel_lift)
  const early = { min: Math.min(...week1), max: Math.max(...week1) }
  return (
    <Card
      title="Cumulative lift over time"
      subtitle="The estimate and its 95% CI as data accumulated."
      footnote={
        firstSig
          ? `The interval first excluded zero on ${dateLabel(firstSig.date)}, but in the first week the estimate swung between ${fmt.signedPct(early.min, 0)} and ${fmt.signedPct(early.max, 0)}. Stopping at the first significant peek inflates false positives, which is why the test ran its pre-registered length.`
          : 'Early estimates swing widely; the test ran its pre-registered length rather than stopping at the first significant peek.'
      }
    >
      <Legend>
        <LegendItem color={SERIES[0]} label="Cumulative relative lift" />
        <LegendItem color={SERIES[0]} label="95% CI" band />
      </Legend>
      <div className="h-64" role="img" aria-label="Line chart of cumulative conversion lift with confidence band by day">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={C.grid} vertical={false} />
            <XAxis dataKey="date" {...axisProps} tickFormatter={(v: string) => dateLabel(v, true)} minTickGap={24} />
            <YAxis {...axisProps} axisLine={false} width={48} tickFormatter={(v: number) => fmt.signedPct(v, 0)} />
            <ReferenceLine y={0} stroke="#64748b" />
            <Tooltip
              content={({ active, payload, label }) => (
                <ChartTooltip
                  active={active}
                  payload={payload}
                  label={label}
                  labelFormat={(l) => dateLabel(String(l))}
                  valueFormat={(v) => fmt.signedPct(v)}
                  extra={(p) => {
                    const row = p[0]?.payload as (typeof data)[number] | undefined
                    return row ? <p className="mt-1 text-[11px] text-slate-500">p = {fmt.pValue(row.p_value)} · {fmt.int(row.visitors)} visitors</p> : null
                  }}
                />
              )}
            />
            <Area dataKey="band" name="95% CI" stroke="none" fill={SERIES[0]} fillOpacity={0.2} isAnimationActive={false} />
            <Line dataKey="rel_lift" name="Lift" stroke={SERIES[0]} strokeWidth={2} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

function PowerCard({ e }: { e: Experiment }) {
  const pw = e.power
  return (
    <Card
      title="Power curve at the achieved sample size"
      subtitle={`n = ${fmt.int(pw.n_per_arm)} per arm, baseline ${fmt.pct(e.conversion.p_control, 2)}, α = ${e.pre_registration.alpha}.`}
      footnote={`Minimum detectable effect at 80% power: ${fmt.signedPct(pw.achieved_mde_relative)}. A true lift of the observed size would be detected ${fmt.pct(pw.observed_effect_power, 0)} of the time. Smaller effects, like the planted +8% on desktop, are below this test's resolution: a null result there is "not detected", not "no effect".`}
    >
      <div className="h-64" role="img" aria-label="Power as a function of true relative lift">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={pw.curve} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
            <CartesianGrid stroke={C.grid} vertical={false} />
            <XAxis
              type="number"
              dataKey="lift"
              domain={[0, 0.4]}
              {...axisProps}
              tickFormatter={(v: number) => fmt.signedPct(v, 0)}
              label={{ value: 'True relative lift', fill: C.muted, fontSize: 11, position: 'insideBottom', offset: -4 }}
            />
            <YAxis domain={[0, 1]} {...axisProps} axisLine={false} width={44} tickFormatter={(v: number) => fmt.pct(v, 0)} />
            <ReferenceLine y={0.8} stroke={C.muted} strokeDasharray="4 4" label={{ value: '80% power', fill: C.ink, fontSize: 11, position: 'insideTopLeft' }} />
            <Tooltip
              content={({ active, payload, label }) => (
                <ChartTooltip active={active} payload={payload} label={label} labelFormat={(l) => `True lift ${fmt.signedPct(Number(l), 0)}`} valueFormat={(v) => fmt.pct(v, 1)} />
              )}
            />
            <Line dataKey="power" name="Power" stroke={SERIES[0]} strokeWidth={2} dot={false} isAnimationActive={false} type="monotone" />
            <ReferenceDot x={pw.achieved_mde_relative} y={0.8} r={5} fill={SERIES[1]} stroke={C.surface} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

function ArmsCard({ e, className }: { e: Experiment; className?: string }) {
  const rows = (['control', 'treatment'] as const).map((k) => ({ arm: k, ...e.arms[k] }))
  return (
    <Card className={className} title="Results by arm">
      <DataTable
        caption="Experiment results by arm"
        csvName="experiment-arms"
        rows={rows}
        columns={[
          { key: 'arm', header: 'Arm', value: (r) => r.arm, render: (r) => <span className="font-medium text-white capitalize">{r.arm}</span>, sortable: false },
          { key: 'v', header: 'Visitors', value: (r) => r.visitors, render: (r) => fmt.int(r.visitors), align: 'right' },
          { key: 'o', header: 'Orders', value: (r) => r.orders, render: (r) => fmt.int(r.orders), align: 'right' },
          { key: 'cvr', header: 'Conversion', value: (r) => r.cvr, render: (r) => fmt.pct(r.cvr, 2), align: 'right' },
          { key: 'aov', header: 'AOV', value: (r) => r.aov, render: (r) => fmt.money(r.aov), align: 'right' },
          { key: 'med', header: 'Median order', value: (r) => r.median_order, render: (r) => fmt.money(r.median_order), align: 'right' },
          { key: 'rpv', header: 'Rev / visitor', value: (r) => r.rpv, render: (r) => fmt.money2(r.rpv), align: 'right' },
        ]}
      />
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Callout title={`AOV ${fmt.signedPct(e.aov.rel_diff)} is ${e.aov.p_value < 0.05 ? 'statistically significant' : 'within noise'}`}>
          Welch t-test p = {fmt.num(e.aov.p_value, 3)}; the bootstrap CI for the difference is {fmt.money(e.aov.boot_ci_low)} to {fmt.money(e.aov.boot_ci_high)}.
          The medians differ by only {fmt.money(e.aov.median_diff)}: the gap in means comes from a handful of very large wholesale orders.
        </Callout>
        <Callout tone="warn" title="Revenue per visitor is too noisy to read directly">
          RPV moved {fmt.signedPct(e.rpv.rel_diff)} (95% CI {fmt.signedPct(e.rpv.rel_ci_low, 0)} to {fmt.signedPct(e.rpv.rel_ci_high, 0)}): heavy-tailed order values swamp the
          conversion signal at this sample size. For the business case use the conversion lift × the pre-test AOV: about {fmt.signedPct(e.conversion.rel_lift, 0)} revenue
          per visitor.
        </Callout>
      </div>
    </Card>
  )
}

function TruthCard({ e, className }: { e: Experiment; className?: string }) {
  const t = e.planted_truth
  const dev = (name: string) => e.by_device.find((d) => d.device === name)
  const covers = (name: string, truth: number) => {
    const d = dev(name)
    return !!d && d.rel_ci_low <= truth && truth <= d.rel_ci_high
  }
  const allCovered = covers('mobile', t.mobile_lift) && covers('desktop', t.desktop_lift)
  return (
    <Card className={className} title="Ground truth check" subtitle="Because the data is simulated, we know the real effects.">
      <div className="space-y-2.5 text-sm">
        {[
          { label: 'Mobile conversion', truth: t.mobile_lift, est: dev('mobile') },
          { label: 'Desktop conversion', truth: t.desktop_lift, est: dev('desktop') },
        ].map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-slate-950/40 p-3">
            <span className="flex items-center gap-2 text-slate-300">
              <FlaskConical className="size-4 text-sky-400" aria-hidden />
              {r.label}
            </span>
            <span className="num text-right text-xs text-slate-400">
              planted <strong className="text-white">{fmt.signedPct(r.truth, 0)}</strong> · estimated{' '}
              <strong className="text-white">{fmt.signedPct(r.est?.rel_lift)}</strong>
              <br />
              CI {fmt.signedPct(r.est?.rel_ci_low, 0)} to {fmt.signedPct(r.est?.rel_ci_high, 0)} {r.est && r.est.rel_ci_low <= r.truth && r.truth <= r.est.rel_ci_high ? '✓ covers truth' : '✗ misses truth'}
            </span>
          </div>
        ))}
        <div className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-slate-950/40 p-3">
          <span className="flex items-center gap-2 text-slate-300">
            <FlaskConical className="size-4 text-sky-400" aria-hidden />
            Average order value
          </span>
          <span className="num text-right text-xs text-slate-400">
            planted <strong className="text-white">±0%</strong> · estimated <strong className="text-white">{fmt.signedPct(e.aov.rel_diff)}</strong>
            <br />
            Welch p = {fmt.num(e.aov.p_value, 3)} {e.aov.p_value >= 0.05 ? '✓ no false alarm' : '✗ false positive'}
          </span>
        </div>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-slate-500">
        {allCovered ? 'Both device CIs contain the true effect.' : 'Not every device CI contains the true effect, as happens 5% of the time at 95% confidence.'} The desktop
        effect is real but small relative to this test's MDE, so it is not reliably detected: exactly what the power curve predicts.
      </p>
    </Card>
  )
}
