// Shapes of the JSON aggregates written by analysis/run_pipeline.py.

export interface Meta {
  title: string
  dataset: string
  dataset_url: string
  period_start: string
  period_end: string
  generated: string
  raw_rows: number
  clean_lines: number
  revenue: number
  orders: number
  customers: number
  products: number
  countries: number
  quality: QualitySummary
  experiment_simulated: boolean
}

/** Row = [month, country, category, revenue, units, orders, customers, returns]; index 0 = "All". */
export type CubeRow = [number, number, number, number, number, number, number, number]

export interface Cube {
  months: string[]
  countries: string[]
  categories: string[]
  fields: string[]
  rows: CubeRow[]
}

export interface MonthRow {
  month_label: string
  revenue: number
  orders: number
  active_customers: number
  units: number
  trading_days: number
  aov: number
  returns_value: number
  is_partial: boolean
  mom_growth: number | null
  yoy_growth: number | null
  revenue_3m_avg: number
  revenue_running_total: number
  share_of_total: number
}

export interface Monthly {
  months: MonthRow[]
  like_for_like: {
    cur_start: string
    cur_end: string
    prev_start: string
    prev_end: string
    cur_revenue: number
    prev_revenue: number
    cur_orders: number
    prev_orders: number
  }
  countries: {
    country: string
    revenue: number
    orders: number
    customers: number
    aov: number
    revenue_rank: number
    revenue_share: number
  }[]
  categories: {
    category: string
    revenue: number
    units: number
    products: number
    revenue_share: number
    revenue_per_product: number
  }[]
  weekday_hour: { day_of_week: number; day_name: string; hour: number; orders: number; revenue: number }[]
}

export interface ForecastDay {
  date: string
  actual?: number
  hw?: number
  naive?: number
  lo80?: number
  hi80?: number
  lo95?: number
  hi95?: number
  forecast?: number
}

export interface ForecastModel {
  model: string
  key: string
  mape_daily: number
  wape_daily: number
  mape_weekly: number
  rmse_daily: number
  bias: number
}

export interface Forecast {
  train_start: string
  train_end: string
  holdout_start: string
  holdout_end: string
  horizon_days: number
  closed_weekday: string
  models: ForecastModel[]
  interval_coverage_80: number
  params: Record<string, number>
  forecast_total: number
  forecast_total_lo80: number
  forecast_total_hi80: number
  same_period_last_year: number
  yoy_growth_lfl: number
  yoy_anchored_total: number
  daily: ForecastDay[]
  weekly: { week: string; actual: number; hw?: number }[]
}

export interface Segment {
  segment: string
  customers: number
  revenue: number
  median_recency: number
  median_frequency: number
  median_monetary: number
  mean_recency: number
  mean_frequency: number
  mean_monetary: number
  customer_share: number
  revenue_share: number
  action: string
}

export interface Customers {
  cohorts: { cohort: string; size: number; retention: number[] }[]
  avg_month1_retention_excl_first: number
  repeat: {
    customers: number
    repeat_customers: number
    repeat_rate: number
    avg_orders_per_customer: number
    median_days_to_second_order: number
    median_days_between_orders: number
    revenue_share_repeat_orders: number
  }
  repeat_by_cohort: { cohort: string; customers: number; repeat_90d: number; repeat_rate_90d: number }[]
  segmentation: {
    k_selection: { k: number; silhouette: number; inertia: number }[]
    chosen_k: number
    features: string[]
    segments: Segment[]
    crosstab: { segment: string; rfm_segment: string; customers: number }[]
    scatter: { segment: string; recency: number; frequency: number; monetary: number }[]
    rfm_grid: { r_score: number; f_score: number; customers: number; avg_monetary: number }[]
    rule_segments: { rfm_segment: string; customers: number; revenue: number; revenue_share: number }[]
    customers: number
  }
}

export interface Clv {
  method: string
  transaction_definition: string
  calibration_end: string
  holdout_days: number
  params_mbgnbd: { r: number; alpha: number; a: number; b: number; loglik: number }
  params_gamma_gamma: { p: number; q: number; v: number }
  validation: { bucket: string; customers: number; predicted: number; actual: number }[]
  validation_total_predicted: number
  validation_total_actual: number
  validation_error: number
  validation_corr: number
  freq_monetary_corr: number
  months: number
  monthly_discount: number
  customers: number
  total_clv_12m: number
  mean_clv_12m: number
  median_clv_12m: number
  dropout_probability: number
  mean_p_alive: number
  benchmark_jan_cohort_realised_11m: number
  benchmark_jan_cohort_model_12m: number
  benchmark_jan_cohort_size: number
  deciles: { decile: number; customers: number; clv: number; mean_clv: number; share: number }[]
  by_segment: {
    segment: string
    customers: number
    total_clv: number
    mean_clv: number
    median_clv: number
    mean_p_alive: number
    exp_tx_12m: number
  }[]
  histogram: { bucket: string; customers: number }[]
  top_customers: {
    customer_id: string
    segment: string
    x: number
    exp_tx_12m: number
    exp_spend: number
    clv_12m: number
  }[]
}

export interface BasketPair {
  product_a: string
  product_b: string
  category_a: string
  category_b: string
  baskets_together: number
  support: number
  confidence_a_to_b: number
  confidence_b_to_a: number
  lift: number
  cross_category: boolean
}

export interface TopProduct {
  stock_code: string
  description: string
  category: string
  revenue: number
  units: number
  orders: number
  customers: number
  revenue_rank: number
  cum_product_share: number
  cum_revenue_share: number
  abc_class: string
}

export interface Products {
  n_products: number
  pareto_curve: { cum_product_share: number; cum_revenue_share: number }[]
  top_share: Record<string, number>
  abc: {
    abc_class: string
    products: number
    revenue: number
    units: number
    product_share: number
    revenue_share: number
  }[]
  category_abc: { category: string; A?: number; B?: number; C?: number }[]
  top_products: TopProduct[]
  basket: { n_pairs: number; min_support: number; n_baskets: number; pairs: BasketPair[] }
}

export interface Experiment {
  name: string
  simulated: boolean
  start: string
  end: string
  pre_registration: {
    hypothesis: string
    primary_metric: string
    secondary_metrics: string[]
    baseline_cvr: number
    mde_relative: number
    alpha: number
    power: number
    split: number
    planned_days: number
    required_n_per_arm: number
  }
  arms: Record<'control' | 'treatment', {
    visitors: number
    orders: number
    cvr: number
    aov: number
    median_order: number
    rpv: number
    revenue: number
  }>
  srm: { chi2: number; p_value: number; observed_share: number; passed: boolean }
  conversion: {
    p_control: number
    p_treatment: number
    diff: number
    rel_lift: number
    z: number
    p_value: number
    ci_low: number
    ci_high: number
    rel_ci_low: number
    rel_ci_high: number
  }
  aov: {
    mean_control: number
    mean_treatment: number
    diff: number
    rel_diff: number
    t: number
    df: number
    p_value: number
    ci_low: number
    ci_high: number
    boot_diff: number
    boot_ci_low: number
    boot_ci_high: number
    median_diff: number
    median_ci_low: number
    median_ci_high: number
  }
  rpv: {
    control: number
    treatment: number
    diff: number
    ci_low: number
    ci_high: number
    rel_diff: number
    rel_ci_low: number
    rel_ci_high: number
  }
  power: {
    achieved_mde_relative: number
    observed_effect_power: number
    n_per_arm: number
    curve: { lift: number; power: number }[]
  }
  by_device: {
    device: string
    n_control: number
    n_treatment: number
    cvr_control: number
    cvr_treatment: number
    rel_lift: number
    rel_ci_low: number
    rel_ci_high: number
    p_value: number
  }[]
  daily: {
    date: string
    visitors: number
    rel_lift: number
    rel_ci_low: number
    rel_ci_high: number
    p_value: number
  }[]
  decision: string
  planted_truth: { desktop_lift: number; mobile_lift: number; aov_effect: number }
}

export interface QualitySummary {
  pass: number
  warn: number
  fail: number
}

export interface QualityCheck {
  name: string
  stage: string
  category: string
  status: 'pass' | 'warn' | 'fail'
  observed: string | number
  expected: string
  detail: string
}

export interface Quality {
  summary: QualitySummary
  checks: QualityCheck[]
  profile: {
    rows: number
    columns: { column: string; null_rate: number; distinct: number }[]
    negative_quantity_rows: number
    non_positive_price_rows: number
    cancellation_rows: number
    max_quantity: number
    min_quantity: number
  }
  ledger: {
    rule: string
    description: string
    rows: number
    examples: Record<string, string | number | null>[]
  }[]
  kept: { sales_lines: number; return_lines: number; guest_lines: number }
  tables: Record<string, number>
}

export interface DataFiles {
  meta: Meta
  cube: Cube
  monthly: Monthly
  forecast: Forecast
  customers: Customers
  clv: Clv
  products: Products
  experiment: Experiment
  quality: Quality
}
