"""Models on top of the warehouse: segmentation, forecasting, A/B testing and CLV.

Each public function takes plain DataFrames and returns a JSON-serialisable
dict that the export step writes for the dashboard.
"""

from __future__ import annotations

import warnings

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import StandardScaler

import metrics as M
from config import SEED

# ─── 1. RFM + k-means segmentation ──────────────────────────────────────────

K_RANGE = range(2, 9)
MIN_BUSINESS_K = 3  # k = 2 only separates "active" from "lapsed"; too coarse to act on

SEGMENT_PLAYBOOK = {
    "Champions": "Protect: account manager, early access to new ranges, volume-tier pricing.",
    "Loyal": "Grow basket: cross-sell high-lift pairs, free-shipping threshold nudges.",
    "New & Promising": "Convert to second order within 60 days: welcome series, reorder reminders.",
    "At Risk": "Win back now: personal outreach and a time-boxed reorder incentive.",
    "Dormant": "Low-cost reactivation only (seasonal catalogue email); do not discount heavily.",
    "Occasional": "Nudge cadence: seasonal reminders timed to their usual reorder interval.",
}


def _features(rfm: pd.DataFrame) -> np.ndarray:
    return np.column_stack(
        [np.log1p(rfm["recency_days"]), np.log1p(rfm["frequency"]), np.log1p(rfm["monetary"])]
    )


def _name_segments(centroids: pd.DataFrame, overall: pd.Series) -> dict[int, str]:
    """Name clusters from their (median) centroid relative to the customer base."""
    score = (
        -np.log1p(centroids["recency_days"]) / np.log1p(overall["recency_days"])
        + np.log1p(centroids["frequency"]) / np.log1p(overall["frequency"])
        + np.log1p(centroids["monetary"]) / np.log1p(overall["monetary"])
    )
    order = score.sort_values(ascending=False).index.tolist()
    names: dict[int, str] = {order[0]: "Champions", order[-1]: "Dormant"}
    for c in order[1:-1]:
        recent = centroids.loc[c, "recency_days"] <= overall["recency_days"]
        valuable = centroids.loc[c, "frequency"] > overall["frequency"]
        if recent and valuable:
            name = "Loyal"
        elif recent:
            name = "New & Promising"
        elif valuable:
            name = "At Risk"
        else:
            name = "Occasional"
        if name in names.values():
            name = f"{name} II"
        names[c] = name
    return names


def segment_customers(rfm: pd.DataFrame, seed: int = SEED) -> tuple[dict, pd.Series]:
    X = StandardScaler().fit_transform(_features(rfm))
    sample = np.random.default_rng(seed).choice(len(X), size=min(len(X), 3000), replace=False)
    scores = []
    fits: dict[int, KMeans] = {}
    for k in K_RANGE:
        km = KMeans(n_clusters=k, n_init=10, random_state=seed).fit(X)
        fits[k] = km
        scores.append(
            {
                "k": k,
                "silhouette": round(float(silhouette_score(X[sample], km.labels_[sample])), 4),
                "inertia": round(float(km.inertia_), 1),
            }
        )
    eligible = [s for s in scores if s["k"] >= MIN_BUSINESS_K]
    best_k = max(eligible, key=lambda s: s["silhouette"])["k"]
    labels = fits[best_k].labels_

    df = rfm.assign(cluster=labels)
    overall = rfm[["recency_days", "frequency", "monetary"]].median()
    centroids = df.groupby("cluster")[["recency_days", "frequency", "monetary"]].median()
    names = _name_segments(centroids, overall)
    df["segment"] = df["cluster"].map(names)

    total_rev = df["monetary"].sum()
    segs = (
        df.groupby("segment")
        .agg(
            customers=("customer_key", "size"),
            revenue=("monetary", "sum"),
            median_recency=("recency_days", "median"),
            median_frequency=("frequency", "median"),
            median_monetary=("monetary", "median"),
            mean_recency=("recency_days", "mean"),
            mean_frequency=("frequency", "mean"),
            mean_monetary=("monetary", "mean"),
        )
        .reset_index()
    )
    segs["customer_share"] = segs["customers"] / len(df)
    segs["revenue_share"] = segs["revenue"] / total_rev
    segs["action"] = segs["segment"].map(lambda s: SEGMENT_PLAYBOOK.get(s.replace(" II", ""), ""))
    segs = segs.sort_values("revenue", ascending=False)

    # Cross-tab: k-means segment vs. rule-based RFM segment (from rfm.sql)
    crosstab = (
        df.groupby(["segment", "rfm_segment"]).size().reset_index(name="customers").to_dict("records")
    )
    # Scatter sample for the dashboard (stratified so small segments are visible)
    rng = np.random.default_rng(seed)
    pts = []
    for seg, g in df.groupby("segment"):
        take = g.iloc[rng.choice(len(g), size=min(len(g), 160), replace=False)]
        pts += [
            {"segment": seg, "recency": int(r.recency_days), "frequency": int(r.frequency),
             "monetary": round(float(r.monetary), 2)}
            for r in take.itertuples()
        ]

    rfm_grid = (
        df.groupby(["r_score", "f_score"])
        .agg(customers=("customer_key", "size"), avg_monetary=("monetary", "mean"))
        .reset_index()
        .to_dict("records")
    )
    rule_segments = (
        df.groupby("rfm_segment")
        .agg(customers=("customer_key", "size"), revenue=("monetary", "sum"))
        .reset_index()
        .assign(revenue_share=lambda d: d["revenue"] / total_rev)
        .sort_values("revenue", ascending=False)
        .to_dict("records")
    )

    out = {
        "k_selection": scores,
        "chosen_k": best_k,
        "features": ["log1p(recency_days)", "log1p(frequency)", "log1p(monetary)"],
        "segments": segs.round(4).to_dict("records"),
        "crosstab": crosstab,
        "scatter": pts,
        "rfm_grid": [{k: (round(v, 2) if isinstance(v, float) else v) for k, v in r.items()} for r in rfm_grid],
        "rule_segments": rule_segments,
        "customers": int(len(df)),
    }
    return out, df.set_index("customer_key")["segment"]


# ─── 2. Demand forecasting ──────────────────────────────────────────────────

HOLDOUT_DAYS = 42
HORIZON_DAYS = 14  # up to the annual Christmas shutdown (last trading day 23 Dec)
TRAIN_START = "2011-01-04"  # first trading day after the 2010 Christmas shutdown


def _seasonal_naive(train: pd.Series, horizon: int) -> np.ndarray:
    last_week = train.iloc[-7:].to_numpy()
    return np.resize(last_week, horizon)


def _fit_hw(train: pd.Series):
    from statsmodels.tsa.holtwinters import ExponentialSmoothing

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        model = ExponentialSmoothing(
            train, trend="add", damped_trend=True, seasonal="add", seasonal_periods=7,
            initialization_method="estimated",
        )
        return model.fit(optimized=True)


def _simulate(fit, horizon: int, closed: np.ndarray, seed: int, reps: int = 2000) -> np.ndarray:
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        sims = fit.simulate(horizon, repetitions=reps, error="add", anchor="end", random_state=seed)
    sims = np.clip(np.asarray(sims, float), 0, None)  # (horizon, reps)
    sims[closed, :] = 0.0
    return sims


def forecast_revenue(daily: pd.DataFrame, seed: int = SEED) -> dict:
    s = daily.assign(date=pd.to_datetime(daily["date"])).set_index("date")["revenue"].asfreq("D").fillna(0.0)
    closed_dow = int(s.groupby(s.index.dayofweek).sum().idxmin())  # Saturday: no trading at all
    assert s[s.index.dayofweek == closed_dow].sum() == 0, "expected one weekday with zero trading"

    series = s[TRAIN_START:]
    train, test = series.iloc[:-HOLDOUT_DAYS], series.iloc[-HOLDOUT_DAYS:]
    closed_test = (test.index.dayofweek == closed_dow)

    fit = _fit_hw(train)
    hw = np.clip(np.asarray(fit.forecast(HOLDOUT_DAYS)), 0, None)
    hw[closed_test] = 0.0
    naive = _seasonal_naive(train, HOLDOUT_DAYS)
    ma = np.resize(train.iloc[-28:].to_numpy().reshape(4, 7).mean(axis=0), HOLDOUT_DAYS)  # 4-week same-weekday mean

    sims_test = _simulate(fit, HOLDOUT_DAYS, closed_test, seed)
    lo80, hi80 = np.quantile(sims_test, [0.1, 0.9], axis=1)
    open_days = ~closed_test
    coverage = float(((test.to_numpy() >= lo80) & (test.to_numpy() <= hi80))[open_days].mean())

    def score(f):
        a = test.to_numpy()
        wk_a = test.resample("W-SUN").sum()
        wk_f = pd.Series(f, index=test.index).resample("W-SUN").sum()
        return {
            "mape_daily": round(M.mape(a[open_days], f[open_days]), 4),
            "wape_daily": round(M.wape(a, f), 4),
            "mape_weekly": round(M.mape(wk_a.to_numpy(), wk_f.to_numpy()), 4),
            "rmse_daily": round(M.rmse(a, f), 0),
            "bias": round(M.bias(a, f), 4),
        }

    models = [
        {"model": "Holt-Winters (additive, damped trend, weekly season)", "key": "hw", **score(hw)},
        {"model": "Seasonal naive (same weekday last week)", "key": "naive", **score(naive)},
        {"model": "4-week same-weekday average", "key": "ma4", **score(ma)},
    ]

    # Refit on everything for the forward forecast
    fit_full = _fit_hw(series)
    future_idx = pd.date_range(series.index[-1] + pd.Timedelta(days=1), periods=HORIZON_DAYS, freq="D")
    closed_future = future_idx.dayofweek == closed_dow
    point = np.clip(np.asarray(fit_full.forecast(HORIZON_DAYS)), 0, None)
    point[closed_future] = 0.0
    sims = _simulate(fit_full, HORIZON_DAYS, closed_future, seed + 1)
    q = np.quantile(sims, [0.025, 0.1, 0.9, 0.975], axis=1)

    lfl_growth = float(s["2011-12-01":"2011-12-09"].sum() / s["2010-12-01":"2010-12-09"].sum() - 1)
    hist = s["2011-06-01":]
    daily_rows = [{"date": d.strftime("%Y-%m-%d"), "actual": round(float(v), 2)} for d, v in hist.items()]
    by_date = {r["date"]: r for r in daily_rows}
    for i, d in enumerate(test.index):
        r = by_date[d.strftime("%Y-%m-%d")]
        r.update(hw=round(float(hw[i]), 2), naive=round(float(naive[i]), 2),
                 lo80=round(float(lo80[i]), 2), hi80=round(float(hi80[i]), 2))
    for i, d in enumerate(future_idx):
        daily_rows.append({
            "date": d.strftime("%Y-%m-%d"), "forecast": round(float(point[i]), 2),
            "lo95": round(float(q[0, i]), 2), "lo80": round(float(q[1, i]), 2),
            "hi80": round(float(q[2, i]), 2), "hi95": round(float(q[3, i]), 2),
        })

    # Weekly view: intervals come from summing simulated *paths*, not percentiles.
    wk_actual = s["2011-01-03":].resample("W-SUN").sum()
    weekly = [{"week": d.strftime("%Y-%m-%d"), "actual": round(float(v), 2)} for d, v in wk_actual.items()]
    test_weeks = pd.Series(hw, index=test.index).resample("W-SUN").sum()
    for d, v in test_weeks.items():
        for r in weekly:
            if r["week"] == d.strftime("%Y-%m-%d"):
                r["hw"] = round(float(v), 2)
    future_total = sims.sum(axis=0)
    return {
        "train_start": TRAIN_START,
        "train_end": train.index[-1].strftime("%Y-%m-%d"),
        "holdout_start": test.index[0].strftime("%Y-%m-%d"),
        "holdout_end": test.index[-1].strftime("%Y-%m-%d"),
        "horizon_days": HORIZON_DAYS,
        "closed_weekday": "Saturday" if closed_dow == 5 else str(closed_dow),
        "models": models,
        "interval_coverage_80": round(coverage, 4),
        "params": {
            k: round(float(fit_full.params[k]), 4)
            for k in ("smoothing_level", "smoothing_trend", "smoothing_seasonal", "damping_trend")
        },
        "forecast_total": round(float(point.sum()), 2),
        "forecast_total_lo80": round(float(np.quantile(future_total, 0.1)), 2),
        "forecast_total_hi80": round(float(np.quantile(future_total, 0.9)), 2),
        "same_period_last_year": round(float(s["2010-12-10":"2010-12-23"].sum()), 2),
        # Judgemental benchmark: same 14 days last year x like-for-like YoY growth of 1-9 Dec.
        "yoy_growth_lfl": round(lfl_growth, 4),
        "yoy_anchored_total": round(float(s["2010-12-10":"2010-12-23"].sum() * (1 + lfl_growth)), 2),
        "daily": daily_rows,
        "weekly": weekly,
    }


# ─── 3. A/B test ────────────────────────────────────────────────────────────


def analyze_experiment(v: pd.DataFrame, pre_reg: dict, seed: int = SEED) -> dict:
    c = v[v["variant"] == "control"]
    t = v[v["variant"] == "treatment"]
    srm = M.srm_check(len(c), len(t), pre_reg["split"])

    conv = M.two_proportion_ztest(int(c["converted"].sum()), len(c), int(t["converted"].sum()), len(t))
    aov_c = c.loc[c["converted"] == 1, "order_value"].to_numpy()
    aov_t = t.loc[t["converted"] == 1, "order_value"].to_numpy()
    aov = M.welch_ttest(aov_c, aov_t)
    aov_boot = M.bootstrap_diff_ci(aov_c, aov_t, seed=seed)
    med_boot = M.bootstrap_diff_ci(aov_c, aov_t, stat=np.median, n_boot=2000, seed=seed)
    rpv_boot = M.bootstrap_diff_ci(c["order_value"].to_numpy(), t["order_value"].to_numpy(), seed=seed)
    rpv_c = float(c["order_value"].mean())

    n_req = M.required_n_per_arm(pre_reg["baseline_cvr"], pre_reg["mde_relative"], pre_reg["alpha"], pre_reg["power"])
    n_arm = min(len(c), len(t))
    mde_achieved = M.mde_proportions(conv.p_control, n_arm, pre_reg["alpha"], pre_reg["power"])
    power_obs = M.power_two_proportions(conv.p_control, conv.p_treatment, len(c), len(t), pre_reg["alpha"])
    power_curve = [
        {"lift": round(lift, 3),
         "power": round(M.power_two_proportions(conv.p_control, conv.p_control * (1 + lift), n_arm, n_arm), 4)}
        for lift in np.arange(0.0, 0.405, 0.01)
    ]

    by_device = []
    for dev, g in v.groupby("device"):
        gc, gt = g[g["variant"] == "control"], g[g["variant"] == "treatment"]
        r = M.two_proportion_ztest(int(gc["converted"].sum()), len(gc), int(gt["converted"].sum()), len(gt))
        by_device.append({
            "device": dev, "n_control": len(gc), "n_treatment": len(gt),
            "cvr_control": r.p_control, "cvr_treatment": r.p_treatment, "rel_lift": r.rel_lift,
            "rel_ci_low": r.rel_ci_low, "rel_ci_high": r.rel_ci_high, "p_value": r.p_value,
        })

    # Cumulative trajectory: shows why peeking at day 3 would have misled.
    daily = []
    for day in sorted(v["date"].unique()):
        sub = v[v["date"] <= day]
        sc, st = sub[sub["variant"] == "control"], sub[sub["variant"] == "treatment"]
        r = M.two_proportion_ztest(int(sc["converted"].sum()), len(sc), int(st["converted"].sum()), len(st))
        daily.append({
            "date": str(day), "visitors": int(len(sub)), "rel_lift": round(r.rel_lift, 4),
            "rel_ci_low": round(r.rel_ci_low, 4), "rel_ci_high": round(r.rel_ci_high, 4),
            "p_value": round(r.p_value, 5),
        })

    def arm(g):
        conv_g = g[g["converted"] == 1]
        return {
            "visitors": int(len(g)), "orders": int(len(conv_g)),
            "cvr": float(g["converted"].mean()), "aov": float(conv_g["order_value"].mean()),
            "median_order": float(conv_g["order_value"].median()),
            "rpv": float(g["order_value"].mean()), "revenue": float(g["order_value"].sum()),
        }

    significant = conv.p_value < pre_reg["alpha"]
    guardrail_ok = aov_boot[1] < 0 < aov_boot[2] or aov_boot[1] > 0
    decision = (
        "Ship the one-page checkout" if significant and srm["passed"] and guardrail_ok
        else "Do not ship yet"
    )
    return {
        "name": "One-page checkout vs. current 3-step checkout",
        "simulated": True,
        "start": str(v["date"].min()),
        "end": str(v["date"].max()),
        "pre_registration": {**pre_reg, "required_n_per_arm": n_req},
        "arms": {"control": arm(c), "treatment": arm(t)},
        "srm": srm,
        "conversion": conv.__dict__,
        "aov": {**aov.__dict__, "boot_diff": aov_boot[0], "boot_ci_low": aov_boot[1], "boot_ci_high": aov_boot[2],
                "median_diff": med_boot[0], "median_ci_low": med_boot[1], "median_ci_high": med_boot[2]},
        "rpv": {"control": rpv_c, "treatment": float(t["order_value"].mean()), "diff": rpv_boot[0],
                "ci_low": rpv_boot[1], "ci_high": rpv_boot[2], "rel_diff": rpv_boot[0] / rpv_c,
                "rel_ci_low": rpv_boot[1] / rpv_c, "rel_ci_high": rpv_boot[2] / rpv_c},
        "power": {"achieved_mde_relative": mde_achieved, "observed_effect_power": power_obs,
                  "n_per_arm": n_arm, "curve": power_curve},
        "by_device": by_device,
        "daily": daily,
        "decision": decision,
        "planted_truth": {"desktop_lift": 0.08, "mobile_lift": 0.28, "aov_effect": 0.0},
    }


# ─── 4. Customer lifetime value (MBG/NBD + Gamma-Gamma) ──────────────────────

CALIBRATION_END = "2011-08-31"
CLV_MONTHS = 12
MONTHLY_DISCOUNT = 0.01  # ~12.7% a year


def _rfm_summary(tx: pd.DataFrame, end: pd.Timestamp) -> pd.DataFrame:
    """BTYD summary: x = repeat transactions, t_x = age at last purchase, T = age (days)."""
    g = tx[tx["order_date"] <= end].groupby("customer_key")
    first = g["order_date"].min()
    last = g["order_date"].max()
    out = pd.DataFrame({
        "x": g.size() - 1,
        "t_x": (last - first).dt.days.astype(float),
        "T": (end - first).dt.days.astype(float),
    })
    # mean value of *repeat* transactions (Gamma-Gamma convention)
    def repeat_mean(s):
        return s.iloc[1:].mean() if len(s) > 1 else np.nan
    out["m"] = g["value"].apply(lambda s: repeat_mean(s.reset_index(drop=True)))
    return out


def customer_lifetime_value(tx: pd.DataFrame, segments: pd.Series) -> dict:
    tx = tx.assign(order_date=pd.to_datetime(tx["order_date"])).sort_values(["customer_key", "order_date"])
    end_all = tx["order_date"].max()
    cal_end = pd.Timestamp(CALIBRATION_END)

    # -- Validation: calibrate on Dec-2010..Aug-2011, predict Sep..Dec-9 2011
    cal = _rfm_summary(tx, cal_end)
    cal = cal[cal["T"] > 0]
    p_cal = M.mbgnbd_fit(cal["x"], cal["t_x"], cal["T"])
    horizon = float((end_all - cal_end).days)
    cal["pred"] = M.mbgnbd_expected_purchases(horizon, p_cal, cal["x"], cal["t_x"], cal["T"])
    hold = tx[(tx["order_date"] > cal_end)].groupby("customer_key").size()
    cal["actual"] = hold.reindex(cal.index).fillna(0)
    cal["bucket"] = cal["x"].clip(upper=7)
    validation = (
        cal.groupby("bucket").agg(customers=("x", "size"), predicted=("pred", "mean"), actual=("actual", "mean"))
        .reset_index().round(3)
    )
    validation["bucket"] = validation["bucket"].map(lambda b: f"{int(b)}+" if b == 7 else str(int(b)))
    agg_pred, agg_act = float(cal["pred"].sum()), float(cal["actual"].sum())
    corr = float(np.corrcoef(cal["pred"], cal["actual"])[0, 1])

    # -- Final model on the full history
    full = _rfm_summary(tx, end_all)
    p = M.mbgnbd_fit(full["x"], full["t_x"], full["T"])
    rep = full[full["x"] > 0]
    gg = M.gamma_gamma_fit(rep["x"], rep["m"])
    spend = M.gamma_gamma_expected_spend(gg, full["x"], full["m"].fillna(0))
    freq_monetary_corr = float(np.corrcoef(rep["x"], rep["m"])[0, 1])

    clv = np.zeros(len(full))
    prev = np.zeros(len(full))
    for k in range(1, CLV_MONTHS + 1):
        cum = M.mbgnbd_expected_purchases(30.0 * k, p, full["x"], full["t_x"], full["T"])
        clv += (cum - prev) * spend / (1 + MONTHLY_DISCOUNT) ** k
        prev = cum
    full["exp_tx_12m"] = prev
    full["exp_spend"] = spend
    full["clv_12m"] = clv
    full["p_alive"] = M.mbgnbd_p_alive(p, full["x"], full["t_x"], full["T"])

    # Realised benchmark: what the Jan-2011 cohort actually spent in its first 11 months.
    first = tx.groupby("customer_key")["order_date"].transform("min")
    jan = tx[(first >= "2011-01-01") & (first < "2011-02-01")]
    jan_value = float(jan["value"].sum() / jan["customer_key"].nunique())
    jan_keys = jan["customer_key"].unique()
    jan_model = float(full.loc[full.index.isin(jan_keys), "clv_12m"].mean())
    full["segment"] = segments.reindex(full.index)

    deciles = pd.qcut(full["clv_12m"].rank(method="first", ascending=False), 10, labels=False) + 1
    dec = (
        full.assign(decile=deciles).groupby("decile")
        .agg(customers=("clv_12m", "size"), clv=("clv_12m", "sum"), mean_clv=("clv_12m", "mean"))
        .reset_index()
    )
    dec["share"] = dec["clv"] / dec["clv"].sum()

    by_seg = (
        full.groupby("segment")
        .agg(customers=("clv_12m", "size"), total_clv=("clv_12m", "sum"), mean_clv=("clv_12m", "mean"),
             median_clv=("clv_12m", "median"), mean_p_alive=("p_alive", "mean"),
             exp_tx_12m=("exp_tx_12m", "mean"))
        .reset_index().sort_values("total_clv", ascending=False)
    )
    bins = [0, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, np.inf]
    labels = ["<£100", "£100–250", "£250–500", "£500–1k", "£1k–2.5k", "£2.5k–5k", "£5k–10k", "£10k–25k", "£25k+"]
    hist = pd.cut(full["clv_12m"], bins=bins, labels=labels, right=False).value_counts().reindex(labels)

    return {
        "method": "MBG/NBD (purchase frequency & dropout) + Gamma-Gamma (spend per transaction)",
        "transaction_definition": "distinct purchase day per customer",
        "calibration_end": CALIBRATION_END,
        "holdout_days": int(horizon),
        "params_mbgnbd": {k: round(v, 5) for k, v in p.items() if isinstance(v, float)},
        "params_gamma_gamma": {k: round(v, 5) for k, v in gg.items() if isinstance(v, float)},
        "validation": validation.to_dict("records"),
        "validation_total_predicted": round(agg_pred, 1),
        "validation_total_actual": round(agg_act, 1),
        "validation_error": round(agg_pred / agg_act - 1, 4),
        "validation_corr": round(corr, 4),
        "freq_monetary_corr": round(freq_monetary_corr, 4),
        "months": CLV_MONTHS,
        "monthly_discount": MONTHLY_DISCOUNT,
        "customers": int(len(full)),
        "total_clv_12m": round(float(full["clv_12m"].sum()), 2),
        "mean_clv_12m": round(float(full["clv_12m"].mean()), 2),
        "median_clv_12m": round(float(full["clv_12m"].median()), 2),
        "dropout_probability": round(p["a"] / (p["a"] + p["b"]), 8),
        "mean_p_alive": round(float(full["p_alive"].mean()), 4),
        "benchmark_jan_cohort_realised_11m": round(jan_value, 2),
        "benchmark_jan_cohort_model_12m": round(jan_model, 2),
        "benchmark_jan_cohort_size": int(len(jan_keys)),
        "deciles": dec.round(4).to_dict("records"),
        "by_segment": by_seg.round(4).to_dict("records"),
        "histogram": [{"bucket": k, "customers": int(v)} for k, v in hist.items()],
        "top_customers": full.sort_values("clv_12m", ascending=False).head(15).reset_index()
        .assign(x=lambda d: d["x"].astype(int))[["customer_key", "segment", "x", "exp_tx_12m", "exp_spend", "clv_12m"]]
        .round(3).to_dict("records"),
    }
