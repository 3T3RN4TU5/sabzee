/** Shape of `public/model/model*.json`, written by `ml/churn/export.py`. */

export type RawValue = string | number | null
/** One customer as raw inputs (same column names as the Telco CSV). */
export type CustomerRow = Record<string, RawValue>

export interface Tree {
  feature: number[]
  threshold: number[]
  left: number[]
  right: number[]
  missing_left: boolean[]
  value: number[]
  cover: number[]
}

export type ModelSpec =
  | { type: 'logistic'; coef: number[]; intercept: number }
  | { type: 'gbdt'; baseline: number; link: 'logit'; trees: Tree[] }
  | { type: 'forest'; trees: Tree[] }

export type Calibration =
  | { method: 'isotonic'; x: number[]; y: number[] }
  | { method: 'sigmoid'; a: number; b: number }
  | { method: 'none' }

export interface ModelBundle {
  format_version: number
  sklearn_version: string
  estimator: string
  model_name: string
  role: 'champion' | 'challenger'
  threshold: number
  business: BusinessParams
  raw_features: string[]
  engineering: { service_cols: string[]; tenure_edges: number[]; tenure_labels: string[] }
  preprocess: {
    numeric: { features: string[]; impute: number[]; mean: number[]; scale: number[] }
    categorical: { features: string[]; impute: string[]; categories: string[][] }
  }
  feature_names: string[]
  feature_groups: string[]
  model: ModelSpec
  score_space: 'logit' | 'probability'
  calibration: Calibration
  explanation: { method: 'linear' | 'tree_shap'; space: string; background_mean: number[] }
}

export interface BusinessParams {
  offer_cost: number
  offer_success: number
  horizon_months: number
}
