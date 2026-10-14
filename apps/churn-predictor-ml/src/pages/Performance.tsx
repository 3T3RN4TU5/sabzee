import { useMemo } from 'react'
import { RotateCcw } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ErrorBar, Legend, Line, LineChart, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Settings } from '../App.tsx'
import { Card, Slider, Stat } from '../components/ui.tsx'
import { tooltipStyle } from '../lib/chart.ts'
import type { Artefacts, Ci } from '../lib/data.ts'
import { num, pct, usd } from '../lib/format.ts'
import { averagePrecision, brier, campaignProfit, confusionAt, curves, profitCurve, rates, reliability, rocAuc, thin } from '../ml/metrics.ts'
import { FEATURE_LABELS } from '../ml/schema.ts'

const ci = (c: Ci, f: (x: number) => string = (x) => x.toFixed(3)) => `${f(c.lo)} – ${f(c.hi)}`

export function PerformancePage({ data, settings }: { data: Artefacts; settings: Settings }) {
  const { report, testPreds } = data
  const { threshold, business, role } = settings
  const col = role === 'champion' ? 1 : 2
  const y = useMemo(() => testPreds.rows.map((r) => r[0]), [testPreds])
  const monthly = useMemo(() => testPreds.rows.map((r) => r[3]), [testPreds])
  const pChamp = useMemo(() => testPreds.rows.map((r) => r[1]), [testPreds])
  const pChal = useMemo(() => testPreds.rows.map((r) => r[2]), [testPreds])
  const p = col === 1 ? pChamp : pChal
  const model = data[role]

  const live = useMemo(() => {
    const c = confusionAt(y, p, threshold)
    return { c, r: rates(c), profit: campaignProfit(y, p, monthly, threshold, business), auc: rocAuc(y, p), ap: averagePrecision(y, p), brier: brier(y, p) }
  }, [y, p, monthly, threshold, business])

  const rocPr = useMemo(() => {
    const a = curves(y, pChamp)
    const b = curves(y, pChal)
    return { champ: a, chal: b }
  }, [y, pChamp, pChal])
  const sel = role === 'champion' ? rocPr.champ : rocPr.chal
  const rocPoint = { fpr: live.r.fpr, tpr: live.r.recall }

  const profit = useMemo(() => profitCurve(y, p, monthly, business, 100), [y, p, monthly, business])
  const best = profit.reduce((a, b) => (b.profit > a.profit ? b : a), profit[0])
  const rel = useMemo(() => reliability(y, p, 10), [y, p])

  const slices = useMemo(() => {
    const defs = [
      { key: 'Gender', idx: 4, fmt: (v: string | number) => String(v) },
      { key: 'Senior citizen', idx: 5, fmt: (v: string | number) => (Number(v) === 1 ? 'Senior' : 'Non-senior') },
      { key: 'Partner', idx: 6, fmt: (v: string | number) => `Partner: ${v}` },
      { key: 'Dependents', idx: 7, fmt: (v: string | number) => `Dependents: ${v}` },
    ]
    return defs.map((d) => {
      const levels = [...new Set(testPreds.rows.map((r) => r[d.idx]))].sort()
      const groups = levels.map((lvl) => {
        const ii = testPreds.rows.flatMap((r, i) => (r[d.idx] === lvl ? [i] : []))
        const yy = ii.map((i) => y[i])
        const pp = ii.map((i) => p[i])
        const r = rates(confusionAt(yy, pp, threshold))
        return { group: d.fmt(lvl), n: ii.length, base: yy.reduce((a, b) => a + b, 0) / ii.length, meanP: pp.reduce((a, b) => a + b, 0) / ii.length, auc: rocAuc(yy, pp), ...r }
      })
      const tprs = groups.map((g) => g.recall)
      const flags = groups.map((g) => g.flagRate)
      return { key: d.key, groups, eoGap: Math.max(...tprs) - Math.min(...tprs), dpGap: Math.max(...flags) - Math.min(...flags) }
    })
  }, [testPreds, y, p, threshold])

  const boot = report.test.bootstrap
  const cvRows = Object.entries(report.cv.results)
  const importance = report.importance.features.slice(0, 12).map((f) => ({ ...f, label: FEATURE_LABELS[f.feature] ?? f.feature, err: f.std }))

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Test ROC-AUC" value={boot.roc_auc.estimate.toFixed(3)} sub={`95% CI ${ci(boot.roc_auc)}`} />
        <Stat label="Test PR-AUC" value={boot.pr_auc.estimate.toFixed(3)} sub={`95% CI ${ci(boot.pr_auc)} · base ${pct(report.data.test_churn_rate)}`} />
        <Stat label="Brier score" value={boot.brier.estimate.toFixed(3)} sub={`95% CI ${ci(boot.brier)}`} />
        <Stat label={`Recall @ ${pct(report.business.threshold)}`} value={pct(boot.recall.estimate)} sub={`95% CI ${ci(boot.recall, (x) => pct(x, 0))}`} />
        <Stat label="Campaign profit (test)" value={usd(boot.profit.estimate)} sub={`95% CI ${usd(boot.profit.lo)} – ${usd(boot.profit.hi)}`} tone="good" />
      </div>
      <p className="-mt-2 text-xs text-slate-500">
        Headline numbers: champion ({report.selection.model_name}), held-out test set of {report.data.test.toLocaleString()} customers, {report.test.n_boot.toLocaleString()} bootstrap resamples. Everything below recomputes live for the model selected in the header.
      </p>

      {/* ── Threshold explorer ── */}
      <Card
        eyebrow={`Decision threshold · ${model.model_name}`}
        title="Confusion matrix, precision/recall and cost at your threshold"
        actions={
          <button type="button" className="btn text-xs" onClick={() => { settings.setThreshold(report.business.threshold); settings.setBusiness({ offer_cost: report.business.offer_cost, offer_success: report.business.offer_success, horizon_months: report.business.horizon_months }) }}>
            <RotateCcw className="size-3.5" aria-hidden="true" /> Reset to trained values
          </button>
        }
      >
        <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr_1fr]">
          <div className="space-y-4">
            <Slider label="Threshold" value={threshold} min={0.01} max={0.99} step={0.01} onChange={settings.setThreshold} format={(v) => pct(v)} />
            <Slider label="Offer cost" value={business.offer_cost} min={0} max={200} step={5} onChange={(v) => settings.setBusiness({ ...business, offer_cost: v })} format={(v) => usd(v)} />
            <Slider label="Offer success rate" value={business.offer_success} min={0.05} max={1} step={0.05} onChange={(v) => settings.setBusiness({ ...business, offer_success: v })} format={(v) => pct(v, 0)} />
            <Slider label="Value horizon" value={business.horizon_months} min={1} max={36} step={1} onChange={(v) => settings.setBusiness({ ...business, horizon_months: v })} format={(v) => `${v} months`} />
            <button type="button" className="btn btn-primary w-full justify-center text-xs" onClick={() => settings.setThreshold(best.threshold)}>
              Snap to profit-optimal on test ({pct(best.threshold, 0)})
            </button>
            <p className="text-xs text-slate-500">The trained threshold ({pct(report.business.threshold)}) was chosen on out-of-fold validation predictions, not on this test set.</p>
          </div>
          <div>
            <div className="grid grid-cols-[auto_1fr_1fr] gap-1.5 text-center text-sm" data-testid="confusion">
              <div />
              <div className="eyebrow py-1">Pred. churn</div>
              <div className="eyebrow py-1">Pred. stay</div>
              <div className="eyebrow flex items-center pr-1">Churned</div>
              <Cell2 label="True positive" n={live.c.tp} good />
              <Cell2 label="False negative" n={live.c.fn} />
              <div className="eyebrow flex items-center pr-1">Stayed</div>
              <Cell2 label="False positive" n={live.c.fp} />
              <Cell2 label="True negative" n={live.c.tn} good />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Each TP is worth {pct(business.offer_success, 0)} × {business.horizon_months} × monthly bill − {usd(business.offer_cost)}; each FP costs {usd(business.offer_cost)}; FN and TN cost nothing extra.
            </p>
          </div>
          <div className="grid grid-cols-2 content-start gap-2">
            <Stat label="Precision" value={pct(live.r.precision)} />
            <Stat label="Recall" value={pct(live.r.recall)} />
            <Stat label="F1" value={num(live.r.f1)} />
            <Stat label="Contacted" value={pct(live.r.flagRate)} sub={`${live.c.tp + live.c.fp} customers`} />
            <div className="col-span-2">
              <Stat label="Campaign profit vs. no action" value={usd(live.profit)} tone={live.profit >= 0 ? 'good' : 'bad'} sub={`max ${usd(best.profit)} at ${pct(best.threshold, 0)} · contact-all ${usd(report.business.strategies.contact_everyone)}`} />
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card eyebrow={`AUC ${live.auc.toFixed(3)} (selected) · dot = current threshold`} title="ROC curve">
          <CurveChart
            xKey="fpr"
            yKey="tpr"
            xLabel="false positive rate"
            yLabel="true positive rate"
            series={[
              { name: data.champion.model_name, data: thin(rocPr.champ.roc), color: 'var(--series-1)' },
              { name: data.challenger.model_name, data: thin(rocPr.chal.roc), color: 'var(--series-2)' },
            ]}
            diagonal
            point={{ x: rocPoint.fpr, y: rocPoint.tpr, color: role === 'champion' ? 'var(--series-1)' : 'var(--series-2)' }}
          />
        </Card>
        <Card eyebrow={`Average precision ${live.ap.toFixed(3)} (selected) · dashed = churn base rate`} title="Precision–recall curve">
          <CurveChart
            xKey="recall"
            yKey="precision"
            xLabel="recall"
            yLabel="precision"
            series={[
              { name: data.champion.model_name, data: thin(rocPr.champ.pr), color: 'var(--series-1)' },
              { name: data.challenger.model_name, data: thin(rocPr.chal.pr), color: 'var(--series-2)' },
            ]}
            baseline={report.data.test_churn_rate}
            point={{ x: live.r.recall, y: live.r.precision, color: role === 'champion' ? 'var(--series-1)' : 'var(--series-2)' }}
          />
          <p className="text-xs text-slate-500">{sel.pr.length} operating points on the test set.</p>
        </Card>

        <Card eyebrow={`Brier ${live.brier.toFixed(4)} · equal-count bins`} title="Calibration (reliability) curve">
          <ResponsiveContainer width="100%" height={290} initialDimension={{ width: 500, height: 290 }}>
            <LineChart margin={{ top: 8, right: 12, bottom: 18, left: 0 }}>
              <CartesianGrid stroke="var(--chart-grid)" />
              <XAxis type="number" dataKey="meanPred" domain={[0, 1]} tickFormatter={(v: number) => `${Math.round(v * 100)}%`} stroke="var(--chart-grid)" label={{ value: 'mean predicted probability', position: 'insideBottom', offset: -10, fill: '#94a3b8', fontSize: 11 }} />
              <YAxis type="number" domain={[0, 1]} tickFormatter={(v: number) => `${Math.round(v * 100)}%`} stroke="var(--chart-grid)" width={42} />
              <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]} stroke="#64748b" strokeDasharray="4 4" />
              <Tooltip {...tooltipStyle} formatter={(v) => pct(Number(v))} labelFormatter={(l) => `predicted ${pct(Number(l))}`} />
              <Line data={rel} dataKey="fracPos" name="observed churn rate" stroke={role === 'champion' ? 'var(--series-1)' : 'var(--series-2)'} strokeWidth={2} dot={{ r: 4 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
          <table className="table mt-2">
            <thead>
              <tr><th>Calibration (val. OOF, champion)</th><th>Brier</th><th>Log loss</th><th>ECE</th></tr>
            </thead>
            <tbody>
              {Object.entries(report.calibration.compare).map(([m, v]) => (
                <tr key={m} className={m === report.calibration.selected ? 'text-sky-200' : ''}>
                  <td>{m}{m === report.calibration.selected ? ' ✓ selected' : ''}</td>
                  <td>{v.brier.toFixed(4)}</td>
                  <td>{v.log_loss.toFixed(4)}</td>
                  <td>{v.ece.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card eyebrow="Profit vs. threshold on the test set" title="Expected profit curve">
          <ResponsiveContainer width="100%" height={290} initialDimension={{ width: 500, height: 290 }}>
            <LineChart data={profit} margin={{ top: 8, right: 12, bottom: 18, left: 8 }}>
              <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
              <XAxis dataKey="threshold" type="number" domain={[0, 1]} tickFormatter={(v: number) => `${Math.round(v * 100)}%`} stroke="var(--chart-grid)" label={{ value: 'decision threshold', position: 'insideBottom', offset: -10, fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tickFormatter={(v: number) => `$${Math.round(v / 1000)}k`} stroke="var(--chart-grid)" width={48} />
              <ReferenceLine y={0} stroke="#64748b" />
              <ReferenceLine x={threshold} stroke="#e2e8f0" strokeDasharray="4 4" />
              <Tooltip {...tooltipStyle} formatter={(v) => [usd(Number(v)), 'profit']} labelFormatter={(l) => `threshold ${pct(Number(l), 0)}`} />
              <Line dataKey="profit" stroke="var(--series-3)" strokeWidth={2} dot={false} isAnimationActive={false} />
              <ReferenceDot x={best.threshold} y={best.profit} r={5} fill="var(--series-3)" stroke="#0f172a" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            {Object.entries(report.business.strategies).map(([k, v]) => (
              <div key={k} className="rounded-lg border border-white/[0.06] px-2 py-1.5">
                <div className="text-slate-400">{k.replace(/_/g, ' ')}</div>
                <div className="font-mono text-slate-100">{usd(v)}</div>
              </div>
            )).slice(0, 4)}
          </div>
          <p className="mt-2 text-xs text-slate-500">Strategy comparison uses the trained cost assumptions ({usd(report.business.offer_cost)} offer, {pct(report.business.offer_success, 0)} success, {report.business.horizon_months}-month value).</p>
        </Card>
      </div>

      {/* ── Model comparison ── */}
      <Card eyebrow={`Stratified ${report.cv.folds}-fold cross-validation on the training split (n=${report.data.train.toLocaleString()})`} title="Model comparison">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr><th>Model (defaults)</th><th>ROC-AUC</th><th>PR-AUC</th><th>F1 @ 0.5</th><th>Brier ↓</th><th>Fit time</th></tr>
            </thead>
            <tbody>
              {cvRows.map(([k, v]) => (
                <tr key={k}>
                  <td className="text-slate-200">{v.label}</td>
                  <td>{v.roc_auc.mean.toFixed(3)} <span className="text-slate-500">± {v.roc_auc.std.toFixed(3)}</span></td>
                  <td>{v.pr_auc.mean.toFixed(3)} <span className="text-slate-500">± {v.pr_auc.std.toFixed(3)}</span></td>
                  <td>{v.f1.mean.toFixed(3)}</td>
                  <td>{v.brier.mean.toFixed(4)}</td>
                  <td>{(v.fit_time_s * 1000).toFixed(0)} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="table">
            <thead>
              <tr><th>Tuned family (RandomizedSearchCV)</th><th>CV ROC-AUC</th><th>Best hyper-parameters</th></tr>
            </thead>
            <tbody>
              {Object.entries(report.tuning).map(([k, v]) => (
                <tr key={k} className={k === report.selection.winner ? 'text-sky-200' : ''}>
                  <td>{v.label}{k === report.selection.winner ? ' ★ champion' : k === report.selection.challenger ? ' · challenger' : ''}</td>
                  <td>{v.best_cv_roc_auc.toFixed(4)} <span className="text-slate-500">± {v.best_cv_roc_auc_std.toFixed(4)}</span></td>
                  <td className="font-mono text-xs whitespace-normal text-slate-400">{Object.entries(v.best_params).map(([pk, pv]) => `${pk}=${typeof pv === 'number' ? +pv.toPrecision(3) : pv}`).join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Champion vs runner-up: Δ AUC {report.selection.mean_diff >= 0 ? '+' : ''}{report.selection.mean_diff.toFixed(4)}, Nadeau–Bengio corrected t-test p = {report.selection.p_value.toFixed(2)} — statistically a tie, so the simpler, fully transparent model wins.
          On test, champion − challenger AUC = {report.challenger.auc_diff_vs_champion.estimate.toFixed(4)} (95% paired-bootstrap CI {ci(report.challenger.auc_diff_vs_champion, (x) => x.toFixed(4))}).
        </p>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card eyebrow={`${report.importance.method} · ${report.importance.n_repeats} repeats · champion`} title="Permutation feature importance">
          <ResponsiveContainer width="100%" height={importance.length * 26 + 40} initialDimension={{ width: 500, height: 340 }}>
            <BarChart data={importance} layout="vertical" margin={{ top: 0, right: 16, bottom: 16, left: 4 }} barCategoryGap={4}>
              <CartesianGrid horizontal={false} stroke="var(--chart-grid)" />
              <XAxis type="number" domain={[0, 'auto']} allowDataOverflow stroke="var(--chart-grid)" tickFormatter={(v: number) => v.toFixed(2)} label={{ value: 'drop in ROC-AUC when shuffled', position: 'insideBottom', offset: -8, fill: '#94a3b8', fontSize: 11 }} />
              <YAxis type="category" dataKey="label" width={140} interval={0} tick={{ fontSize: 11.5 }} stroke="var(--chart-grid)" />
              <Tooltip {...tooltipStyle} cursor={{ fill: 'rgb(255 255 255 / 0.04)' }} formatter={(v) => [Number(v).toFixed(4), 'Δ AUC']} />
              <Bar dataKey="mean" fill="var(--series-1)" radius={3} isAnimationActive={false}>
                <ErrorBar dataKey="err" width={4} stroke="#94a3b8" direction="x" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-1 text-xs text-slate-500">
            Raw inputs are permuted <em>before</em> feature engineering, so shuffling tenure also scrambles the derived avg. monthly spend and charge ratio — part of its weight is that interaction. Partial dependence has the same caveat (other inputs, including total charges, are held fixed).
          </p>
        </Card>
        <Card eyebrow="Average prediction when one input is set for every test customer · champion" title="Partial dependence">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            {(['tenure', 'MonthlyCharges', 'Contract', 'InternetService', 'PaymentMethod', 'TechSupport'] as const).map((k) => (
              <PdpChart key={k} name={FEATURE_LABELS[k]} pts={report.partial_dependence[k]} />
            ))}
          </div>
        </Card>
      </div>

      {/* ── Fairness ── */}
      <Card eyebrow={`Test set at threshold ${pct(threshold)} · ${model.model_name}`} title="Fairness slices">
        <div className="overflow-x-auto">
          <table className="table" data-testid="fairness">
            <thead>
              <tr><th>Group</th><th>n</th><th>Churn rate</th><th>Mean pred.</th><th>ROC-AUC</th><th>TPR (recall)</th><th>FPR</th><th>Precision</th><th>Flag rate</th></tr>
            </thead>
            <tbody>
              {slices.map((s) => (
                <SliceRows key={s.key} s={s} />
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Mean prediction tracks the observed churn rate within each group (calibration-in-the-large), so differences in flag rate mostly reflect different base rates. Seniors are flagged far more often — acceptable for a retention <em>offer</em> (a benefit), but it would need review for any adverse use. Gender gaps are small.
        </p>
      </Card>

      {/* ── Imbalance ── */}
      <Card eyebrow="Out-of-fold on train · champion family" title="Class imbalance: re-weighting vs. threshold moving">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr><th>class_weight</th><th>ROC-AUC</th><th>PR-AUC</th><th>Brier ↓</th><th>Mean pred. (true {pct(report.data.train_churn_rate)})</th><th>F1 @ 0.5</th><th>Best F1 (threshold)</th></tr>
            </thead>
            <tbody>
              {(['none', 'balanced'] as const).map((k) => {
                const v = report.imbalance[k]
                return (
                  <tr key={k}>
                    <td>{k}</td>
                    <td>{v.roc_auc.toFixed(4)}</td>
                    <td>{v.pr_auc.toFixed(4)}</td>
                    <td>{v.brier.toFixed(4)}</td>
                    <td>{pct(v.mean_pred)}</td>
                    <td>{v['f1_at_0.5'].toFixed(3)}</td>
                    <td>{v.best_f1.toFixed(3)} ({v.best_f1_threshold.toFixed(2)})</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Balanced weights leave ranking (AUC) unchanged and reach the same best F1 — they just move the default threshold — but they inflate probabilities and worsen Brier. Keeping calibrated probabilities and picking the threshold from business costs dominates.
        </p>
      </Card>
    </div>
  )
}

function Cell2({ label, n, good }: { label: string; n: number; good?: boolean }) {
  return (
    <div className={`rounded-lg border px-2 py-3 ${good ? 'border-sky-400/25 bg-sky-500/10' : 'border-white/[0.07] bg-white/[0.02]'}`}>
      <div className="text-2xl font-semibold tabular-nums text-slate-50">{n}</div>
      <div className="text-[11px] text-slate-400">{label}</div>
    </div>
  )
}

interface SeriesDef {
  name: string
  data: object[]
  color: string
}

function CurveChart({ xKey, yKey, xLabel, yLabel, series, diagonal, baseline, point }: {
  xKey: string
  yKey: string
  xLabel: string
  yLabel: string
  series: SeriesDef[]
  diagonal?: boolean
  baseline?: number
  point: { x: number; y: number; color: string }
}) {
  return (
    <ResponsiveContainer width="100%" height={300} initialDimension={{ width: 500, height: 300 }}>
      <LineChart margin={{ top: 8, right: 12, bottom: 18, left: 0 }}>
        <CartesianGrid stroke="var(--chart-grid)" />
        <XAxis type="number" dataKey={xKey} domain={[0, 1]} tickFormatter={(v: number) => v.toFixed(1)} stroke="var(--chart-grid)" label={{ value: xLabel, position: 'insideBottom', offset: -10, fill: '#94a3b8', fontSize: 11 }} />
        <YAxis type="number" domain={[0, 1]} tickFormatter={(v: number) => v.toFixed(1)} stroke="var(--chart-grid)" width={36} label={{ value: yLabel, angle: -90, position: 'insideLeft', offset: 12, fill: '#94a3b8', fontSize: 11 }} />
        {diagonal && <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]} stroke="#64748b" strokeDasharray="4 4" />}
        {baseline !== undefined && <ReferenceLine y={baseline} stroke="#64748b" strokeDasharray="4 4" />}
        <Tooltip {...tooltipStyle} formatter={(v, n) => [Number(v).toFixed(3), n]} labelFormatter={(l) => `${xLabel} ${Number(l).toFixed(3)}`} />
        <Legend verticalAlign="top" height={24} wrapperStyle={{ fontSize: 12 }} />
        {series.map((s) => (
          <Line key={s.name} data={s.data} dataKey={yKey} name={s.name} stroke={s.color} strokeWidth={2} dot={false} isAnimationActive={false} />
        ))}
        <ReferenceDot x={point.x} y={point.y} r={6} fill={point.color} stroke="#f8fafc" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  )
}

const SHORT: Record<string, string> = {
  'Bank transfer (automatic)': 'Bank (auto)',
  'Credit card (automatic)': 'Card (auto)',
  'Electronic check': 'E-check',
  'Mailed check': 'Mailed',
  'No internet service': 'No internet',
  'Month-to-month': 'Monthly',
}

function PdpChart({ name, pts }: { name: string; pts: { value: string | number; mean_prob: number }[] }) {
  const categorical = typeof pts[0].value === 'string'
  const data = pts.map((p) => ({ x: categorical ? (SHORT[String(p.value)] ?? String(p.value)) : p.value, y: p.mean_prob }))
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-slate-300">{name}</div>
      <ResponsiveContainer width="100%" height={130} initialDimension={{ width: 250, height: 130 }}>
        {categorical ? (
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey="x" tick={{ fontSize: 9.5 }} interval={0} stroke="var(--chart-grid)" />
            <YAxis domain={[0, (max: number) => Math.max(0.6, Math.ceil(max * 10) / 10)]} tickFormatter={(v: number) => `${Math.round(v * 100)}%`} stroke="var(--chart-grid)" tick={{ fontSize: 10 }} />
            <Tooltip {...tooltipStyle} cursor={{ fill: 'rgb(255 255 255 / 0.04)' }} formatter={(v) => [pct(Number(v)), 'mean P(churn)']} />
            <Bar dataKey="y" fill="var(--series-1)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
          </BarChart>
        ) : (
          <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey="x" type="number" domain={['dataMin', 'dataMax']} stroke="var(--chart-grid)" tick={{ fontSize: 10 }} />
            <YAxis domain={[0, (max: number) => Math.max(0.6, Math.ceil(max * 10) / 10)]} tickFormatter={(v: number) => `${Math.round(v * 100)}%`} stroke="var(--chart-grid)" tick={{ fontSize: 10 }} />
            <Tooltip {...tooltipStyle} formatter={(v) => [pct(Number(v)), 'mean P(churn)']} />
            <Line dataKey="y" stroke="var(--series-1)" strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}

interface SliceView {
  key: string
  groups: { group: string; n: number; base: number; meanP: number; auc: number; recall: number; fpr: number; precision: number; flagRate: number }[]
  eoGap: number
  dpGap: number
}

function SliceRows({ s }: { s: SliceView }) {
  return (
    <>
      {s.groups.map((g, i) => (
        <tr key={g.group} className={i === 0 ? 'border-t border-white/10' : ''}>
          <td className="text-slate-200">{g.group}</td>
          <td>{g.n}</td>
          <td>{pct(g.base)}</td>
          <td>{pct(g.meanP)}</td>
          <td>{g.auc.toFixed(3)}</td>
          <td>{pct(g.recall)}</td>
          <td>{pct(g.fpr)}</td>
          <td>{pct(g.precision)}</td>
          <td>{pct(g.flagRate)}</td>
        </tr>
      ))}
      <tr>
        <td colSpan={9} className="pb-3 text-xs text-slate-500">
          {s.key}: equal-opportunity (TPR) gap {pct(s.eoGap)} · demographic-parity (flag-rate) gap {pct(s.dpGap)}
        </td>
      </tr>
    </>
  )
}
