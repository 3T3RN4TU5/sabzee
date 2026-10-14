import type { ReactNode } from 'react'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Card } from '../components/ui.tsx'
import type { Artefacts } from '../lib/data.ts'
import { pct, usd } from '../lib/format.ts'

const REPO = 'https://github.com/Jeevan2410/churn-predictor-ml'

function Row({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-white/[0.05] py-2 text-sm sm:grid-cols-[180px_1fr]">
      <dt className="text-slate-400">{k}</dt>
      <dd className="text-slate-200">{children}</dd>
    </div>
  )
}

const STEPS = [
  { t: 'Raw CSV', d: '7,043 customers · 19 inputs' },
  { t: 'Stratified split', d: '60% train · 20% val · 20% test' },
  { t: 'Feature pipeline', d: 'engineer → impute → scale / one-hot' },
  { t: 'CV + tuning', d: '5 models · RandomizedSearchCV' },
  { t: 'Calibrate + threshold', d: 'on validation (out-of-fold)' },
  { t: 'Test once', d: 'bootstrap CIs · fairness · importance' },
  { t: 'Export JSON', d: 'preprocessing + model + calibrator' },
  { t: 'Browser inference', d: 'TypeScript · SHAP · parity-tested' },
]

export function ModelCardPage({ data }: { data: Artefacts }) {
  const { report: r, champion, challenger } = data
  const b = r.test.bootstrap
  const eda = r.data.eda
  return (
    <div className="space-y-5">
      <Card eyebrow="Methodology" title="From CSV to an explainable prediction in your browser">
        <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.t} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
              <div className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-full bg-sky-500/15 font-mono text-xs text-sky-200">{i + 1}</span>
                <span className="text-sm font-semibold text-slate-100">{s.t}</span>
              </div>
              <div className="mt-1 text-xs text-slate-400">{s.d}</div>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-sm text-slate-400">
          Every fitted statistic (medians, means, vocabularies) is learned inside a scikit-learn <code>Pipeline</code> on the training fold only. The
          test set is touched exactly once. The exported JSON reproduces scikit-learn&apos;s probabilities to {r.export.max_abs_prob_diff.toExponential(1)} in Python and
          is checked again in TypeScript on {r.export.n_fixture_rows} held-out customers in CI.
        </p>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card eyebrow="Model card" title="Model details">
          <dl>
            <Row k="Champion">{champion.model_name} (<code>{champion.estimator}</code>), {r.calibration.selected === 'none' ? 'no extra calibration needed (best validation Brier)' : `${r.calibration.selected} calibration`}</Row>
            <Row k="Hyper-parameters">{Object.entries(r.tuning[r.selection.winner].best_params).map(([k, v]) => `${k}=${typeof v === 'number' ? +v.toPrecision(3) : v}`).join(', ')}</Row>
            <Row k="Challenger">{challenger.model_name}, {r.challenger.n_trees} trees, explained with exact TreeSHAP</Row>
            <Row k="Inputs">19 raw fields + 6 engineered (service count, avg. monthly spend, charge ratio, auto-pay, has family, tenure bucket) → {r.export.n_features_transformed} model features</Row>
            <Row k="Output">Calibrated P(churn); contact if ≥ {pct(r.business.threshold)}</Row>
            <Row k="Training data">IBM Telco Customer Churn, {eda.n_rows.toLocaleString()} rows, churn rate {pct(eda.churn_rate)}; split {r.data.train}/{r.data.validation}/{r.data.test}</Row>
            <Row k="Reproducibility">seed {r.environment.seed}, Python {r.environment.python}, scikit-learn {r.environment.sklearn}; trained {r.generated_at} in {Math.round(r.runtime_s)} s</Row>
            <Row k="Author">Jeevan · <a className="text-sky-300 hover:underline" href={REPO}>GitHub</a></Row>
          </dl>
        </Card>

        <Card eyebrow="Held-out test set · 95% bootstrap CI" title="Performance">
          <dl>
            <Row k="ROC-AUC">{b.roc_auc.estimate.toFixed(3)} [{b.roc_auc.lo.toFixed(3)}, {b.roc_auc.hi.toFixed(3)}]</Row>
            <Row k="PR-AUC">{b.pr_auc.estimate.toFixed(3)} [{b.pr_auc.lo.toFixed(3)}, {b.pr_auc.hi.toFixed(3)}] (base rate {pct(r.data.test_churn_rate)})</Row>
            <Row k="Brier score">{b.brier.estimate.toFixed(4)} [{b.brier.lo.toFixed(4)}, {b.brier.hi.toFixed(4)}]; ECE {r.test.metrics.ece.toFixed(3)}</Row>
            <Row k={`Recall / precision @ ${pct(r.business.threshold, 0)}`}>{pct(b.recall.estimate)} / {pct(b.precision.estimate)}</Row>
            <Row k="Campaign profit">{usd(b.profit.estimate)} [{usd(b.profit.lo)}, {usd(b.profit.hi)}] vs {usd(r.business.strategies.contact_everyone)} contacting everyone, {usd(r.business.strategies.month_to_month_rule)} for a month-to-month rule</Row>
            <Row k="Challenger">ROC-AUC {r.challenger.metrics.roc_auc.toFixed(3)} [{r.challenger.bootstrap.roc_auc.lo.toFixed(3)}, {r.challenger.bootstrap.roc_auc.hi.toFixed(3)}]</Row>
          </dl>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card eyebrow="Decisions" title="Key modelling choices">
          <ul className="space-y-2.5 text-sm text-slate-300">
            {[
              `Linear model wins: tuned logistic regression ties the tree ensembles in CV (p = ${r.selection.p_value.toFixed(2)}) and is fully transparent.`,
              'Imbalance handled with the threshold, not class weights — weights inflated probabilities and worsened Brier with no AUC gain.',
              `Threshold set by economics: offer ${usd(r.business.offer_cost)}, ${pct(r.business.offer_success, 0)} save rate, ${r.business.horizon_months}-month value at risk → ${pct(r.business.threshold)} (F1-optimal would be ${pct(r.business.f1_threshold, 0)}).`,
              'Calibration method chosen by out-of-fold Brier on validation; none / Platt / isotonic compared.',
            ].map((t) => (
              <li key={t} className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-300" aria-hidden="true" />{t}</li>
            ))}
          </ul>
        </Card>
        <Card eyebrow="Data insights" title="What drives churn (EDA)">
          <ul className="space-y-2 text-sm text-slate-300">
            {eda.categorical_churn_rates.Contract.map((c) => (
              <li key={c.level} className="flex justify-between gap-3"><span>{c.level} contract</span><span className="font-mono">{pct(c.churn_rate)} <span className="text-slate-500">n={c.n}</span></span></li>
            ))}
            {eda.categorical_churn_rates.InternetService.map((c) => (
              <li key={c.level} className="flex justify-between gap-3"><span>Internet: {c.level}</span><span className="font-mono">{pct(c.churn_rate)}</span></li>
            ))}
            <li className="flex justify-between gap-3"><span>Mean tenure churned vs. retained</span><span className="font-mono">{eda.numeric.tenure.mean_churned.toFixed(0)} vs {eda.numeric.tenure.mean_retained.toFixed(0)} mo</span></li>
          </ul>
        </Card>
        <Card eyebrow="Use responsibly" title="Limitations">
          <ul className="space-y-2.5 text-sm text-slate-300">
            {[
              'Small, US-centric sample dataset with no timestamps: the split is random, so drift over time is untested.',
              'Predicts who will churn, not who is persuadable — uplift modelling / an A/B test should set the save rate.',
              'Gender and senior status are inputs because the public data has them; production should test removing them and monitor slice gaps.',
              'Intended for retention offers (a benefit), not pricing, credit, or denial of service.',
            ].map((t) => (
              <li key={t} className="flex gap-2"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-300" aria-hidden="true" />{t}</li>
            ))}
          </ul>
        </Card>
      </div>
      <p className="text-xs text-slate-500">
        The full generated model card lives in <a className="text-sky-300 hover:underline" href={`${REPO}/blob/main/ml/MODEL_CARD.md`}>ml/MODEL_CARD.md</a>; the complete experiment log in <a className="text-sky-300 hover:underline" href={`${REPO}/blob/main/ml/reports/metrics.json`}>ml/reports/metrics.json</a>.
      </p>
    </div>
  )
}
