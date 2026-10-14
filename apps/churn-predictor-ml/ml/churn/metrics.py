"""Metric helpers: classification metrics, bootstrap CIs, business-cost curves.

All functions take plain numpy arrays and are covered by `tests/test_metrics.py`.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass

import numpy as np
from sklearn.metrics import (
    average_precision_score,
    brier_score_loss,
    log_loss,
    precision_recall_curve,
    roc_auc_score,
    roc_curve,
)


@dataclass(frozen=True)
class BusinessParams:
    """Retention-campaign economics (documented assumptions, editable in the web app).

    * A churner's lost value is `horizon_months` x MonthlyCharges (revenue at risk).
    * Contacting a customer costs `offer_cost` (discount / incentive + handling).
    * The offer saves a would-be churner with probability `offer_success`.
    """

    offer_cost: float = 50.0
    offer_success: float = 0.30
    horizon_months: float = 12.0

    def to_dict(self) -> dict:
        return asdict(self)


def confusion_at(y: np.ndarray, p: np.ndarray, threshold: float) -> dict:
    pred = p >= threshold
    tp = int(np.sum(pred & (y == 1)))
    fp = int(np.sum(pred & (y == 0)))
    fn = int(np.sum(~pred & (y == 1)))
    tn = int(np.sum(~pred & (y == 0)))
    return {"tp": tp, "fp": fp, "fn": fn, "tn": tn}


def threshold_metrics(y: np.ndarray, p: np.ndarray, threshold: float) -> dict:
    c = confusion_at(y, p, threshold)
    tp, fp, fn, tn = c["tp"], c["fp"], c["fn"], c["tn"]
    precision = tp / (tp + fp) if tp + fp else 0.0
    recall = tp / (tp + fn) if tp + fn else 0.0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
    fpr = fp / (fp + tn) if fp + tn else 0.0
    return {**c, "precision": precision, "recall": recall, "f1": f1, "fpr": fpr,
            "flag_rate": (tp + fp) / len(y)}


def campaign_profit(
    y: np.ndarray, p: np.ndarray, value: np.ndarray, threshold: float, params: BusinessParams
) -> float:
    """Net profit vs. doing nothing when contacting everyone with p >= threshold.

    TP: s * value - cost (some churners are saved); FP: -cost; FN/TN: 0.
    `value` is each customer's revenue at risk (horizon x monthly charge).
    """
    target = p >= threshold
    gain = np.where(y == 1, params.offer_success * value, 0.0) - params.offer_cost
    return float(np.sum(gain[target]))


def profit_curve(
    y: np.ndarray, p: np.ndarray, value: np.ndarray, params: BusinessParams, n: int = 101
) -> list[dict]:
    out = []
    for t in np.linspace(0, 1, n):
        out.append({"threshold": round(float(t), 4),
                    "profit": campaign_profit(y, p, value, float(t), params),
                    "flag_rate": float(np.mean(p >= t))})
    return out


def best_threshold(y, p, value, params: BusinessParams, n: int = 1001) -> tuple[float, float]:
    grid = np.linspace(0, 1, n)
    profits = np.array([campaign_profit(y, p, value, float(t), params) for t in grid])
    i = int(np.argmax(profits))
    return float(grid[i]), float(profits[i])


def core_metrics(y: np.ndarray, p: np.ndarray, threshold: float = 0.5) -> dict:
    tm = threshold_metrics(y, p, threshold)
    return {
        "roc_auc": float(roc_auc_score(y, p)),
        "pr_auc": float(average_precision_score(y, p)),
        "brier": float(brier_score_loss(y, p)),
        "log_loss": float(log_loss(y, np.clip(p, 1e-15, 1 - 1e-15))),
        "f1": tm["f1"],
        "precision": tm["precision"],
        "recall": tm["recall"],
    }


def bootstrap_ci(
    y: np.ndarray,
    p: np.ndarray,
    metric_fns: dict,
    n_boot: int = 1000,
    alpha: float = 0.05,
    seed: int = 0,
) -> dict:
    """Percentile bootstrap CIs, resampling customers with replacement.

    Resamples that contain a single class are skipped (AUC undefined).
    """
    rng = np.random.default_rng(seed)
    n = len(y)
    samples: dict[str, list[float]] = {k: [] for k in metric_fns}
    for _ in range(n_boot):
        idx = rng.integers(0, n, n)
        yb, pb = y[idx], p[idx]
        if yb.min() == yb.max():
            continue
        for k, fn in metric_fns.items():
            samples[k].append(float(fn(yb, pb)))
    out = {}
    for k, fn in metric_fns.items():
        arr = np.asarray(samples[k])
        out[k] = {
            "estimate": float(fn(y, p)),
            "lo": float(np.quantile(arr, alpha / 2)),
            "hi": float(np.quantile(arr, 1 - alpha / 2)),
            "std": float(arr.std(ddof=1)),
        }
    return out


def reliability_curve(y: np.ndarray, p: np.ndarray, n_bins: int = 10) -> list[dict]:
    """Quantile-binned reliability diagram (equal-count bins are more stable)."""
    edges = np.unique(np.quantile(p, np.linspace(0, 1, n_bins + 1)))
    bins = np.clip(np.searchsorted(edges, p, side="right") - 1, 0, len(edges) - 2)
    out = []
    for b in range(len(edges) - 1):
        m = bins == b
        if m.any():
            out.append({"mean_pred": float(p[m].mean()), "frac_pos": float(y[m].mean()),
                        "n": int(m.sum())})
    return out


def expected_calibration_error(y: np.ndarray, p: np.ndarray, n_bins: int = 10) -> float:
    curve = reliability_curve(y, p, n_bins)
    n = len(y)
    return float(sum(b["n"] / n * abs(b["mean_pred"] - b["frac_pos"]) for b in curve))


def downsample_curve(xs: np.ndarray, ys: np.ndarray, max_points: int = 150) -> list[list[float]]:
    if len(xs) <= max_points:
        idx = np.arange(len(xs))
    else:
        idx = np.unique(np.linspace(0, len(xs) - 1, max_points).round().astype(int))
    return [[round(float(xs[i]), 5), round(float(ys[i]), 5)] for i in idx]


def roc_points(y, p, max_points: int = 150):
    fpr, tpr, _ = roc_curve(y, p)
    return downsample_curve(fpr, tpr, max_points)


def pr_points(y, p, max_points: int = 150):
    precision, recall, _ = precision_recall_curve(y, p)
    order = np.argsort(recall)
    return downsample_curve(recall[order], precision[order], max_points)
