import numpy as np
import pandas as pd
import pytest

import generate_experiment as gx
import models


def test_forecast_on_synthetic_weekly_series():
    days = pd.date_range("2010-12-01", "2011-12-09", freq="D")
    rng = np.random.default_rng(0)
    weekly = np.array([1.1, 1.2, 1.0, 1.15, 0.8, 0.0, 0.7])  # Saturday closed
    trend = np.linspace(20_000, 30_000, len(days))
    rev = trend * weekly[days.dayofweek] * rng.normal(1, 0.05, len(days))
    rev[days.dayofweek == 5] = 0
    out = models.forecast_revenue(pd.DataFrame({"date": days, "revenue": rev}))
    hw = next(m for m in out["models"] if m["key"] == "hw")
    assert hw["mape_weekly"] < 0.1
    future = [r for r in out["daily"] if "forecast" in r]
    assert len(future) == models.HORIZON_DAYS
    assert all(r["lo95"] <= r["lo80"] <= r["forecast"] + 1e-6 or r["forecast"] == 0 for r in future)
    sat = [r for r in future if pd.Timestamp(r["date"]).dayofweek == 5]
    assert all(r["forecast"] == 0 for r in sat)


def test_experiment_simulation_is_reproducible_and_analysis_finds_planted_effect():
    values = np.random.default_rng(1).lognormal(5.8, 0.8, 5000)
    v1, v2 = gx.simulate(values, seed=11), gx.simulate(values, seed=11)
    pd.testing.assert_frame_equal(v1, v2)
    out = models.analyze_experiment(v1, gx.PRE_REG)
    assert out["srm"]["passed"]
    assert out["conversion"]["rel_lift"] > 0
    assert out["pre_registration"]["required_n_per_arm"] > 0
    mobile = next(d for d in out["by_device"] if d["device"] == "mobile")
    desktop = next(d for d in out["by_device"] if d["device"] == "desktop")
    assert mobile["rel_lift"] > desktop["rel_lift"]
    assert len(out["daily"]) == gx.DAYS


def test_segment_naming_is_unique_and_ordered():
    rng = np.random.default_rng(2)
    n = 900
    rfm = pd.DataFrame({
        "customer_key": np.arange(n),
        "recency_days": np.concatenate([rng.integers(1, 20, 300), rng.integers(20, 90, 300), rng.integers(150, 370, 300)]),
        "frequency": np.concatenate([rng.integers(10, 40, 300), rng.integers(2, 6, 300), rng.integers(1, 2, 300)]),
        "monetary": np.concatenate([rng.uniform(3000, 9000, 300), rng.uniform(500, 1500, 300), rng.uniform(50, 300, 300)]),
        "rfm_segment": "x", "r_score": 1, "f_score": 1,
    })
    out, seg = models.segment_customers(rfm)
    names = [s["segment"] for s in out["segments"]]
    assert len(names) == len(set(names)) == out["chosen_k"]
    assert names[0] == "Champions"
    assert seg.loc[0] == "Champions" and seg.loc[n - 1] == "Dormant"
    assert sum(s["customer_share"] for s in out["segments"]) == pytest.approx(1.0, abs=1e-3)
