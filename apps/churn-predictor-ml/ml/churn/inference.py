"""Reference scorer for the exported JSON model (no sklearn at inference time).

This is a line-by-line twin of `src/ml/*.ts`: the test-suite checks it against
sklearn's own `predict_proba`, and the TypeScript engine is checked against the
same fixture. Having a Python twin makes export bugs debuggable in one place.
"""

from __future__ import annotations

import math
from typing import Any

import numpy as np

Row = dict[str, Any]


# ── Feature engineering (mirror of features.engineer, one row at a time) ─────

def _num(v: Any) -> float:
    if v is None or v == "":
        return math.nan
    try:
        return float(v)
    except (TypeError, ValueError):
        return math.nan


def engineer_row(row: Row, spec: dict) -> Row:
    out = dict(row)
    services = sum(1.0 for c in spec["service_cols"] if row.get(c) == "Yes")
    has_internet = 1.0 if row.get("InternetService") in ("DSL", "Fiber optic") else 0.0
    out["num_services"] = services + has_internet
    tenure, total, monthly = _num(row.get("tenure")), _num(row.get("TotalCharges")), _num(row.get("MonthlyCharges"))
    avg = total / tenure if tenure > 0 else math.nan
    out["avg_monthly_spend"] = avg
    out["charge_ratio"] = monthly / avg if avg > 0 else math.nan
    out["auto_pay"] = 1.0 if "automatic" in str(row.get("PaymentMethod", "")) else 0.0
    out["has_family"] = 1.0 if row.get("Partner") == "Yes" or row.get("Dependents") == "Yes" else 0.0
    bucket: Any = None
    if not math.isnan(tenure):
        bucket = spec["tenure_labels"][-1]
        for edge, label in zip(spec["tenure_edges"], spec["tenure_labels"]):
            if tenure < edge:
                bucket = label
                break
    out["tenure_bucket"] = bucket
    return out


def transform_row(row: Row, model: dict) -> np.ndarray:
    pre = model["preprocess"]
    r = engineer_row(row, model["engineering"])
    z: list[float] = []
    num = pre["numeric"]
    for name, imp, mean, scale in zip(num["features"], num["impute"], num["mean"], num["scale"]):
        v = _num(r.get(name))
        if math.isnan(v):
            v = imp
        z.append((v - mean) / scale)
    cat = pre["categorical"]
    for name, imp, levels in zip(cat["features"], cat["impute"], cat["categories"]):
        v = r.get(name)
        if v is None or v == "" or (isinstance(v, float) and math.isnan(v)):
            v = imp
        z.extend(1.0 if str(v) == lvl else 0.0 for lvl in levels)
    return np.asarray(z, dtype=np.float64)


# ── Models ───────────────────────────────────────────────────────────────────

def _leaf(tree: dict, z: np.ndarray) -> int:
    node = 0
    feat, thr, left, right, mleft = tree["feature"], tree["threshold"], tree["left"], tree["right"], tree["missing_left"]
    while feat[node] >= 0:
        v = z[feat[node]]
        if math.isnan(v):
            node = left[node] if mleft[node] else right[node]
        elif v <= thr[node]:
            node = left[node]
        else:
            node = right[node]
    return node


def raw_score(z: np.ndarray, m: dict) -> float:
    """Model output before calibration: log-odds (logistic, gbdt) or P(churn) (forest)."""
    if m["type"] == "logistic":
        return float(m["intercept"] + float(np.dot(m["coef"], z)))
    if m["type"] == "gbdt":
        return float(m["baseline"] + sum(t["value"][_leaf(t, z)] for t in m["trees"]))
    if m["type"] == "forest":
        return float(sum(t["value"][_leaf(t, z)] for t in m["trees"]) / len(m["trees"]))
    raise ValueError(m["type"])


def calibrate(score: float, cal: dict, score_space: str) -> float:
    if cal["method"] == "isotonic":
        return float(np.interp(score, cal["x"], cal["y"]))
    if cal["method"] == "sigmoid":
        return float(1.0 / (1.0 + math.exp(cal["a"] * score + cal["b"])))
    return float(1.0 / (1.0 + math.exp(-score))) if score_space == "logit" else score


def predict_proba(row: Row, model: dict) -> float:
    z = transform_row(row, model)
    return calibrate(raw_score(z, model["model"]), model["calibration"], model["score_space"])


# ── Explanations ────────────────────────────────────────────────────────────

def tree_shap(tree: dict, z: np.ndarray, phi: np.ndarray) -> None:
    """Exact path-dependent TreeSHAP (Lundberg et al. 2018, Algorithm 2).

    Adds the contribution of every feature for one tree to `phi`. Node covers
    (training sample counts) define the conditional expectations.
    """
    feat, thr, left, right, value, cover = (
        tree["feature"], tree["threshold"], tree["left"], tree["right"], tree["value"], tree["cover"])
    mleft = tree["missing_left"]

    def extend(path, zero, one, f):
        path = [list(p) for p in path]
        d = len(path)
        path.append([f, zero, one, 1.0 if d == 0 else 0.0])
        for i in range(d - 1, -1, -1):
            path[i + 1][3] += one * path[i][3] * (i + 1) / (d + 1)
            path[i][3] = zero * path[i][3] * (d - i) / (d + 1)
        return path

    def unwind(path, idx):
        path = [list(p) for p in path]
        d = len(path) - 1
        one, zero = path[idx][2], path[idx][1]
        nxt = path[d][3]
        for i in range(d - 1, -1, -1):
            if one != 0:
                tmp = path[i][3]
                path[i][3] = nxt * (d + 1) / ((i + 1) * one)
                nxt = tmp - path[i][3] * zero * (d - i) / (d + 1)
            else:
                path[i][3] = path[i][3] * (d + 1) / (zero * (d - i))
        weights = [p[3] for p in path[:d]]
        del path[idx]
        for i, w in enumerate(weights):
            path[i][3] = w
        return path

    def unwound_sum(path, idx):
        d = len(path) - 1
        one, zero = path[idx][2], path[idx][1]
        nxt = path[d][3]
        total = 0.0
        for i in range(d - 1, -1, -1):
            if one != 0:
                tmp = nxt * (d + 1) / ((i + 1) * one)
                total += tmp
                nxt = path[i][3] - tmp * zero * (d - i) / (d + 1)
            else:
                total += (path[i][3] / zero) / ((d - i) / (d + 1))
        return total

    def recurse(node, path, zero, one, f):
        path = extend(path, zero, one, f)
        if feat[node] < 0:
            for i in range(1, len(path)):
                w = unwound_sum(path, i)
                phi[path[i][0]] += w * (path[i][2] - path[i][1]) * value[node]
            return
        v = z[feat[node]]
        go_left = mleft[node] if math.isnan(v) else v <= thr[node]
        hot, cold = (left[node], right[node]) if go_left else (right[node], left[node])
        inc_zero, inc_one = 1.0, 1.0
        for k in range(1, len(path)):
            if path[k][0] == feat[node]:
                inc_zero, inc_one = path[k][1], path[k][2]
                path = unwind(path, k)
                break
        recurse(hot, path, cover[hot] / cover[node] * inc_zero, inc_one, feat[node])
        recurse(cold, path, cover[cold] / cover[node] * inc_zero, 0.0, feat[node])

    recurse(0, [], 1.0, 1.0, -1)


def tree_expected_value(tree: dict) -> float:
    """Cover-weighted mean of leaf values = E[tree(x)] over the training data."""
    leaves = [i for i, f in enumerate(tree["feature"]) if f < 0]
    w = np.array([tree["cover"][i] for i in leaves], dtype=float)
    v = np.array([tree["value"][i] for i in leaves], dtype=float)
    return float(np.dot(w, v) / w.sum())


def explain(row: Row, model: dict) -> tuple[float, np.ndarray]:
    """Return (base value, per-transformed-feature contributions) in raw-score space.

    base + contributions.sum() == raw_score(row) exactly (local accuracy).
    """
    z = transform_row(row, model)
    m = model["model"]
    if m["type"] == "logistic":
        coef = np.asarray(m["coef"])
        mean = np.asarray(model["explanation"]["background_mean"])
        return float(m["intercept"] + coef @ mean), coef * (z - mean)
    phi = np.zeros(len(z))
    base = 0.0
    for t in m["trees"]:
        tree_shap(t, z, phi)
        base += tree_expected_value(t)
    if m["type"] == "gbdt":
        return float(m["baseline"] + base), phi
    k = len(m["trees"])
    return base / k, phi / k


def explain_grouped(row: Row, model: dict) -> tuple[float, dict[str, float]]:
    base, phi = explain(row, model)
    groups: dict[str, float] = {}
    for g, c in zip(model["feature_groups"], phi):
        groups[g] = groups.get(g, 0.0) + float(c)
    return base, groups
