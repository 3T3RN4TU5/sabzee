/** Raw input schema for the customer form and CSV validation. */
import type { CustomerRow } from './types.ts'

export type FieldSpec =
  | { name: string; label: string; kind: 'select'; options: string[] }
  | { name: string; label: string; kind: 'number'; min: number; max: number; step: number; unit?: string }

const YN = ['No', 'Yes']
const NET = ['No', 'Yes', 'No internet service']

export const FIELD_GROUPS: { title: string; fields: FieldSpec[] }[] = [
  {
    title: 'Account',
    fields: [
      { name: 'Contract', label: 'Contract', kind: 'select', options: ['Month-to-month', 'One year', 'Two year'] },
      { name: 'tenure', label: 'Tenure', kind: 'number', min: 0, max: 72, step: 1, unit: 'months' },
      { name: 'MonthlyCharges', label: 'Monthly charges', kind: 'number', min: 18, max: 120, step: 0.05, unit: '$' },
      {
        name: 'PaymentMethod',
        label: 'Payment method',
        kind: 'select',
        options: ['Electronic check', 'Mailed check', 'Bank transfer (automatic)', 'Credit card (automatic)'],
      },
      { name: 'PaperlessBilling', label: 'Paperless billing', kind: 'select', options: YN },
    ],
  },
  {
    title: 'Services',
    fields: [
      { name: 'InternetService', label: 'Internet', kind: 'select', options: ['DSL', 'Fiber optic', 'No'] },
      { name: 'OnlineSecurity', label: 'Online security', kind: 'select', options: NET },
      { name: 'OnlineBackup', label: 'Online backup', kind: 'select', options: NET },
      { name: 'DeviceProtection', label: 'Device protection', kind: 'select', options: NET },
      { name: 'TechSupport', label: 'Tech support', kind: 'select', options: NET },
      { name: 'StreamingTV', label: 'Streaming TV', kind: 'select', options: NET },
      { name: 'StreamingMovies', label: 'Streaming movies', kind: 'select', options: NET },
      { name: 'PhoneService', label: 'Phone service', kind: 'select', options: YN },
      { name: 'MultipleLines', label: 'Multiple lines', kind: 'select', options: ['No', 'Yes', 'No phone service'] },
    ],
  },
  {
    title: 'Demographics',
    fields: [
      { name: 'gender', label: 'Gender', kind: 'select', options: ['Female', 'Male'] },
      { name: 'SeniorCitizen', label: 'Senior citizen', kind: 'select', options: ['0', '1'] },
      { name: 'Partner', label: 'Partner', kind: 'select', options: YN },
      { name: 'Dependents', label: 'Dependents', kind: 'select', options: YN },
    ],
  },
]

export const INTERNET_ADDONS = ['OnlineSecurity', 'OnlineBackup', 'DeviceProtection', 'TechSupport', 'StreamingTV', 'StreamingMovies']

export const FEATURE_LABELS: Record<string, string> = {
  gender: 'Gender',
  SeniorCitizen: 'Senior citizen',
  Partner: 'Partner',
  Dependents: 'Dependents',
  tenure: 'Tenure',
  PhoneService: 'Phone service',
  MultipleLines: 'Multiple lines',
  InternetService: 'Internet service',
  OnlineSecurity: 'Online security',
  OnlineBackup: 'Online backup',
  DeviceProtection: 'Device protection',
  TechSupport: 'Tech support',
  StreamingTV: 'Streaming TV',
  StreamingMovies: 'Streaming movies',
  Contract: 'Contract',
  PaperlessBilling: 'Paperless billing',
  PaymentMethod: 'Payment method',
  MonthlyCharges: 'Monthly charges',
  TotalCharges: 'Total charges',
  num_services: '# services (eng.)',
  avg_monthly_spend: 'Avg. monthly spend (eng.)',
  charge_ratio: 'Charge ratio (eng.)',
  auto_pay: 'Auto-pay (eng.)',
  has_family: 'Has family (eng.)',
  tenure_bucket: 'Tenure bucket (eng.)',
}

/**
 * Keep dependent fields consistent the way the source data is: no phone line
 * means "No phone service", no internet means "No internet service" for add-ons.
 */
export function normalizeCustomer(row: CustomerRow): CustomerRow {
  const out = { ...row }
  if (out.PhoneService === 'No') out.MultipleLines = 'No phone service'
  else if (out.MultipleLines === 'No phone service') out.MultipleLines = 'No'
  for (const f of INTERNET_ADDONS) {
    if (out.InternetService === 'No') out[f] = 'No internet service'
    else if (out[f] === 'No internet service') out[f] = 'No'
  }
  return out
}

const base: CustomerRow = {
  gender: 'Female',
  SeniorCitizen: 0,
  Partner: 'No',
  Dependents: 'No',
  tenure: 12,
  PhoneService: 'Yes',
  MultipleLines: 'No',
  InternetService: 'DSL',
  OnlineSecurity: 'No',
  OnlineBackup: 'No',
  DeviceProtection: 'No',
  TechSupport: 'No',
  StreamingTV: 'No',
  StreamingMovies: 'No',
  Contract: 'Month-to-month',
  PaperlessBilling: 'Yes',
  PaymentMethod: 'Mailed check',
  MonthlyCharges: 60,
  TotalCharges: 720,
}

export interface Preset {
  id: string
  label: string
  row: CustomerRow
}

export const PRESETS: Preset[] = [
  {
    id: 'high-risk',
    label: 'High-risk month-to-month',
    row: {
      ...base,
      tenure: 3,
      InternetService: 'Fiber optic',
      StreamingTV: 'Yes',
      PaymentMethod: 'Electronic check',
      MonthlyCharges: 89.5,
      TotalCharges: 268.5,
    },
  },
  { id: 'typical', label: 'Typical customer', row: { ...base, tenure: 29, MonthlyCharges: 70.35, TotalCharges: 2040.15, Partner: 'Yes', OnlineBackup: 'Yes', Contract: 'One year', PaymentMethod: 'Bank transfer (automatic)', PaperlessBilling: 'No' } },
  {
    id: 'loyal',
    label: 'Loyal two-year bundle',
    row: {
      ...base,
      Partner: 'Yes',
      Dependents: 'Yes',
      tenure: 64,
      MultipleLines: 'Yes',
      InternetService: 'Fiber optic',
      OnlineSecurity: 'Yes',
      OnlineBackup: 'Yes',
      DeviceProtection: 'Yes',
      TechSupport: 'Yes',
      StreamingTV: 'Yes',
      StreamingMovies: 'Yes',
      Contract: 'Two year',
      PaymentMethod: 'Credit card (automatic)',
      MonthlyCharges: 110.5,
      TotalCharges: 7072,
    },
  },
  {
    id: 'senior',
    label: 'Senior, no support',
    row: {
      ...base,
      SeniorCitizen: 1,
      tenure: 14,
      InternetService: 'Fiber optic',
      StreamingMovies: 'Yes',
      PaymentMethod: 'Electronic check',
      MonthlyCharges: 85,
      TotalCharges: 1190,
    },
  },
  {
    id: 'phone-only',
    label: 'Phone-only, low spend',
    row: {
      ...base,
      tenure: 22,
      InternetService: 'No',
      Contract: 'One year',
      PaperlessBilling: 'No',
      MonthlyCharges: 20.05,
      TotalCharges: 441.1,
    },
  },
].map((p) => ({ ...p, row: normalizeCustomer(p.row) }))
