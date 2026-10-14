"""Pure, unit-tested statistical building blocks used by models.py.

Kept free of I/O so each function can be tested against hand-computed values or
reference implementations (scipy / statsmodels) in analysis/tests.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np
from scipy import optimize, special, stats

# ─── Forecast accuracy ──────────────────────────────────────────────────────


def mape(actual, forecast) -> float:
    """Mean absolute percentage error over periods with non-zero actuals."""
    a = np.asarray(actual, float)
    f = np.asarray(forecast, float)
    mask = a != 0
    if not mask.any():
        return float("nan")
    return float(np.mean(np.abs((a[mask] - f[mask]) / a[mask])))


def wape(actual, forecast) -> float:
    """Weighted APE = sum|a - f| / sum|a|; robust to zero-revenue days."""
    a = np.asarray(actual, float)
    f = np.asarray(forecast, float)
    return float(np.abs(a - f).sum() / np.abs(a).sum())


def rmse(actual, forecast) -> float:
    a = np.asarray(actual, float)
    f = np.asarray(forecast, float)
    return float(np.sqrt(np.mean((a - f) ** 2)))


def bias(actual, forecast) -> float:
    """Signed bias as a share of actuals (positive = over-forecast)."""
    a = np.asarray(actual, float)
    f = np.asarray(forecast, float)
    return float((f - a).sum() / a.sum())


# ─── A/B testing ────────────────────────────────────────────────────────────


@dataclass(frozen=True)
class ProportionTest:
    p_control: float
    p_treatment: float
    diff: float
    rel_lift: float
    z: float
    p_value: float
    ci_low: float
    ci_high: float
    rel_ci_low: float
    rel_ci_high: float


def two_proportion_ztest(x_c: int, n_c: int, x_t: int, n_t: int, alpha: float = 0.05) -> ProportionTest:
    """Two-sided pooled z-test for p_t - p_c with an unpooled Wald CI.

    The relative-lift CI uses the delta method on log(p_t / p_c)."""
    p_c, p_t = x_c / n_c, x_t / n_t
    pooled = (x_c + x_t) / (n_c + n_t)
    se_pooled = math.sqrt(pooled * (1 - pooled) * (1 / n_c + 1 / n_t))
    z = (p_t - p_c) / se_pooled
    p_value = 2 * stats.norm.sf(abs(z))
    zcrit = stats.norm.ppf(1 - alpha / 2)
    se = math.sqrt(p_c * (1 - p_c) / n_c + p_t * (1 - p_t) / n_t)
    diff = p_t - p_c
    se_log = math.sqrt((1 - p_t) / x_t + (1 - p_c) / x_c)
    log_rr = math.log(p_t / p_c)
    return ProportionTest(
        p_control=p_c,
        p_treatment=p_t,
        diff=diff,
        rel_lift=p_t / p_c - 1,
        z=z,
        p_value=float(p_value),
        ci_low=diff - zcrit * se,
        ci_high=diff + zcrit * se,
        rel_ci_low=math.exp(log_rr - zcrit * se_log) - 1,
        rel_ci_high=math.exp(log_rr + zcrit * se_log) - 1,
    )


@dataclass(frozen=True)
class MeanTest:
    mean_control: float
    mean_treatment: float
    diff: float
    rel_diff: float
    t: float
    df: float
    p_value: float
    ci_low: float
    ci_high: float


def welch_ttest(control, treatment, alpha: float = 0.05) -> MeanTest:
    """Welch's unequal-variance t-test with Welch-Satterthwaite df and CI."""
    a = np.asarray(control, float)
    b = np.asarray(treatment, float)
    va, vb = a.var(ddof=1) / len(a), b.var(ddof=1) / len(b)
    se = math.sqrt(va + vb)
    diff = b.mean() - a.mean()
    t = diff / se
    df = (va + vb) ** 2 / (va**2 / (len(a) - 1) + vb**2 / (len(b) - 1))
    p = 2 * stats.t.sf(abs(t), df)
    tcrit = stats.t.ppf(1 - alpha / 2, df)
    return MeanTest(a.mean(), b.mean(), diff, diff / a.mean(), t, df, float(p), diff - tcrit * se, diff + tcrit * se)


def bootstrap_diff_ci(
    control, treatment, stat=np.mean, n_boot: int = 4000, alpha: float = 0.05, seed: int = 0
) -> tuple[float, float, float]:
    """Percentile bootstrap CI for stat(treatment) - stat(control).

    Returns (point estimate, low, high). Resampling is done independently per arm."""
    rng = np.random.default_rng(seed)
    a = np.asarray(control, float)
    b = np.asarray(treatment, float)
    ia = rng.integers(0, len(a), size=(n_boot, len(a)))
    ib = rng.integers(0, len(b), size=(n_boot, len(b)))
    if stat is np.mean:
        diffs = b[ib].mean(axis=1) - a[ia].mean(axis=1)
    else:
        diffs = np.array([stat(b[j]) - stat(a[i]) for i, j in zip(ia, ib, strict=True)])
    lo, hi = np.quantile(diffs, [alpha / 2, 1 - alpha / 2])
    return float(stat(b) - stat(a)), float(lo), float(hi)


def srm_check(n_control: int, n_treatment: int, expected_share: float = 0.5, threshold: float = 0.001) -> dict:
    """Sample-ratio-mismatch chi-square test. p < threshold means the split is broken."""
    n = n_control + n_treatment
    expected = np.array([n * expected_share, n * (1 - expected_share)])
    observed = np.array([n_control, n_treatment])
    chi2 = float(((observed - expected) ** 2 / expected).sum())
    p = float(stats.chi2.sf(chi2, df=1))
    return {"chi2": chi2, "p_value": p, "observed_share": n_control / n, "passed": p >= threshold}


def required_n_per_arm(p_base: float, mde_rel: float, alpha: float = 0.05, power: float = 0.8) -> int:
    """Sample size per arm for a two-sided two-proportion test (unpooled variance)."""
    p2 = p_base * (1 + mde_rel)
    za = stats.norm.ppf(1 - alpha / 2)
    zb = stats.norm.ppf(power)
    var = p_base * (1 - p_base) + p2 * (1 - p2)
    return int(math.ceil((za + zb) ** 2 * var / (p2 - p_base) ** 2))


def power_two_proportions(p_c: float, p_t: float, n_c: int, n_t: int, alpha: float = 0.05) -> float:
    """Power of a two-sided two-proportion z-test (normal approximation)."""
    se = math.sqrt(p_c * (1 - p_c) / n_c + p_t * (1 - p_t) / n_t)
    za = stats.norm.ppf(1 - alpha / 2)
    shift = abs(p_t - p_c) / se
    return float(stats.norm.cdf(shift - za) + stats.norm.cdf(-shift - za))


def mde_proportions(p_base: float, n_per_arm: int, alpha: float = 0.05, power: float = 0.8) -> float:
    """Smallest relative lift detectable with the given power at n per arm (solved numerically)."""
    f = lambda rel: power_two_proportions(p_base, p_base * (1 + rel), n_per_arm, n_per_arm, alpha) - power  # noqa: E731
    return float(optimize.brentq(f, 1e-6, 10.0))


# ─── MBG/NBD + Gamma-Gamma ──────────────────────────────────────────────────
# MBG/NBD (Batislam, Denizel & Filiztekin 2007) is the BG/NBD model of Fader,
# Hardie & Lee (2005) with one change: a customer may also drop out right after
# the *first* purchase. Plain BG/NBD forces P(alive) = 1 for every one-time
# buyer, which is badly wrong for a business where a third of customers never
# reorder. Time unit: days.


def mbgnbd_loglik(params, x, t_x, T) -> np.ndarray:
    """Per-customer MBG/NBD log-likelihood. params = (r, alpha, a, b)."""
    r, alpha, a, b = params
    x = np.asarray(x, float)
    t_x = np.asarray(t_x, float)
    T = np.asarray(T, float)
    a1 = special.gammaln(r + x) - special.gammaln(r) + r * np.log(alpha)
    # B(a, b + x + 1) / B(a, b), written with betaln: the gammaln form loses all
    # precision for large b and an optimiser will happily exploit that.
    a2 = special.betaln(a, b + x + 1) - special.betaln(a, b)
    a3 = -(r + x) * np.log(alpha + T)
    a4 = np.log(a) - np.log(b + x) - (r + x) * np.log(alpha + t_x)
    return a1 + a2 + np.logaddexp(a3, a4)


def mbgnbd_fit(x, t_x, T) -> dict[str, float]:
    """Maximum-likelihood fit on log-parameters (keeps all four positive)."""

    def nll(logp):
        return -mbgnbd_loglik(np.exp(logp), x, t_x, T).sum()

    best = None
    bounds = [(np.log(1e-4), np.log(1e4))] * 4
    for x0 in ([0.5, 10.0, 0.5, 2.0], [1.0, 50.0, 1.0, 5.0], [0.3, 5.0, 0.2, 1.0]):
        res = optimize.minimize(nll, x0=np.log(x0), method="L-BFGS-B", bounds=bounds)
        if best is None or res.fun < best.fun:
            best = res
    r, alpha, a, b = np.exp(best.x)
    return {"r": float(r), "alpha": float(alpha), "a": float(a), "b": float(b), "loglik": float(-best.fun),
            "converged": bool(best.success)}


def mbgnbd_expected_purchases(t, p: dict, x, t_x, T) -> np.ndarray:
    """E[# transactions in (T, T + t] | x, t_x, T] for each customer."""
    r, alpha, a, b = p["r"], p["alpha"], p["a"], p["b"]
    x = np.asarray(x, float)
    t_x = np.asarray(t_x, float)
    T = np.asarray(T, float)
    hyp = special.hyp2f1(r + x, b + x + 1, a + b + x, t / (alpha + T + t))
    num = (a + b + x) / (a - 1) * (1 - ((alpha + T) / (alpha + T + t)) ** (r + x) * hyp)
    den = 1 + a / (b + x) * ((alpha + T) / (alpha + t_x)) ** (r + x)
    return num / den


def mbgnbd_p_alive(p: dict, x, t_x, T) -> np.ndarray:
    r, alpha, a, b = p["r"], p["alpha"], p["a"], p["b"]
    x = np.asarray(x, float)
    t_x = np.asarray(t_x, float)
    T = np.asarray(T, float)
    return 1 / (1 + a / (b + x) * ((alpha + T) / (alpha + t_x)) ** (r + x))


def mbgnbd_population_expected(t, p: dict) -> float:
    """Unconditional E[X(t)] for a new customer (used as a sanity check in tests)."""
    r, alpha, a, b = p["r"], p["alpha"], p["a"], p["b"]
    hyp = special.hyp2f1(r, b + 1, a + b, t / (alpha + t))
    return float(b / (a - 1) * (1 - (alpha / (alpha + t)) ** r * hyp))


def gamma_gamma_fit(x, m) -> dict[str, float]:
    """Fit the Gamma-Gamma spend model on repeat customers (x > 0, m = mean spend)."""
    x = np.asarray(x, float)
    m = np.asarray(m, float)

    def nll(logp):
        p, q, v = np.exp(logp)
        ll = (special.gammaln(p * x + q) - special.gammaln(p * x) - special.gammaln(q) + q * np.log(v)
              + (p * x - 1) * np.log(m) + p * x * np.log(x) - (p * x + q) * np.log(x * m + v))
        return -ll.sum()

    res = optimize.minimize(nll, x0=np.log([2.0, 3.0, 100.0]), method="Nelder-Mead",
                            options={"maxiter": 8000, "xatol": 1e-8, "fatol": 1e-8})
    p, q, v = np.exp(res.x)
    return {"p": float(p), "q": float(q), "v": float(v), "converged": bool(res.success)}


def gamma_gamma_expected_spend(params: dict, x, m) -> np.ndarray:
    """Posterior mean spend per transaction; falls back to the population mean for x = 0."""
    p, q, v = params["p"], params["q"], params["v"]
    x = np.asarray(x, float)
    m = np.asarray(m, float)
    pop = p * v / (q - 1)
    w = (q - 1) / (p * x + q - 1)
    return np.where(x > 0, w * pop + (1 - w) * m, pop)


# ─── Misc ───────────────────────────────────────────────────────────────────


def abc_classes(values, a_cut: float = 0.80, b_cut: float = 0.95) -> list[str]:
    """ABC class per item (input order preserved). An item is A if the cumulative
    share *before* it is below a_cut, i.e. it is needed to reach 80% of value."""
    v = np.asarray(values, float)
    order = np.argsort(-v, kind="stable")
    before = np.concatenate([[0.0], np.cumsum(v[order])[:-1]]) / v.sum()
    cls = np.where(before < a_cut, "A", np.where(before < b_cut, "B", "C"))
    out = np.empty(len(v), dtype=object)
    out[order] = cls
    return out.tolist()


def gini(values) -> float:
    """Gini coefficient of a non-negative distribution (0 = equal, 1 = concentrated)."""
    v = np.sort(np.asarray(values, float))
    n = len(v)
    cum = np.cumsum(v)
    return float((n + 1 - 2 * (cum / cum[-1]).sum()) / n)
