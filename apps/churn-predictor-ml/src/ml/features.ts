/**
 * Feature engineering + preprocessing — a line-by-line twin of
 * `ml/churn/features.py::engineer` and the fitted ColumnTransformer.
 */
import type { CustomerRow, ModelBundle, RawValue } from './types.ts'

export function toNumber(v: RawValue | undefined): number {
  if (v === null || v === undefined) return Number.NaN
  if (typeof v === 'number') return v
  const s = v.trim()
  if (s === '') return Number.NaN
  const n = Number(s)
  return Number.isFinite(n) ? n : Number.NaN
}

const isMissing = (v: RawValue | undefined): boolean =>
  v === null || v === undefined || (typeof v === 'string' && v.trim() === '') || (typeof v === 'number' && Number.isNaN(v))

export type EngineeredRow = Record<string, RawValue>

export function engineerRow(row: CustomerRow, spec: ModelBundle['engineering']): EngineeredRow {
  const out: EngineeredRow = { ...row }
  let services = 0
  for (const c of spec.service_cols) if (row[c] === 'Yes') services += 1
  const hasInternet = row.InternetService === 'DSL' || row.InternetService === 'Fiber optic' ? 1 : 0
  out.num_services = services + hasInternet
  const tenure = toNumber(row.tenure)
  const total = toNumber(row.TotalCharges)
  const monthly = toNumber(row.MonthlyCharges)
  const avg = tenure > 0 ? total / tenure : Number.NaN
  out.avg_monthly_spend = avg
  out.charge_ratio = avg > 0 ? monthly / avg : Number.NaN
  out.auto_pay = String(row.PaymentMethod ?? '').includes('automatic') ? 1 : 0
  out.has_family = row.Partner === 'Yes' || row.Dependents === 'Yes' ? 1 : 0
  let bucket: string | null = null
  if (!Number.isNaN(tenure)) {
    bucket = spec.tenure_labels[spec.tenure_labels.length - 1]
    for (let i = 0; i < spec.tenure_edges.length; i++) {
      if (tenure < spec.tenure_edges[i]) {
        bucket = spec.tenure_labels[i]
        break
      }
    }
  }
  out.tenure_bucket = bucket
  return out
}

/** Raw row -> model input vector (imputed, scaled, one-hot encoded). */
export function transformRow(row: CustomerRow, bundle: ModelBundle): Float64Array {
  const r = engineerRow(row, bundle.engineering)
  const { numeric, categorical } = bundle.preprocess
  const z = new Float64Array(bundle.feature_names.length)
  let k = 0
  for (let i = 0; i < numeric.features.length; i++) {
    let v = toNumber(r[numeric.features[i]])
    if (Number.isNaN(v)) v = numeric.impute[i]
    z[k++] = (v - numeric.mean[i]) / numeric.scale[i]
  }
  for (let i = 0; i < categorical.features.length; i++) {
    let v = r[categorical.features[i]]
    if (isMissing(v)) v = categorical.impute[i]
    const s = String(v)
    for (const level of categorical.categories[i]) z[k++] = s === level ? 1 : 0
  }
  return z
}
