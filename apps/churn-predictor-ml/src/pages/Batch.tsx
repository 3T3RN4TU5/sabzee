import { useMemo, useRef, useState } from 'react'
import { Download, FileUp, Table2 } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Settings } from '../App.tsx'
import { Card, Stat } from '../components/ui.tsx'
import { tooltipStyle } from '../lib/chart.ts'
import type { Artefacts } from '../lib/data.ts'
import { pct, usd } from '../lib/format.ts'
import { riskTier } from '../lib/risk.ts'
import { parseCsv, toCsv } from '../ml/csv.ts'
import { averagePrecision, campaignProfit, confusionAt, contactValue, rates, rocAuc } from '../ml/metrics.ts'
import { predict } from '../ml/model.ts'
import type { CustomerRow } from '../ml/types.ts'

interface Parsed {
  name: string
  header: string[]
  rows: string[][]
}

const PAGE = 25

export function BatchPage({ data, settings }: { data: Artefacts; settings: Settings }) {
  const bundle = data[settings.role]
  const { threshold, business } = settings
  const [file, setFile] = useState<Parsed | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [flaggedOnly, setFlaggedOnly] = useState(false)
  const [page, setPage] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const ingest = (name: string, text: string) => {
    const rows = parseCsv(text)
    if (rows.length < 2) {
      setError('The file has no data rows.')
      setFile(null)
      return
    }
    const header = rows[0].map((h) => h.trim())
    const missing = bundle.raw_features.filter((f) => !header.includes(f))
    if (missing.length) {
      setError(`Missing required column${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}`)
      setFile(null)
      return
    }
    setError(null)
    setPage(0)
    setFile({ name, header, rows: rows.slice(1).filter((r) => r.some((c) => c.trim() !== '')) })
  }

  const onFile = async (f: File | undefined) => {
    if (!f) return
    if (f.size > 20 * 1024 * 1024) {
      setError('File is larger than 20 MB.')
      return
    }
    ingest(f.name, await f.text())
  }

  const loadSample = async () => {
    const res = await fetch(`${import.meta.env.BASE_URL}sample_customers.csv`)
    ingest('sample_customers.csv', await res.text())
  }

  const scored = useMemo(() => {
    if (!file) return null
    const idx = Object.fromEntries(file.header.map((h, i) => [h, i]))
    const churnCol = idx.Churn
    return file.rows.map((r, i) => {
      const row: CustomerRow = {}
      for (const f of bundle.raw_features) row[f] = (r[idx[f]] ?? '').trim()
      const p = predict(row, bundle).proba
      const monthly = Number(row.MonthlyCharges) || 0
      const label = churnCol === undefined ? null : /^(yes|1|true)$/i.test((r[churnCol] ?? '').trim()) ? 1 : 0
      return { i, id: idx.customerID !== undefined ? r[idx.customerID] : `row ${i + 1}`, raw: r, row, p, monthly, ev: contactValue(p, monthly, business), label }
    })
  }, [file, bundle, business])

  const summary = useMemo(() => {
    if (!scored) return null
    const flagged = scored.filter((s) => s.p >= threshold)
    const hist: { bin: number; mid: number; label: string; n: number }[] = Array.from({ length: 20 }, (_, b) => ({ bin: b / 20, mid: b / 20 + 0.025, label: `${b * 5}–${b * 5 + 5}%`, n: 0 }))
    for (const s of scored) hist[Math.min(19, Math.floor(s.p * 20))].n++
    const labelled = scored.every((s) => s.label !== null)
    let eval_ = null
    if (labelled) {
      const y = scored.map((s) => s.label as number)
      const p = scored.map((s) => s.p)
      const r = rates(confusionAt(y, p, threshold))
      eval_ = { auc: rocAuc(y, p), ap: averagePrecision(y, p), precision: r.precision, recall: r.recall, profit: campaignProfit(y, p, scored.map((s) => s.monthly), threshold, business), churnRate: y.reduce((a, b) => a + b, 0) / y.length }
    }
    return {
      n: scored.length,
      flagged: flagged.length,
      meanP: scored.reduce((a, s) => a + s.p, 0) / scored.length,
      expectedValue: flagged.reduce((a, s) => a + s.ev, 0),
      expectedChurners: scored.reduce((a, s) => a + s.p, 0),
      hist,
      eval: eval_,
    }
  }, [scored, threshold, business])

  const visible = useMemo(() => {
    if (!scored) return []
    const list = (flaggedOnly ? scored.filter((s) => s.p >= threshold) : scored).slice().sort((a, b) => b.p - a.p)
    return list
  }, [scored, flaggedOnly, threshold])
  const pages = Math.max(1, Math.ceil(visible.length / PAGE))

  const download = () => {
    if (!file || !scored) return
    const header = [...file.header, 'churn_probability', 'risk_tier', 'contact', 'expected_value_usd']
    const rows = scored.map((s) => [...s.raw, s.p.toFixed(6), riskTier(s.p, threshold).label, s.p >= threshold ? 'yes' : 'no', s.ev.toFixed(2)])
    const blob = new Blob([toCsv(header, rows)], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = file.name.replace(/\.csv$/i, '') + '_scored.csv'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const template = () => {
    const blob = new Blob([toCsv(['customerID', ...bundle.raw_features], [])], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'churn_template.csv'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="space-y-5">
      <Card eyebrow="Batch scoring — nothing leaves your browser" title="Score a customer file">
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-8 text-center"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            void onFile(e.dataTransfer.files[0])
          }}
        >
          <FileUp className="size-7 text-slate-400" aria-hidden="true" />
          <p className="text-sm text-slate-300">Drop a CSV with the Telco schema here, or</p>
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" className="btn btn-primary" onClick={() => inputRef.current?.click()}>Choose file…</button>
            <button type="button" className="btn" onClick={loadSample}><Table2 className="size-4" aria-hidden="true" /> Use sample (150 test customers)</button>
            <button type="button" className="btn" onClick={template}><Download className="size-4" aria-hidden="true" /> Template</button>
          </div>
          <input ref={inputRef} type="file" accept=".csv,text/csv" className="sr-only" aria-label="Upload CSV" data-testid="csv-input" onChange={(e) => void onFile(e.target.files?.[0])} />
          <p className="max-w-xl text-xs text-slate-500">
            Required columns: {bundle.raw_features.join(', ')}. Optional: <code>customerID</code>, and <code>Churn</code> (Yes/No) to evaluate the model on your file. Blank values are imputed like in training.
          </p>
        </div>
        {error && <p className="mt-3 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200" role="alert">{error}</p>}
      </Card>

      {summary && scored && file && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Customers scored" value={summary.n.toLocaleString()} sub={file.name} />
            <Stat label={`Flagged ≥ ${pct(threshold)}`} value={summary.flagged.toLocaleString()} sub={`${pct(summary.flagged / summary.n)} of file`} />
            <Stat label="Expected churners" value={summary.expectedChurners.toFixed(1)} sub={`mean probability ${pct(summary.meanP)}`} />
            <Stat label="Expected campaign value" value={usd(summary.expectedValue)} sub="Σ (p·s·value − cost) over flagged" tone={summary.expectedValue >= 0 ? 'good' : 'bad'} />
          </div>
          {summary.eval && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              <Stat label="ROC-AUC (your labels)" value={summary.eval.auc.toFixed(3)} />
              <Stat label="PR-AUC" value={summary.eval.ap.toFixed(3)} sub={`churn rate ${pct(summary.eval.churnRate)}`} />
              <Stat label="Precision" value={pct(summary.eval.precision)} />
              <Stat label="Recall" value={pct(summary.eval.recall)} />
              <Stat label="Realised profit" value={usd(summary.eval.profit)} tone={summary.eval.profit >= 0 ? 'good' : 'bad'} />
            </div>
          )}

          <div className="grid gap-5 xl:grid-cols-[1fr_1.4fr]">
            <Card eyebrow="Distribution" title="Predicted churn probability">
              <ResponsiveContainer width="100%" height={280} initialDimension={{ width: 500, height: 280 }}>
                <BarChart data={summary.hist} margin={{ top: 22, right: 12, bottom: 18, left: 4 }} barCategoryGap={2}>
                  <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                  <XAxis dataKey="mid" type="number" domain={[0, 1]} ticks={[0, 0.2, 0.4, 0.6, 0.8, 1]} tickFormatter={(v: number) => `${v * 100}%`} stroke="var(--chart-grid)" label={{ value: 'P(churn)', position: 'insideBottom', offset: -10, fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis allowDecimals={false} stroke="var(--chart-grid)" width={36} />
                  <Tooltip {...tooltipStyle} cursor={{ fill: 'rgb(255 255 255 / 0.04)' }} labelFormatter={(_l, p) => (p[0]?.payload as { label: string } | undefined)?.label ?? ''} formatter={(v) => [v, 'customers']} />
                  <Bar dataKey="n" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                    {summary.hist.map((h) => (
                      <Cell key={h.bin} fill={h.bin + 0.05 > threshold ? 'var(--series-2)' : 'var(--series-1)'} />
                    ))}
                  </Bar>
                  <ReferenceLine x={threshold} stroke="#e2e8f0" strokeDasharray="4 4" label={{ value: 'threshold', fill: '#cbd5e1', fontSize: 10, position: 'top' }} />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-slate-500">Bins that reach the action threshold are orange.</p>
            </Card>

            <Card
              eyebrow="Ranked by risk"
              title="Scored customers"
              actions={
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs text-slate-400">
                    <input type="checkbox" checked={flaggedOnly} onChange={(e) => { setFlaggedOnly(e.target.checked); setPage(0) }} /> flagged only
                  </label>
                  <button type="button" className="btn btn-primary" onClick={download}><Download className="size-4" aria-hidden="true" /> Download CSV</button>
                </div>
              }
            >
              <div className="overflow-x-auto">
                <table className="table" data-testid="scored-table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>P(churn)</th>
                      <th>Tier</th>
                      <th>Contract</th>
                      <th>Tenure</th>
                      <th>Monthly</th>
                      <th>Offer EV</th>
                      {summary.eval && <th>Churned</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {visible.slice(page * PAGE, page * PAGE + PAGE).map((s) => {
                      const t = riskTier(s.p, threshold)
                      return (
                        <tr key={s.i}>
                          <td className="font-mono text-xs text-slate-300">{s.id}</td>
                          <td>
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-14 overflow-hidden rounded-full bg-white/10">
                                <div className="h-full rounded-full" style={{ width: `${s.p * 100}%`, background: s.p >= threshold ? 'var(--series-2)' : 'var(--series-1)' }} />
                              </div>
                              <span className="font-mono">{pct(s.p)}</span>
                            </div>
                          </td>
                          <td><span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${t.className}`}>{t.label}</span></td>
                          <td className="text-slate-300">{String(s.row.Contract)}</td>
                          <td>{String(s.row.tenure)} mo</td>
                          <td>${Number(s.row.MonthlyCharges).toFixed(2)}</td>
                          <td className={s.ev >= 0 ? 'text-emerald-300' : 'text-slate-500'}>{usd(s.ev)}</td>
                          {summary.eval && <td>{s.label ? 'Yes' : 'No'}</td>}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                <span>{visible.length.toLocaleString()} rows · page {page + 1} of {pages}</span>
                <div className="flex gap-2">
                  <button type="button" className="btn px-2 py-1 text-xs" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</button>
                  <button type="button" className="btn px-2 py-1 text-xs" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}>Next</button>
                </div>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
