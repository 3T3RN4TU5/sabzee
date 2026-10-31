"""Static figures (PNG) and the generated model card."""

from __future__ import annotations

from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

BLUE, ORANGE, GREY = "#2563eb", "#f97316", "#94a3b8"


def _save(fig, path: Path) -> None:
    fig.tight_layout()
    fig.savefig(path, dpi=130)
    plt.close(fig)


def write_figures(r: dict, out: Path) -> None:
    out.mkdir(parents=True, exist_ok=True)
    plt.rcParams.update({"font.size": 10, "axes.spines.top": False, "axes.spines.right": False})

    # CV comparison
    cv = r["cv"]["results"]
    names = list(cv)
    fig, ax = plt.subplots(figsize=(6.5, 3.2))
    means = [cv[n]["roc_auc"]["mean"] for n in names]
    stds = [cv[n]["roc_auc"]["std"] for n in names]
    ax.barh([cv[n]["label"] for n in names], means, xerr=stds, color=BLUE, alpha=0.85)
    ax.set_xlim(0.45, 0.9)
    ax.set_xlabel("5-fold CV ROC-AUC (train split)")
    _save(fig, out / "cv_comparison.png")

    # ROC + PR
    fig, axes = plt.subplots(1, 2, figsize=(9, 3.8))
    roc = r["test"]["roc"]
    axes[0].plot([p[0] for p in roc], [p[1] for p in roc], color=BLUE)
    axes[0].plot([0, 1], [0, 1], "--", color=GREY)
    axes[0].set(xlabel="False positive rate", ylabel="True positive rate",
                title=f"ROC (test AUC {r['test']['metrics']['roc_auc']:.3f})")
    pr = r["test"]["pr"]
    axes[1].plot([p[0] for p in pr], [p[1] for p in pr], color=ORANGE)
    axes[1].axhline(r["data"]["test_churn_rate"], ls="--", color=GREY)
    axes[1].set(xlabel="Recall", ylabel="Precision",
                title=f"Precision-recall (AP {r['test']['metrics']['pr_auc']:.3f})")
    _save(fig, out / "roc_pr.png")

    # Calibration
    fig, ax = plt.subplots(figsize=(4.6, 4.2))
    ax.plot([0, 1], [0, 1], "--", color=GREY, label="perfect")
    for key, color, label in (("test_reliability_uncalibrated", GREY, "uncalibrated"),
                              ("test_reliability", BLUE, f"calibrated ({r['calibration']['selected']})")):
        pts = r["calibration"][key]
        ax.plot([p["mean_pred"] for p in pts], [p["frac_pos"] for p in pts], "o-", color=color, label=label)
    ax.set(xlabel="Mean predicted probability", ylabel="Observed churn rate", title="Reliability (test)")
    ax.legend()
    _save(fig, out / "calibration.png")

    # Profit curve
    pc = r["business"]["profit_curve_test"]
    fig, ax = plt.subplots(figsize=(6, 3.4))
    ax.plot([p["threshold"] for p in pc], [p["profit"] for p in pc], color=BLUE)
    ax.axvline(r["business"]["threshold"], color=ORANGE, ls="--", label="chosen threshold")
    ax.axhline(0, color=GREY, lw=0.8)
    ax.set(xlabel="Decision threshold", ylabel="Campaign profit on test ($)", title="Expected profit curve")
    ax.legend()
    _save(fig, out / "profit_curve.png")

    # Permutation importance
    imp = r["importance"]["features"][:12][::-1]
    fig, ax = plt.subplots(figsize=(6, 4))
    ax.barh([d["feature"] for d in imp], [d["mean"] for d in imp], xerr=[d["std"] for d in imp], color=BLUE)
    ax.set_xlabel("ROC-AUC drop when permuted (test)")
    _save(fig, out / "permutation_importance.png")

    # Partial dependence
    fig, axes = plt.subplots(1, 3, figsize=(10, 3.2))
    for ax, key in zip(axes, ("tenure", "MonthlyCharges", "Contract")):
        pts = r["partial_dependence"][key]
        xs = [p["value"] for p in pts]
        ys = [p["mean_prob"] for p in pts]
        if isinstance(xs[0], str):
            ax.bar(xs, ys, color=BLUE)
        else:
            ax.plot(xs, ys, color=BLUE)
        ax.set(title=key, ylabel="mean P(churn)")
    _save(fig, out / "partial_dependence.png")


def _ci(b: dict, k: str, pct: bool = False) -> str:
    v = b[k]
    if pct:
        return f"{v['estimate']:.1%} [{v['lo']:.1%}, {v['hi']:.1%}]"
    return f"{v['estimate']:.3f} [{v['lo']:.3f}, {v['hi']:.3f}]"


def write_model_card(r: dict, bundle: dict, path: Path) -> None:
    b = r["test"]["bootstrap"]
    bus = r["business"]
    cv_rows = "\n".join(
        f"| {v['label']} | {v['roc_auc']['mean']:.3f} ± {v['roc_auc']['std']:.3f} | "
        f"{v['pr_auc']['mean']:.3f} | {v['f1']['mean']:.3f} | {v['brier']['mean']:.3f} |"
        for v in r["cv"]["results"].values())
    tune_rows = "\n".join(
        f"| {k} | {v['best_cv_roc_auc']:.4f} ± {v['best_cv_roc_auc_std']:.4f} | "
        + ", ".join(f"{pk}={pv:.4g}" if isinstance(pv, float) else f"{pk}={pv}"
                    for pk, pv in v["best_params"].items()) + " |"
        for k, v in r["tuning"].items())
    fair_rows = []
    for col, s in r["fairness"]["slices"].items():
        for g in s["groups"]:
            fair_rows.append(f"| {col} | {g['group']} | {g['n']} | {g['base_rate']:.1%} | {g['mean_pred']:.1%} | "
                             f"{g['roc_auc']:.3f} | {g['tpr']:.1%} | {g['fpr']:.1%} |")
    imb = r["imbalance"]
    cal = r["calibration"]["compare"]
    sel = r["selection"]
    imp = ", ".join(d["feature"] for d in r["importance"]["features"][:5])
    text = f"""# Model card — Customer churn predictor

*Generated by `python ml/train.py` on {r['generated_at']} (seed {r['environment']['seed']}, scikit-learn {r['environment']['sklearn']}). Do not edit by hand.*

## Model details
- **Model:** {bundle['model_name']} (`{bundle['estimator']}`), {cal_name(r)}, exported to JSON for in-browser inference ({r['export']['model_type']}, {r['export']['n_trees'] or 'no'} trees, {r['export']['n_features_transformed']} transformed features).
- **Pipeline:** row-wise feature engineering → `ColumnTransformer` (median imputation + standardisation for numerics, most-frequent imputation + one-hot for categoricals) → classifier → optional `CalibratedClassifierCV(FrozenEstimator(...))` fitted on the validation split (method chosen by out-of-fold Brier).
- **Selected hyper-parameters:** {', '.join(f'{k}={v:.4g}' if isinstance(v, float) else f'{k}={v}' for k, v in sel['best_params'].items())}.
- **Author:** Jeevan ([@3T3RN4TU5](https://github.com/3T3RN4TU5)). Portfolio project — not a production system.

## Intended use
Rank existing telecom subscribers by 12-month churn risk so a retention team can decide whom to contact with an incentive. Output is a calibrated probability plus a per-customer explanation. **Not** intended for pricing, credit, or any decision that denies service.

## Data
- IBM *Telco Customer Churn* sample dataset ({r['data']['n_rows'] if 'n_rows' in r['data'] else r['data']['eda']['n_rows']} customers, 19 raw features, churn rate {r['data']['eda']['churn_rate']:.1%}). Source: {r['data']['source']}
- Stratified split: train {r['data']['train']} / validation {r['data']['validation']} / test {r['data']['test']}. Train is used for CV and tuning, validation only for calibration and threshold choice, test only once for the final numbers below.
- 11 customers with tenure 0 have blank `TotalCharges`; these are imputed inside the pipeline (median fitted on train).

## Model selection (5-fold stratified CV on train)
| Model | ROC-AUC | PR-AUC | F1 @0.5 | Brier |
|---|---|---|---|---|
{cv_rows}

Randomised search ({next(iter(r['tuning'].values()))['n_iter']} candidates per family, 5-fold CV ROC-AUC):

| Family | CV ROC-AUC | Best parameters |
|---|---|---|
{tune_rows}

Winner **{sel['winner']}** vs runner-up **{sel['runner_up']}**: mean fold difference {sel['mean_diff']:+.4f} AUC, Nadeau–Bengio corrected t-test p = {sel['p_value']:.3f}. {'The gap is not statistically significant, so the simpler/exportable choice is defensible either way.' if sel['p_value'] > 0.05 else 'The gap is statistically significant.'}

## Class imbalance
Out-of-fold on train, `class_weight=None` vs `"balanced"`: ROC-AUC {imb['none']['roc_auc']:.3f} vs {imb['balanced']['roc_auc']:.3f}, Brier {imb['none']['brier']:.3f} vs {imb['balanced']['brier']:.3f}, mean prediction {imb['none']['mean_pred']:.3f} vs {imb['balanced']['mean_pred']:.3f} (true rate {r['data']['train_churn_rate']:.3f}). Re-weighting barely changes ranking but inflates probabilities; best F1 is {imb['none']['best_f1']:.3f} (threshold {imb['none']['best_f1_threshold']:.2f}) vs {imb['balanced']['best_f1']:.3f}. **Decision:** keep unweighted, well-calibrated probabilities and handle imbalance by choosing the decision threshold from business costs.

## Calibration (out-of-fold on validation)
| Method | Brier | Log loss | ECE |
|---|---|---|---|
""" + "\n".join(f"| {m} | {v['brier']:.4f} | {v['log_loss']:.4f} | {v['ece']:.4f} |" for m, v in cal.items()) + f"""

Selected: **{r['calibration']['selected']}** (lowest Brier). Test ECE {r['test']['metrics']['ece']:.4f} (uncalibrated {r['test']['metrics']['ece_uncalibrated']:.4f}).

## Decision threshold (business cost)
Assumptions: a churner's revenue at risk = {bus['horizon_months']:.0f} × MonthlyCharges; contacting costs ${bus['offer_cost']:.0f}; the offer saves {bus['offer_success']:.0%} of would-be churners. Profit-maximising threshold on validation: **{bus['threshold']:.3f}** (F1-optimal would be {bus['f1_threshold']:.2f}).

Test-set campaign profit vs. alternatives:

| Strategy | Profit on test ({r['data']['test']} customers) |
|---|---|
""" + "\n".join(f"| {k.replace('_', ' ')} | ${v:,.0f} |" for k, v in bus["strategies"].items()) + f"""

## Held-out test performance (95% bootstrap CI, {r['test']['n_boot']} resamples)
| Metric | Value |
|---|---|
| ROC-AUC | {_ci(b, 'roc_auc')} |
| PR-AUC (average precision) | {_ci(b, 'pr_auc')} |
| Brier score | {_ci(b, 'brier')} |
| Recall @ {bus['threshold']:.3f} | {_ci(b, 'recall', True)} |
| Precision @ {bus['threshold']:.3f} | {_ci(b, 'precision', True)} |
| F1 @ {bus['threshold']:.3f} | {_ci(b, 'f1')} |
| Campaign profit | ${b['profit']['estimate']:,.0f} [${b['profit']['lo']:,.0f}, ${b['profit']['hi']:,.0f}] |

## Explainability
- Global: permutation importance (ROC-AUC drop on test). Top features: {imp}. Partial dependence for tenure, monthly charges, contract and more is in `reports/metrics.json` and the web app.
- Local: {'exact TreeSHAP (path-dependent, Lundberg et al. 2018) on the boosted trees' if bundle['explanation']['method'] == 'tree_shap' else 'exact linear SHAP: coefficient × (value − training mean)'}, computed in the browser in {bundle['explanation']['space']} space. Contributions sum exactly to the model's raw score (max additivity gap {r['export']['shap_additivity_gap']:.1e}).

## Fairness slices (test set, threshold {bus['threshold']:.2f})
| Attribute | Group | n | Churn rate | Mean pred. | ROC-AUC | TPR | FPR |
|---|---|---|---|---|---|---|---|
""" + "\n".join(fair_rows) + f"""

Equal-opportunity (TPR) gap — gender: {r['fairness']['slices']['gender']['equal_opportunity_gap']:.1%}, senior citizen: {r['fairness']['slices']['SeniorCitizen']['equal_opportunity_gap']:.1%}. Seniors churn more and are flagged more often; the model is similarly calibrated across groups, so differences in flag rate track differences in base rate rather than miscalibration. Sensitive attributes (gender, SeniorCitizen) are model inputs here because the public dataset includes them; a production version should test removing them and monitor these gaps.

## Limitations
- Single, small (7k rows), US-centric sample dataset of unknown vintage; no time dimension, so the split is random rather than temporal and real-world drift is untested.
- The cost model is a simple, documented assumption; offer success rate in particular should come from an A/B test.
- Churn label is observational; the model predicts *who churns*, not *who is persuadable* (uplift modelling would be the next step).

## Reproducibility
`pip install -r ml/requirements.txt && python ml/train.py` — fixed seeds throughout; outputs are written to `public/model/` and `ml/reports/`. Exported JSON reproduces scikit-learn probabilities to {r['export']['max_abs_prob_diff']:.1e} (Python twin) and is checked again in TypeScript by `npm test`.
"""
    path.write_text(text)


def cal_name(r: dict) -> str:
    return {"none": "no post-hoc calibration (raw probabilities had the best validation Brier)",
            "sigmoid": "Platt (sigmoid) calibration", "isotonic": "isotonic calibration"}[r["calibration"]["selected"]]
