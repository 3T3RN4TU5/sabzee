import numpy as np
import pytest

from churn import metrics as M


def test_confusion_and_threshold_metrics():
    y = np.array([1, 1, 0, 0, 1, 0])
    p = np.array([0.9, 0.4, 0.6, 0.1, 0.7, 0.3])
    c = M.confusion_at(y, p, 0.5)
    assert c == {"tp": 2, "fp": 1, "fn": 1, "tn": 2}
    tm = M.threshold_metrics(y, p, 0.5)
    assert tm["precision"] == pytest.approx(2 / 3)
    assert tm["recall"] == pytest.approx(2 / 3)
    assert tm["f1"] == pytest.approx(2 / 3)
    assert tm["fpr"] == pytest.approx(1 / 3)


def test_campaign_profit_by_hand():
    params = M.BusinessParams(offer_cost=10, offer_success=0.5, horizon_months=12)
    y = np.array([1, 0, 1])
    p = np.array([0.8, 0.9, 0.1])
    value = np.array([100.0, 100.0, 100.0])
    # Contact customers 0 and 1: churner saved half the time (+50 - 10), non-churner -10.
    assert M.campaign_profit(y, p, value, 0.5, params) == pytest.approx(30.0)
    assert M.campaign_profit(y, p, value, 0.95, params) == 0.0


def test_best_threshold_matches_analytic_rule_for_calibrated_scores():
    """With calibrated p and constant value V, contact iff p * s * V > cost."""
    rng = np.random.default_rng(0)
    p = rng.uniform(size=200_000)
    y = (rng.uniform(size=p.size) < p).astype(int)
    params = M.BusinessParams(offer_cost=30, offer_success=0.3, horizon_months=12)
    value = np.full(p.size, 500.0)
    t, _ = M.best_threshold(y, p, value, params, n=201)
    assert t == pytest.approx(30 / (0.3 * 500), abs=0.03)


def test_bootstrap_ci_brackets_estimate():
    rng = np.random.default_rng(1)
    y = rng.integers(0, 2, 500)
    p = np.clip(y * 0.3 + rng.uniform(size=500) * 0.7, 0, 1)
    ci = M.bootstrap_ci(y, p, {"auc": lambda a, b: __import__("sklearn.metrics").metrics.roc_auc_score(a, b)},
                        n_boot=200)
    assert ci["auc"]["lo"] <= ci["auc"]["estimate"] <= ci["auc"]["hi"]
    assert ci["auc"]["hi"] - ci["auc"]["lo"] < 0.15


def test_reliability_and_ece_on_calibrated_data():
    rng = np.random.default_rng(2)
    p = rng.uniform(size=100_000)
    y = (rng.uniform(size=p.size) < p).astype(int)
    assert M.expected_calibration_error(y, p) < 0.01
    curve = M.reliability_curve(y, p)
    assert len(curve) == 10 and sum(b["n"] for b in curve) == p.size


def test_downsample_keeps_endpoints():
    xs = np.linspace(0, 1, 1000)
    pts = M.downsample_curve(xs, xs ** 2, max_points=50)
    assert pts[0] == [0.0, 0.0] and pts[-1] == [1.0, 1.0] and len(pts) <= 50
