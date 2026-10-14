/** Static artefacts produced by `python ml/train.py`, fetched once and cached. */
import { useEffect, useState } from 'react'
import type { ModelBundle } from '../ml/types.ts'

export interface Ci {
  estimate: number
  lo: number
  hi: number
  std?: number
}
export interface CvRow {
  label: string
  fit_time_s: number
  roc_auc: { mean: number; std: number }
  pr_auc: { mean: number; std: number }
  f1: { mean: number; std: number }
  brier: { mean: number; std: number }
}
export interface SliceGroup {
  group: string
  n: number
  base_rate: number
  mean_pred: number
  roc_auc: number | null
  tpr: number
  fpr: number
  precision: number
  flag_rate: number
  brier: number
}
export interface CalibCompare {
  brier: number
  log_loss: number
  ece: number
  roc_auc: number
  reliability?: { mean_pred: number; frac_pos: number; n: number }[]
}

export interface Report {
  generated_at: string
  runtime_s: number
  environment: { python: string; sklearn: string; numpy: string; pandas: string; seed: number }
  data: {
    source: string
    train: number
    validation: number
    test: number
    test_churn_rate: number
    train_churn_rate: number
    eda: {
      n_rows: number
      churn_rate: number
      numeric: Record<string, { mean: number; median: number; mean_churned: number; mean_retained: number }>
      categorical_churn_rates: Record<string, { level: string; churn_rate: number; n: number }[]>
    }
  }
  cv: { folds: number; results: Record<string, CvRow> }
  tuning: Record<string, { label: string; n_iter: number; best_params: Record<string, string | number | null>; best_cv_roc_auc: number; best_cv_roc_auc_std: number }>
  selection: { winner: string; runner_up: string; challenger: string; mean_diff: number; t: number; p_value: number; model_name: string }
  imbalance: Record<'none' | 'balanced', { roc_auc: number; pr_auc: number; brier: number; mean_pred: number; 'f1_at_0.5': number; 'recall_at_0.5': number; best_f1: number; best_f1_threshold: number }>
  calibration: { selected: string; compare: Record<string, CalibCompare> }
  business: {
    offer_cost: number
    offer_success: number
    horizon_months: number
    threshold: number
    f1_threshold: number
    test_profit: number
    strategies: Record<string, number>
  }
  test: {
    metrics: { roc_auc: number; pr_auc: number; brier: number; log_loss: number; ece: number; ece_uncalibrated: number; brier_uncalibrated: number }
    bootstrap: Record<string, Ci>
    n_boot: number
  }
  challenger: {
    family: string
    model_name: string
    calibration: string
    metrics: { roc_auc: number; pr_auc: number; brier: number }
    bootstrap: { roc_auc: Ci }
    auc_diff_vs_champion: Ci
    profit: number
    n_trees: number
  }
  importance: { method: string; n_repeats: number; features: { feature: string; mean: number; std: number }[] }
  partial_dependence: Record<string, { value: string | number; mean_prob: number }[]>
  fairness: { threshold: number; slices: Record<string, { groups: SliceGroup[]; equal_opportunity_gap: number; demographic_parity_gap: number }> }
  export: { max_abs_prob_diff: number; shap_additivity_gap: number; n_fixture_rows: number; n_features_transformed: number }
}

export interface TestPredictions {
  columns: string[]
  rows: [number, number, number, number, string, number, string, string, string][]
}

export interface Artefacts {
  champion: ModelBundle
  challenger: ModelBundle
  report: Report
  testPreds: TestPredictions
}

let cache: Promise<Artefacts> | null = null

const getJson = async <T,>(path: string): Promise<T> => {
  const res = await fetch(`${import.meta.env.BASE_URL}${path}`)
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`)
  return (await res.json()) as T
}

export function loadArtefacts(): Promise<Artefacts> {
  cache ??= Promise.all([
    getJson<ModelBundle>('model/model.json'),
    getJson<ModelBundle>('model/model_challenger.json'),
    getJson<Report>('model/report.json'),
    getJson<TestPredictions>('model/test_predictions.json'),
  ]).then(([champion, challenger, report, testPreds]) => ({ champion, challenger, report, testPreds }))
  return cache
}

export type LoadState = { status: 'loading' } | { status: 'error'; error: string } | { status: 'ready'; data: Artefacts }

export function useArtefacts(): LoadState {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  useEffect(() => {
    let alive = true
    loadArtefacts().then(
      (data) => alive && setState({ status: 'ready', data }),
      (e: unknown) => alive && setState({ status: 'error', error: String(e) }),
    )
    return () => {
      alive = false
    }
  }, [])
  return state
}
