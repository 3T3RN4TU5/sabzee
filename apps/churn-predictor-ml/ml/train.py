"""End-to-end training pipeline for the churn predictor.

    python ml/train.py            # full run (~2-4 min on a laptop)
    python ml/train.py --fast     # smaller search / bootstrap, for smoke tests

Regenerates:
    public/model/model.json          exported model for browser inference
    public/model/report.json         metrics + curves consumed by the web app
    public/model/test_predictions.json  held-out predictions (live threshold UI)
    public/model/parity_fixture.json 200 held-out rows + sklearn probabilities
    public/sample_customers.csv      demo file for batch scoring
    ml/reports/metrics.json          experiment log (same content as report.json)
    ml/reports/figures/*.png         static plots
    ml/MODEL_CARD.md                 model card
"""

from __future__ import annotations

import argparse
import json
import platform
import sys
import time
import warnings
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))

from scipy import stats  # noqa: E402
from sklearn.base import clone  # noqa: E402
from sklearn.calibration import CalibratedClassifierCV  # noqa: E402
from sklearn.frozen import FrozenEstimator  # noqa: E402
from sklearn.inspection import permutation_importance  # noqa: E402
from sklearn.metrics import roc_auc_score  # noqa: E402
from sklearn.model_selection import (  # noqa: E402
    RandomizedSearchCV,
    StratifiedKFold,
    cross_val_predict,
    cross_validate,
    train_test_split,
)

from churn import SEED, inference  # noqa: E402
from churn import metrics as M  # noqa: E402
from churn.data import DATA_PATH, ID_COL, RAW_FEATURES, SOURCE_URL, TARGET, eda_summary, load  # noqa: E402
from churn.export import export_model  # noqa: E402
from churn.modeling import FAMILY_LABELS, MODEL_LABELS, SEARCH_SPACES, make_pipeline  # noqa: E402
from churn.report import write_figures, write_model_card  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
MODEL_DIR = PUBLIC / "model"
REPORTS = ROOT / "ml" / "reports"

SCORING = {"roc_auc": "roc_auc", "pr_auc": "average_precision", "f1": "f1", "brier": "neg_brier_score"}


def log(msg: str) -> None:
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def corrected_ttest(a: np.ndarray, b: np.ndarray, n_train: int, n_test: int) -> dict:
    """Nadeau & Bengio corrected resampled t-test for paired CV scores."""
    d = np.asarray(a) - np.asarray(b)
    k = len(d)
    var = d.var(ddof=1) * (1 / k + n_test / n_train)
    t = d.mean() / np.sqrt(var) if var > 0 else np.inf
    p = 2 * stats.t.sf(abs(t), df=k - 1)
    return {"mean_diff": float(d.mean()), "t": float(t), "p_value": float(p)}


def _jsonable(v):
    if isinstance(v, (str, type(None))):
        return v
    f = float(v)
    return int(f) if f.is_integer() and not isinstance(v, float) else f


def to_records(df: pd.DataFrame) -> list[dict]:
    recs = []
    for row in df.to_dict(orient="records"):
        clean = {}
        for k, v in row.items():
            if isinstance(v, float) and np.isnan(v):
                clean[k] = None
            elif isinstance(v, (np.floating, float)):
                clean[k] = float(v)
            elif isinstance(v, (np.integer,)):
                clean[k] = int(v)
            else:
                clean[k] = v
        recs.append(clean)
    return recs


def raw_row(X: pd.DataFrame, i: int) -> dict:
    return to_records(X.iloc[[i]])[0]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--fast", action="store_true", help="smaller search & bootstrap")
    args = ap.parse_args()
    n_iter = 8 if args.fast else 30
    n_boot = 200 if args.fast else 1000
    n_perm = 3 if args.fast else 10
    warnings.filterwarnings("ignore", category=FutureWarning)
    t0 = time.time()
    rng_seed = SEED
    params = M.BusinessParams()

    # ── 1. Data ──────────────────────────────────────────────────────────────
    X, y, ids = load()
    log(f"loaded {len(X)} rows, churn rate {y.mean():.3f}")
    eda = eda_summary(X, y)

    # 60 / 20 / 20 stratified split: train (CV + tuning), validation
    # (calibration + threshold), test (touched once, at the end).
    X_tmp, X_test, y_tmp, y_test, id_tmp, id_test = train_test_split(
        X, y, ids, test_size=0.20, stratify=y, random_state=rng_seed)
    X_train, X_val, y_train, y_val = train_test_split(
        X_tmp, y_tmp, test_size=0.25, stratify=y_tmp, random_state=rng_seed)
    split = {"train": len(X_train), "validation": len(X_val), "test": len(X_test),
             "train_churn_rate": float(y_train.mean()), "val_churn_rate": float(y_val.mean()),
             "test_churn_rate": float(y_test.mean())}
    log(f"split {split}")
    ytr, yva, yte = y_train.to_numpy(), y_val.to_numpy(), y_test.to_numpy()

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=rng_seed)

    # ── 2. Baseline CV comparison ───────────────────────────────────────────
    cv_results: dict[str, dict] = {}
    fold_auc: dict[str, np.ndarray] = {}
    for name in MODEL_LABELS:
        res = cross_validate(make_pipeline(name), X_train, y_train, cv=cv, scoring=SCORING, n_jobs=-1)
        row = {"label": MODEL_LABELS[name], "fit_time_s": float(res["fit_time"].mean())}
        for k in SCORING:
            vals = res[f"test_{k}"] * (-1 if k == "brier" else 1)
            row[k] = {"mean": float(vals.mean()), "std": float(vals.std(ddof=1))}
        cv_results[name] = row
        fold_auc[name] = res["test_roc_auc"]
        log(f"cv {name:14s} auc={row['roc_auc']['mean']:.4f}±{row['roc_auc']['std']:.4f} "
            f"brier={row['brier']['mean']:.4f}")

    # ── 3. Hyper-parameter search for every model family ──────────────────
    tuning: dict[str, dict] = {}
    searches = {}
    for fam in ("logreg", "random_forest", "hist_gb"):
        search = RandomizedSearchCV(
            make_pipeline(fam), SEARCH_SPACES[fam], n_iter=n_iter, scoring="roc_auc", cv=cv,
            random_state=rng_seed, n_jobs=-1, refit=False)
        search.fit(X_train, y_train)
        best_i = int(search.best_index_)
        folds = np.array([search.cv_results_[f"split{k}_test_score"][best_i] for k in range(5)])
        searches[fam] = (search.best_params_, folds)
        tuning[fam] = {
            "label": FAMILY_LABELS[fam],
            "n_iter": n_iter,
            "best_params": {k.replace("clf__", ""): _jsonable(v) for k, v in search.best_params_.items()},
            "best_cv_roc_auc": float(search.best_score_),
            "best_cv_roc_auc_std": float(folds.std(ddof=1)),
        }
        log(f"tuned {fam}: auc={search.best_score_:.4f} {tuning[fam]['best_params']}")

    ranked_fams = sorted(tuning, key=lambda f: -tuning[f]["best_cv_roc_auc"])
    winner, runner = ranked_fams[0], ranked_fams[1]
    # The challenger is shipped too, so the app can compare a linear model with
    # a tree ensemble explained by TreeSHAP. Prefer the compact boosted model.
    challenger = "hist_gb" if winner != "hist_gb" else "logreg"
    n_fold_test = len(X_train) // 5
    significance = corrected_ttest(searches[winner][1], searches[runner][1],
                                   len(X_train) - n_fold_test, n_fold_test)
    significance.update({"winner": winner, "runner_up": runner, "challenger": challenger})
    log(f"winner={winner} vs {runner}: {significance}")
    best_params = searches[winner][0]

    def final_pipe(class_weight=None, fam=None):
        fam = fam or winner
        p = make_pipeline(fam, class_weight)
        p.set_params(**searches[fam][0])
        return p

    # ── 4. Class-imbalance experiment: class weights vs threshold moving ────
    imbalance = {}
    for cw in (None, "balanced"):
        oof = cross_val_predict(final_pipe(cw), X_train, y_train, cv=cv, method="predict_proba",
                                n_jobs=-1)[:, 1]
        grid = np.linspace(0.05, 0.95, 91)
        f1s = [M.threshold_metrics(ytr, oof, t)["f1"] for t in grid]
        bi = int(np.argmax(f1s))
        at05 = M.threshold_metrics(ytr, oof, 0.5)
        imbalance["balanced" if cw else "none"] = {
            "roc_auc": float(roc_auc_score(ytr, oof)),
            "pr_auc": M.core_metrics(ytr, oof)["pr_auc"],
            "brier": M.core_metrics(ytr, oof)["brier"],
            "mean_pred": float(oof.mean()),
            "f1_at_0.5": at05["f1"], "recall_at_0.5": at05["recall"],
            "best_f1": float(f1s[bi]), "best_f1_threshold": float(grid[bi]),
        }
    log(f"imbalance {imbalance}")

    # ── 5. Fit final model on train; calibrate on validation ───────────────
    cal_cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=rng_seed + 1)

    def fit_and_calibrate(fam: str):
        base = final_pipe(fam=fam).fit(X_train, y_train)
        compare, oof = {}, {}
        for method in ("none", "sigmoid", "isotonic"):
            if method == "none":
                p = base.predict_proba(X_val)[:, 1]
            else:
                # Out-of-fold within validation so method choice and threshold
                # are not judged on the data the calibrator was fitted on.
                p = np.zeros(len(X_val))
                for tr_i, te_i in cal_cv.split(X_val, y_val):
                    c = CalibratedClassifierCV(FrozenEstimator(base), method=method)
                    c.fit(X_val.iloc[tr_i], y_val.iloc[tr_i])
                    p[te_i] = c.predict_proba(X_val.iloc[te_i])[:, 1]
            oof[method] = p
            compare[method] = {
                "brier": M.core_metrics(yva, p)["brier"],
                "log_loss": M.core_metrics(yva, p)["log_loss"],
                "ece": M.expected_calibration_error(yva, p),
                "roc_auc": float(roc_auc_score(yva, p)),
                "reliability": M.reliability_curve(yva, p),
            }
        method = min(compare, key=lambda m: compare[m]["brier"])
        log(f"calibration[{fam}] " + ", ".join(f"{m}: brier={v['brier']:.4f} ece={v['ece']:.4f}"
                                              for m, v in compare.items()) + f" -> {method}")
        final = base if method == "none" else CalibratedClassifierCV(
            FrozenEstimator(base), method=method).fit(X_val, y_val)
        return base, final, method, compare, oof[method]

    model, final, cal_method, calib_compare, p_val = fit_and_calibrate(winner)
    ch_model, ch_final, ch_cal_method, ch_calib_compare, _ = fit_and_calibrate(challenger)

    # ── 6. Business threshold on (out-of-fold) validation probabilities ────
    value_val = params.horizon_months * X_val["MonthlyCharges"].to_numpy()
    threshold, val_profit = M.best_threshold(yva, p_val, value_val, params)
    f1_grid = np.linspace(0.05, 0.95, 181)
    f1_threshold = float(f1_grid[int(np.argmax([M.threshold_metrics(yva, p_val, t)["f1"] for t in f1_grid]))])
    log(f"profit-optimal threshold={threshold:.3f} (val profit ${val_profit:,.0f}); F1-optimal={f1_threshold:.3f}")

    # ── 7. Held-out test evaluation ─────────────────────────────────────────
    p_test = final.predict_proba(X_test)[:, 1]
    p_test_raw = model.predict_proba(X_test)[:, 1]
    value_test = params.horizon_months * X_test["MonthlyCharges"].to_numpy()
    test_core = M.core_metrics(yte, p_test, threshold)
    test_core["ece"] = M.expected_calibration_error(yte, p_test)
    test_core["ece_uncalibrated"] = M.expected_calibration_error(yte, p_test_raw)
    test_core["brier_uncalibrated"] = M.core_metrics(yte, p_test_raw)["brier"]
    test_thr = M.threshold_metrics(yte, p_test, threshold)
    boot = M.bootstrap_ci(yte, p_test, {
        "roc_auc": lambda a, b: roc_auc_score(a, b),
        "pr_auc": lambda a, b: M.core_metrics(a, b)["pr_auc"],
        "brier": lambda a, b: M.core_metrics(a, b)["brier"],
        "recall": lambda a, b: M.threshold_metrics(a, b, threshold)["recall"],
        "precision": lambda a, b: M.threshold_metrics(a, b, threshold)["precision"],
        "f1": lambda a, b: M.threshold_metrics(a, b, threshold)["f1"],
    }, n_boot=n_boot, seed=rng_seed)
    # Profit CI needs per-customer value too: bootstrap indices directly.
    rng = np.random.default_rng(rng_seed)
    profits = []
    for _ in range(n_boot):
        idx = rng.integers(0, len(yte), len(yte))
        profits.append(M.campaign_profit(yte[idx], p_test[idx], value_test[idx], threshold, params))
    test_profit = M.campaign_profit(yte, p_test, value_test, threshold, params)
    boot["profit"] = {"estimate": test_profit, "lo": float(np.quantile(profits, 0.025)),
                      "hi": float(np.quantile(profits, 0.975)), "std": float(np.std(profits, ddof=1))}
    strategies = {
        "model": test_profit,
        "contact_everyone": M.campaign_profit(yte, np.ones_like(p_test), value_test, 0.5, params),
        "contact_nobody": 0.0,
        "month_to_month_rule": M.campaign_profit(
            yte, (X_test["Contract"] == "Month-to-month").to_numpy().astype(float), value_test, 0.5, params),
        "perfect_oracle": M.campaign_profit(yte, yte.astype(float), value_test, 0.5, params),
    }
    log(f"TEST auc={test_core['roc_auc']:.4f} [{boot['roc_auc']['lo']:.4f}, {boot['roc_auc']['hi']:.4f}] "
        f"pr_auc={test_core['pr_auc']:.4f} brier={test_core['brier']:.4f} profit=${test_profit:,.0f}")

    # ── 8. Interpretability: permutation importance + partial dependence ────
    perm = permutation_importance(final, X_test, y_test, scoring="roc_auc", n_repeats=n_perm,
                                  random_state=rng_seed, n_jobs=-1)
    importance = sorted(
        ({"feature": f, "mean": float(m), "std": float(s)}
         for f, m, s in zip(X_test.columns, perm.importances_mean, perm.importances_std)),
        key=lambda d: -d["mean"])

    def pdp(col: str, grid) -> list[dict]:
        out = []
        for v in grid:
            Xg = X_test.copy()
            Xg[col] = v
            out.append({"value": v if isinstance(v, str) else float(v),
                        "mean_prob": float(final.predict_proba(Xg)[:, 1].mean())})
        return out

    pdps = {
        "tenure": pdp("tenure", [float(v) for v in np.arange(0, 73, 3)]),
        "MonthlyCharges": pdp("MonthlyCharges", [float(v) for v in np.arange(20, 121, 5)]),
        "Contract": pdp("Contract", ["Month-to-month", "One year", "Two year"]),
        "InternetService": pdp("InternetService", ["DSL", "Fiber optic", "No"]),
        "PaymentMethod": pdp("PaymentMethod", sorted(X["PaymentMethod"].unique())),
        "TechSupport": pdp("TechSupport", ["No", "Yes", "No internet service"]),
    }

    # ── 9. Fairness slices on the test set at the business threshold ───────
    def slice_metrics(mask: np.ndarray) -> dict:
        yt, pt = yte[mask], p_test[mask]
        tm = M.threshold_metrics(yt, pt, threshold)
        return {"n": int(mask.sum()), "base_rate": float(yt.mean()), "mean_pred": float(pt.mean()),
                "roc_auc": float(roc_auc_score(yt, pt)) if 0 < yt.sum() < len(yt) else None,
                "tpr": tm["recall"], "fpr": tm["fpr"], "precision": tm["precision"],
                "flag_rate": tm["flag_rate"], "brier": M.core_metrics(yt, pt)["brier"]}

    fairness = {}
    for col, labels in (("gender", None), ("SeniorCitizen", {0.0: "Non-senior", 1.0: "Senior"}),
                        ("Partner", None), ("Dependents", None)):
        groups = []
        for lvl in sorted(X_test[col].unique()):
            name = labels[lvl] if labels else str(lvl)
            groups.append({"group": name, **slice_metrics((X_test[col] == lvl).to_numpy())})
        tprs = [g["tpr"] for g in groups]
        flags = [g["flag_rate"] for g in groups]
        fairness[col] = {"groups": groups,
                         "equal_opportunity_gap": float(max(tprs) - min(tprs)),
                         "demographic_parity_gap": float(max(flags) - min(flags))}

    # ── 10. Export for browser inference + parity checks ────────────────────
    p_test_ch = ch_final.predict_proba(X_test)[:, 1]
    challenger_test = {
        "model_name": FAMILY_LABELS[challenger],
        "calibration": ch_cal_method,
        "calibration_compare": {m: {k: v[k] for k in ("brier", "log_loss", "ece", "roc_auc")}
                                for m, v in ch_calib_compare.items()},
        "metrics": M.core_metrics(yte, p_test_ch, threshold),
        "bootstrap": M.bootstrap_ci(yte, p_test_ch, {"roc_auc": lambda a, b: roc_auc_score(a, b)},
                                    n_boot=n_boot, seed=rng_seed),
        "profit": M.campaign_profit(yte, p_test_ch, value_test, threshold, params),
    }
    # Paired bootstrap of the AUC difference champion - challenger on test.
    rng = np.random.default_rng(rng_seed)
    diffs = []
    for _ in range(n_boot):
        idx = rng.integers(0, len(yte), len(yte))
        if yte[idx].min() == yte[idx].max():
            continue
        diffs.append(roc_auc_score(yte[idx], p_test[idx]) - roc_auc_score(yte[idx], p_test_ch[idx]))
    challenger_test["auc_diff_vs_champion"] = {
        "estimate": float(roc_auc_score(yte, p_test) - roc_auc_score(yte, p_test_ch)),
        "lo": float(np.quantile(diffs, 0.025)), "hi": float(np.quantile(diffs, 0.975))}
    log(f"challenger {challenger}: test auc={challenger_test['metrics']['roc_auc']:.4f}, "
        f"champion-challenger diff CI {challenger_test['auc_diff_vs_champion']}")

    def make_bundle(fam, base_model, fitted, role):
        prep = base_model.named_steps["prep"]
        return export_model(fitted, prep.transform(X_train).mean(axis=0), extra={
            "model_name": FAMILY_LABELS[fam],
            "role": role,
            "threshold": threshold,
            "business": params.to_dict(),
            "raw_features": RAW_FEATURES,
        })

    bundle = make_bundle(winner, model, final, "champion")
    ch_bundle = make_bundle(challenger, ch_model, ch_final, "challenger")
    rows_idx = np.random.default_rng(rng_seed).choice(len(X_test), size=200, replace=False)
    fixture_rows = []
    max_err = {"champion": 0.0, "challenger": 0.0}
    max_shap_gap = {"champion": 0.0, "challenger": 0.0}
    for n_row, i in enumerate(rows_idx):
        row = raw_row(X_test, int(i))
        entry = {"customerID": str(id_test.iloc[i]), "features": row}
        for role, bnd, probs in (("champion", bundle, p_test), ("challenger", ch_bundle, p_test_ch)):
            p_ref = float(probs[i])
            max_err[role] = max(max_err[role], abs(p_ref - inference.predict_proba(row, bnd)))
            raw = inference.raw_score(inference.transform_row(row, bnd), bnd["model"])
            entry[role] = {"proba": p_ref, "raw_score": raw}
            if n_row < 25:
                base, phi = inference.explain(row, bnd)
                max_shap_gap[role] = max(max_shap_gap[role], abs(base + phi.sum() - raw))
        fixture_rows.append(entry)
    log(f"export parity: max |p_sklearn - p_json| = {max_err}; SHAP additivity gap = {max_shap_gap}")
    assert max(max_err.values()) < 1e-9, "exported model disagrees with sklearn"

    # ── 11. Assemble report + write outputs ─────────────────────────────────
    report = {
        "generated_at": time.strftime("%Y-%m-%d"),
        "runtime_s": None,
        "environment": {"python": platform.python_version(), "sklearn": bundle["sklearn_version"],
                        "numpy": np.__version__, "pandas": pd.__version__, "seed": SEED},
        "data": {"source": SOURCE_URL, "file": str(DATA_PATH.relative_to(ROOT)), **split, "eda": eda},
        "cv": {"folds": 5, "results": cv_results},
        "tuning": tuning,
        "selection": {**significance, "model_name": bundle["model_name"],
                      "best_params": tuning[winner]["best_params"]},
        "imbalance": imbalance,
        "calibration": {"selected": cal_method, "compare": calib_compare,
                        "test_reliability": M.reliability_curve(yte, p_test),
                        "test_reliability_uncalibrated": M.reliability_curve(yte, p_test_raw)},
        "business": {**params.to_dict(), "threshold": threshold, "f1_threshold": f1_threshold,
                     "val_profit": val_profit, "test_profit": test_profit, "strategies": strategies,
                     "profit_curve_test": M.profit_curve(yte, p_test, value_test, params)},
        "test": {"metrics": test_core, "at_threshold": test_thr, "bootstrap": boot,
                 "n_boot": n_boot, "roc": M.roc_points(yte, p_test), "pr": M.pr_points(yte, p_test)},
        "importance": {"method": "permutation (ROC-AUC drop, test set)", "n_repeats": n_perm,
                       "features": importance},
        "partial_dependence": pdps,
        "fairness": {"threshold": threshold, "slices": fairness},
        "challenger": {"family": challenger, **challenger_test,
                       "n_trees": len(ch_bundle["model"].get("trees", []))},
        "export": {"max_abs_prob_diff": max(max_err.values()), "by_model": max_err,
                   "shap_additivity_gap": max(max_shap_gap.values()),
                   "n_fixture_rows": len(fixture_rows), "model_type": bundle["model"]["type"],
                   "n_trees": len(bundle["model"].get("trees", [])),
                   "n_features_transformed": len(bundle["feature_names"])},
    }
    report["runtime_s"] = round(time.time() - t0, 1)

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    REPORTS.mkdir(parents=True, exist_ok=True)

    def dump(path: Path, obj, indent=None):
        path.write_text(json.dumps(obj, indent=indent, allow_nan=False) + "\n")

    dump(MODEL_DIR / "model.json", bundle)
    dump(MODEL_DIR / "model_challenger.json", ch_bundle)
    dump(MODEL_DIR / "report.json", report)
    dump(REPORTS / "metrics.json", report, indent=2)
    dump(MODEL_DIR / "parity_fixture.json", {"tolerance": 1e-9, "rows": fixture_rows})
    # Keep the fixture out of the deployed site's critical path but available to tests.
    test_preds = {
        "columns": ["y", "p", "p_challenger", "monthly", "gender", "senior", "partner", "dependents", "contract"],
        "rows": [[int(a), round(float(b), 6), round(float(b2), 6), float(c), d, int(e), f, g, h]
                 for a, b, b2, c, d, e, f, g, h in zip(
            yte, p_test, p_test_ch, X_test["MonthlyCharges"], X_test["gender"], X_test["SeniorCitizen"],
            X_test["Partner"], X_test["Dependents"], X_test["Contract"])],
    }
    dump(MODEL_DIR / "test_predictions.json", test_preds)
    sample = X_test.iloc[:150].copy()
    sample[["SeniorCitizen", "tenure"]] = sample[["SeniorCitizen", "tenure"]].astype(int)
    sample.insert(0, ID_COL, id_test.iloc[:150].to_numpy())
    sample[TARGET] = np.where(yte[:150] == 1, "Yes", "No")
    sample.to_csv(PUBLIC / "sample_customers.csv", index=False)

    write_figures(report, REPORTS / "figures")
    write_model_card(report, bundle, ROOT / "ml" / "MODEL_CARD.md")
    log(f"done in {report['runtime_s']}s")


if __name__ == "__main__":
    main()
