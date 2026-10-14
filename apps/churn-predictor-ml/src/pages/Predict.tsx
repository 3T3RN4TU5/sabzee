import { useMemo, useState } from 'react'
import { ArrowRight, Info, Shuffle, Sparkles } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Settings } from '../App.tsx'
import { Gauge } from '../components/Gauge.tsx'
import { Card, Slider, tooltipStyle } from '../components/ui.tsx'
import { Waterfall } from '../components/Waterfall.tsx'
import type { Artefacts } from '../lib/data.ts'
import { pct, signed, usd } from '../lib/format.ts'
import { riskTier, suggestActions } from '../lib/risk.ts'
import { explainGrouped } from '../ml/explain.ts'
import { contactValue, customerValue } from '../ml/metrics.ts'
import { predict } from '../ml/model.ts'
import { FIELD_GROUPS, normalizeCustomer, PRESETS, type FieldSpec } from '../ml/schema.ts'
import type { CustomerRow, ModelBundle } from '../ml/types.ts'

interface FormState {
  row: CustomerRow
  autoTotal: boolean
}

const effective = ({ row, autoTotal }: FormState): CustomerRow =>
  autoTotal ? { ...row, TotalCharges: Math.round(Number(row.tenure) * Number(row.MonthlyCharges) * 100) / 100 } : row

interface Lever {
  label: string
  change: Partial<CustomerRow>
}

function levers(row: CustomerRow): Lever[] {
  const out: Lever[] = []
  for (const c of ['Month-to-month', 'One year', 'Two year']) if (row.Contract !== c) out.push({ label: `Contract → ${c}`, change: { Contract: c } })
  if (!String(row.PaymentMethod).includes('automatic')) out.push({ label: 'Pay by credit card (auto)', change: { PaymentMethod: 'Credit card (automatic)' } })
  if (row.PaymentMethod !== 'Electronic check') out.push({ label: 'Pay by electronic check', change: { PaymentMethod: 'Electronic check' } })
  if (row.InternetService !== 'No') {
    for (const f of ['TechSupport', 'OnlineSecurity'] as const)
      out.push({ label: `${f === 'TechSupport' ? 'Tech support' : 'Online security'} → ${row[f] === 'Yes' ? 'No' : 'Yes'}`, change: { [f]: row[f] === 'Yes' ? 'No' : 'Yes' } })
    if (row.InternetService === 'Fiber optic') out.push({ label: 'Internet → DSL', change: { InternetService: 'DSL' } })
  }
  out.push({ label: `Paperless billing → ${row.PaperlessBilling === 'Yes' ? 'No' : 'Yes'}`, change: { PaperlessBilling: row.PaperlessBilling === 'Yes' ? 'No' : 'Yes' } })
  out.push({ label: 'Tenure +12 months', change: { tenure: Math.min(72, Number(row.tenure) + 12) } })
  out.push({ label: 'Monthly charges −$15', change: { MonthlyCharges: Math.max(18.25, Number(row.MonthlyCharges) - 15) } })
  return out
}

export function PredictPage({ data, settings }: { data: Artefacts; settings: Settings }) {
  const bundle: ModelBundle = data[settings.role]
  const other: ModelBundle = data[settings.role === 'champion' ? 'challenger' : 'champion']
  const [form, setForm] = useState<FormState>({ row: PRESETS[0].row, autoTotal: true })
  const [presetId, setPresetId] = useState<string>(PRESETS[0].id)
  const [fixture, setFixture] = useState<{ customerID: string; features: CustomerRow }[] | null>(null)
  const [realId, setRealId] = useState<string | null>(null)

  const row = useMemo(() => effective(form), [form])
  const pred = useMemo(() => predict(row, bundle), [row, bundle])
  const otherP = useMemo(() => predict(row, other).proba, [row, other])
  const expl = useMemo(() => explainGrouped(row, bundle), [row, bundle])
  const { threshold, business } = settings
  const tier = riskTier(pred.proba, threshold)
  const monthly = Number(row.MonthlyCharges)
  const ev = contactValue(pred.proba, monthly, business)
  const contact = pred.proba >= threshold
  const actions = suggestActions(row, expl.groups)

  const leverRows = useMemo(
    () =>
      levers(row)
        .map((l) => {
          const next = effective({ ...form, row: normalizeCustomer({ ...form.row, ...l.change }) })
          return { ...l, delta: predict(next, bundle).proba - pred.proba }
        })
        .sort((a, b) => a.delta - b.delta),
    [row, form, bundle, pred.proba],
  )

  const ice = useMemo(() => {
    const pts: { tenure: number; p: number }[] = []
    for (let t = 0; t <= 72; t += 2) pts.push({ tenure: t, p: predict(effective({ ...form, row: { ...form.row, tenure: t } }), bundle).proba })
    return pts
  }, [form, bundle])

  const update = (patch: Partial<CustomerRow>) => {
    setPresetId('custom')
    setRealId(null)
    setForm((f) => ({ ...f, row: normalizeCustomer({ ...f.row, ...patch }) }))
  }
  const applyPreset = (id: string) => {
    const p = PRESETS.find((x) => x.id === id)
    if (!p) return
    setPresetId(id)
    setRealId(null)
    setForm({ row: p.row, autoTotal: true })
  }
  const randomReal = async () => {
    let rows = fixture
    if (!rows) {
      const res = await fetch(`${import.meta.env.BASE_URL}model/parity_fixture.json`)
      rows = ((await res.json()) as { rows: { customerID: string; features: CustomerRow }[] }).rows
      setFixture(rows)
    }
    const pick = rows[Math.floor(Math.random() * rows.length)]
    const r: CustomerRow = { ...pick.features, SeniorCitizen: Number(pick.features.SeniorCitizen), tenure: Number(pick.features.tenure) }
    setPresetId('custom')
    setRealId(pick.customerID)
    setForm({ row: r, autoTotal: false })
  }

  const leverMax = Math.max(0.02, ...leverRows.map((l) => Math.abs(l.delta)))

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(300px,380px)_1fr]">
      {/* ── Customer form ── */}
      <Card
        eyebrow="Customer profile"
        title="Inputs"
        className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:self-start lg:overflow-y-auto"
      >
        <div className="mb-4 space-y-2">
          <label className="block text-xs text-slate-400" htmlFor="preset">Preset</label>
          <div className="flex gap-2">
            <select id="preset" className="select" value={presetId} onChange={(e) => applyPreset(e.target.value)}>
              {presetId === 'custom' && <option value="custom">{realId ? `Real customer ${realId}` : 'Custom'}</option>}
              {PRESETS.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
            <button type="button" className="btn shrink-0" onClick={randomReal} title="Load a random real customer from the held-out test set">
              <Shuffle className="size-4" aria-hidden="true" /> Real
            </button>
          </div>
        </div>
        {FIELD_GROUPS.map((g) => (
          <fieldset key={g.title} className="mb-4">
            <legend className="eyebrow mb-2">{g.title}</legend>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
              {g.fields.map((f) => (
                <Field key={f.name} spec={f} row={form.row} onChange={update} />
              ))}
              {g.title === 'Account' && (
                <div className="col-span-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <label htmlFor="total">Total charges ($)</label>
                    <label className="flex items-center gap-1.5">
                      <input type="checkbox" checked={form.autoTotal} onChange={(e) => setForm((s) => ({ ...s, autoTotal: e.target.checked }))} />
                      auto = tenure × monthly
                    </label>
                  </div>
                  <input
                    id="total"
                    className="input mt-1"
                    type="number"
                    min={0}
                    step={0.01}
                    disabled={form.autoTotal}
                    value={row.TotalCharges === null ? '' : String(row.TotalCharges)}
                    onChange={(e) => update({ TotalCharges: e.target.value === '' ? null : Number(e.target.value) })}
                  />
                </div>
              )}
            </div>
          </fieldset>
        ))}
      </Card>

      <div className="min-w-0 space-y-5">
        {/* ── Score + action ── */}
        <div className="grid gap-5 xl:grid-cols-2">
          <Card eyebrow={`${bundle.model_name} · ${bundle.calibration.method === 'none' ? 'well-calibrated as-is' : `${bundle.calibration.method} calibrated`}`} title="Churn probability">
            <div className="flex flex-col items-center sm:flex-row sm:items-center sm:gap-6">
              <Gauge p={pred.proba} threshold={threshold} />
              <div className="text-center sm:text-left">
                <div className="text-5xl font-bold tracking-tight text-slate-50 tabular-nums" data-testid="probability">{pct(pred.proba)}</div>
                <div className={`mt-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tier.className}`}>
                  <span aria-hidden="true">{tier.id === 'high' ? '▲' : tier.id === 'elevated' ? '◆' : '●'}</span>
                  {tier.label}
                </div>
                <div className="mt-3 space-y-0.5 text-xs text-slate-400">
                  <div>Action threshold <span className="font-mono text-slate-200">{pct(threshold)}</span> (profit-optimal)</div>
                  <div>{data[settings.role === 'champion' ? 'challenger' : 'champion'].model_name}: <span className="font-mono text-slate-200">{pct(otherP)}</span></div>
                </div>
              </div>
            </div>
          </Card>

          <Card eyebrow="Recommended next step" title={contact ? 'Contact with a retention offer' : 'No action needed'}>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5">
                <div className="eyebrow">Revenue at risk</div>
                <div className="text-lg font-semibold tabular-nums">{usd(customerValue(monthly, business))}</div>
                <div className="text-xs text-slate-500">{business.horizon_months} × monthly bill</div>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5">
                <div className="eyebrow">Expected value of offer</div>
                <div className={`text-lg font-semibold tabular-nums ${ev >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{usd(ev)}</div>
                <div className="text-xs text-slate-500">p × {pct(business.offer_success, 0)} saved × value − {usd(business.offer_cost)}</div>
              </div>
            </div>
            {contact && actions.length > 0 && (
              <ul className="mt-3 space-y-2">
                {actions.map((a) => (
                  <li key={a.title} className="flex items-start gap-2 rounded-lg bg-sky-500/[0.06] px-2.5 py-2 text-sm">
                    <Sparkles className="mt-0.5 size-4 shrink-0 text-sky-300" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-slate-100">{a.title}</div>
                      <div className="text-xs text-slate-400">{a.why}</div>
                    </div>
                    {Object.keys(a.change).length > 0 && (
                      <button type="button" className="btn shrink-0 px-2 py-1 text-xs" onClick={() => update(a.change)}>
                        Try <ArrowRight className="size-3" aria-hidden="true" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {!contact && (
              <p className="mt-3 text-sm text-slate-400">
                Below the {pct(threshold)} threshold the expected saving does not cover the {usd(business.offer_cost)} offer cost on average. Keep in the regular nurture flow.
              </p>
            )}
          </Card>
        </div>

        {/* ── Explanation ── */}
        <Card
          eyebrow={bundle.explanation.method === 'tree_shap' ? 'Exact TreeSHAP over the boosted trees' : 'Exact linear SHAP: coefficient × (value − training mean)'}
          title="Why this score?"
          actions={
            <span className="flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1"><span className="inline-block size-2.5 rounded-sm" style={{ background: 'var(--push-up)' }} />raises risk</span>
              <span className="flex items-center gap-1"><span className="inline-block size-2.5 rounded-sm" style={{ background: 'var(--push-down)' }} />lowers risk</span>
            </span>
          }
        >
          <Waterfall base={expl.base} score={expl.score} groups={expl.groups} row={row} space="Log-odds" />
          <p className="mt-1 flex gap-1.5 text-xs text-slate-500">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            Contributions are additive in log-odds: the average customer scores {expl.base.toFixed(2)} ({pct(1 / (1 + Math.exp(-expl.base)))}),
            this customer {expl.score.toFixed(2)} ({pct(pred.uncalibrated)} before calibration). One-hot columns are summed back to their source feature; “eng.” marks engineered features.
          </p>
        </Card>

        {/* ── What-if ── */}
        <div className="grid gap-5 xl:grid-cols-2">
          <Card eyebrow="What-if analysis" title="Change one thing">
            <div className="mb-3 grid gap-3 sm:grid-cols-2">
              <Slider label="Tenure" value={Number(form.row.tenure)} min={0} max={72} step={1} onChange={(v) => update({ tenure: v })} format={(v) => `${v} mo`} />
              <Slider label="Monthly charges" value={Number(form.row.MonthlyCharges)} min={18} max={120} step={0.5} onChange={(v) => update({ MonthlyCharges: v })} format={(v) => `$${v.toFixed(2)}`} />
            </div>
            <ResponsiveContainer width="100%" height={leverRows.length * 26 + 30} initialDimension={{ width: 500, height: 300 }}>
              <BarChart data={leverRows} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 4 }} barCategoryGap={3}>
                <CartesianGrid horizontal={false} stroke="var(--chart-grid)" />
                <XAxis type="number" domain={[-leverMax, leverMax]} tickFormatter={(v: number) => `${v > 0 ? '+' : ''}${(v * 100).toFixed(0)}pt`} stroke="var(--chart-grid)" />
                <YAxis type="category" dataKey="label" width={170} interval={0} tick={{ fontSize: 11.5 }} stroke="var(--chart-grid)" />
                <ReferenceLine x={0} stroke="#64748b" />
                <Tooltip {...tooltipStyle} cursor={{ fill: 'rgb(255 255 255 / 0.04)' }} formatter={(v) => [`${signed(Number(v) * 100, 1)} pts`, 'Δ churn probability']} />
                <Bar dataKey="delta" radius={3} isAnimationActive={false} onClick={(d) => update((d.payload as Lever).change)} cursor="pointer">
                  {leverRows.map((l) => (
                    <Cell key={l.label} fill={l.delta > 0 ? 'var(--push-up)' : 'var(--push-down)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="mt-1 text-xs text-slate-500">Click a bar to apply that change. Dependent fields stay consistent (e.g. no internet ⇒ no add-ons).</p>
          </Card>

          <Card eyebrow="Individual conditional expectation" title="Risk vs. tenure for this customer">
            <ResponsiveContainer width="100%" height={300} initialDimension={{ width: 500, height: 300 }}>
              <LineChart data={ice} margin={{ top: 8, right: 12, bottom: 18, left: 0 }}>
                <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                <XAxis dataKey="tenure" type="number" domain={[0, 72]} ticks={[0, 12, 24, 36, 48, 60, 72]} stroke="var(--chart-grid)" label={{ value: 'tenure (months)', position: 'insideBottom', offset: -10, fill: '#94a3b8', fontSize: 11 }} />
                <YAxis domain={[0, 1]} tickFormatter={(v: number) => `${Math.round(v * 100)}%`} stroke="var(--chart-grid)" width={42} />
                <ReferenceLine y={threshold} stroke="#cbd5e1" strokeDasharray="4 4" label={{ value: 'threshold', fill: '#94a3b8', fontSize: 10, position: 'insideTopRight' }} />
                <Tooltip {...tooltipStyle} formatter={(v) => [pct(Number(v)), 'P(churn)']} labelFormatter={(l) => `${l} months`} />
                <Line dataKey="p" stroke="var(--series-1)" strokeWidth={2} dot={false} isAnimationActive={false} />
                <ReferenceDot x={Number(form.row.tenure)} y={pred.proba} r={5} fill="var(--series-1)" stroke="#0f172a" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-xs text-slate-500">
              Holds everything else fixed{form.autoTotal ? ' (total charges follow tenure × monthly)' : ''}. Early months are the danger zone.
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Field({ spec, row, onChange }: { spec: FieldSpec; row: CustomerRow; onChange: (p: Partial<CustomerRow>) => void }) {
  const id = `f-${spec.name}`
  const v = row[spec.name]
  const disabled =
    (spec.name === 'MultipleLines' && row.PhoneService === 'No') ||
    (spec.kind === 'select' && spec.options.includes('No internet service') && row.InternetService === 'No')
  if (spec.kind === 'select') {
    const wide = spec.name === 'PaymentMethod' || spec.name === 'Contract'
    return (
      <label htmlFor={id} className={`block text-xs text-slate-400 ${wide ? 'col-span-2' : ''}`}>
        {spec.label}
        <select
          id={id}
          className="select mt-1"
          disabled={disabled}
          value={String(v)}
          onChange={(e) => onChange({ [spec.name]: spec.name === 'SeniorCitizen' ? Number(e.target.value) : e.target.value })}
        >
          {spec.options.map((o) => (
            <option key={o} value={o}>{spec.name === 'SeniorCitizen' ? (o === '1' ? 'Yes' : 'No') : o}</option>
          ))}
        </select>
      </label>
    )
  }
  const n = Number(v)
  return (
    <div className="col-span-2">
      <Slider label={`${spec.label}${spec.unit ? ` (${spec.unit})` : ''}`} value={n} min={spec.min} max={spec.max} step={spec.step} onChange={(x) => onChange({ [spec.name]: x })} format={(x) => (spec.unit === '$' ? `$${x.toFixed(2)}` : `${x}`)} />
    </div>
  )
}
