import numpy as np
import pytest
from scipy import stats
from statsmodels.stats.proportion import proportions_ztest

import metrics as M


def test_mape_and_wape_hand_values():
    a, f = [100, 200, 0], [110, 180, 10]
    assert M.mape(a, f) == pytest.approx((0.10 + 0.10) / 2)  # zero actual is skipped
    assert M.wape(a, f) == pytest.approx(40 / 300)
    assert M.bias([100, 100], [110, 90]) == pytest.approx(0.0)


def test_two_proportion_ztest_matches_statsmodels():
    r = M.two_proportion_ztest(300, 10_000, 360, 10_000)
    z, p = proportions_ztest([360, 300], [10_000, 10_000])
    assert r.z == pytest.approx(z, rel=1e-9)
    assert r.p_value == pytest.approx(p, rel=1e-9)
    assert r.rel_lift == pytest.approx(0.2)
    assert r.ci_low < r.diff < r.ci_high
    assert r.rel_ci_low < r.rel_lift < r.rel_ci_high


def test_welch_matches_scipy():
    rng = np.random.default_rng(1)
    a = rng.lognormal(5, 1, 400)
    b = rng.lognormal(5.1, 1.2, 350)
    r = M.welch_ttest(a, b)
    ref = stats.ttest_ind(b, a, equal_var=False)
    assert r.t == pytest.approx(ref.statistic, rel=1e-9)
    assert r.p_value == pytest.approx(ref.pvalue, rel=1e-9)


def test_bootstrap_ci_is_seeded_and_covers_truth():
    rng = np.random.default_rng(7)
    a, b = rng.normal(10, 2, 3000), rng.normal(11, 2, 3000)
    est, lo, hi = M.bootstrap_diff_ci(a, b, n_boot=2000, seed=3)
    assert lo < 1.0 < hi
    assert (est, lo, hi) == M.bootstrap_diff_ci(a, b, n_boot=2000, seed=3)


def test_srm_check():
    assert M.srm_check(50_000, 50_000)["passed"]
    broken = M.srm_check(50_600, 49_400)
    assert not broken["passed"] and broken["p_value"] < 0.001


def test_sample_size_and_power_are_consistent():
    n = M.required_n_per_arm(0.03, 0.15)
    assert M.power_two_proportions(0.03, 0.0345, n, n) == pytest.approx(0.80, abs=0.01)
    assert 20_000 < n < 30_000
    mde = M.mde_proportions(0.03, n)
    assert mde == pytest.approx(0.15, abs=0.01)


def test_abc_classes_and_gini():
    assert M.abc_classes([50, 30, 10, 5, 3, 2]) == ["A", "A", "B", "B", "C", "C"]
    assert M.gini([1, 1, 1, 1]) == pytest.approx(0.0)
    assert M.gini([0, 0, 0, 10]) == pytest.approx(0.75)


def _simulate_mbgnbd(n, r, alpha, a, b, T, seed=0):
    """Draw customers from the MBG/NBD generative process."""
    rng = np.random.default_rng(seed)
    lam = rng.gamma(r, 1 / alpha, n)
    p = rng.beta(a, b, n)
    x = np.zeros(n)
    t_x = np.zeros(n)
    for i in range(n):
        t = 0.0
        if rng.random() < p[i]:  # MBG: may drop out right after the first purchase
            continue
        while True:
            t += rng.exponential(1 / lam[i])
            if t > T:
                break
            x[i] += 1
            t_x[i] = t
            if rng.random() < p[i]:
                break
    return x, t_x, np.full(n, float(T))


def test_mbgnbd_recovers_parameters_and_behaves():
    x, t_x, T = _simulate_mbgnbd(4000, r=0.8, alpha=40.0, a=0.6, b=3.0, T=365)
    p = M.mbgnbd_fit(x, t_x, T)
    assert p["r"] == pytest.approx(0.8, rel=0.25)
    assert p["alpha"] == pytest.approx(40.0, rel=0.35)
    assert p["a"] / (p["a"] + p["b"]) == pytest.approx(0.6 / 3.6, rel=0.35)

    # more future time -> more expected purchases
    e30 = M.mbgnbd_expected_purchases(30, p, [3], [300], [365])
    e90 = M.mbgnbd_expected_purchases(90, p, [3], [300], [365])
    assert 0 < e30[0] < e90[0]
    # same frequency, but a long silence since the last purchase -> less likely alive
    alive = M.mbgnbd_p_alive(p, [3, 3], [350, 50], [365, 365])
    assert 0 < alive[1] < alive[0] <= 1


def test_mbgnbd_loglik_is_finite_for_extreme_parameters():
    ll = M.mbgnbd_loglik((0.8, 70.0, 1e-4, 1e4), np.array([0, 5, 100]), np.array([0, 100, 360]),
                         np.array([10, 200, 365]))
    assert np.isfinite(ll).all() and (ll < 0).all()


def test_gamma_gamma_shrinks_towards_population_mean():
    params = {"p": 2.0, "q": 3.0, "v": 400.0}
    pop = 2.0 * 400.0 / (3.0 - 1)
    few, many = M.gamma_gamma_expected_spend(params, [1, 50], [1000, 1000])
    assert pop < few < many < 1000
    assert M.gamma_gamma_expected_spend(params, [0], [0])[0] == pytest.approx(pop)
