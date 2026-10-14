"""Simulate a checkout A/B test on top of the real order-value distribution.

The UCI dataset has no experiment in it, so this module *simulates* one in a
way that keeps it honest and reproducible:

* Visitors (not orders) are the randomisation unit; traffic, device mix and
  conversion rates are set to plausible values for a B2B gift wholesaler.
* Order values are bootstrapped from the real cleaned invoices, so the AOV
  distribution has the same heavy right tail as the business's real orders.
* A known ("planted") effect is injected so the analysis can be checked
  against ground truth: the new one-page checkout lifts conversion by ~8% on
  desktop and ~28% on mobile and has no true effect on basket size.

Everything is seeded; the same seed always produces the same CSV.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from config import SEED

START = "2011-09-05"  # Monday
DAYS = 28
DAILY_VISITORS = 2_200
MOBILE_SHARE = 0.42
CONTROL_CVR = {"desktop": 0.034, "mobile": 0.024}
TRUE_LIFT = {"desktop": 0.08, "mobile": 0.28}
AOV_MULTIPLIER_TREATMENT = 1.0  # no true AOV effect

# Pre-registration (decided before launch, used for the power analysis)
PRE_REG = {
    "hypothesis": "The one-page checkout increases visitor-to-order conversion.",
    "primary_metric": "Conversion rate (orders / visitors)",
    "secondary_metrics": ["Revenue per visitor", "Average order value (guardrail)"],
    "baseline_cvr": 0.030,
    "mde_relative": 0.15,
    "alpha": 0.05,
    "power": 0.80,
    "split": 0.5,
    "planned_days": DAYS,
}


def simulate(order_values: np.ndarray, seed: int = SEED) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    days = pd.date_range(START, periods=DAYS, freq="D")
    # Weekly traffic shape: quieter weekends for a B2B buyer audience.
    dow_factor = np.array([1.08, 1.10, 1.06, 1.04, 0.96, 0.78, 0.98])
    counts = rng.poisson(DAILY_VISITORS * dow_factor[days.dayofweek])
    date = np.repeat(days.values, counts)
    n = len(date)

    variant = np.where(rng.random(n) < 0.5, "control", "treatment")
    device = np.where(rng.random(n) < MOBILE_SHARE, "mobile", "desktop")

    base = np.where(device == "mobile", CONTROL_CVR["mobile"], CONTROL_CVR["desktop"])
    lift = np.where(device == "mobile", TRUE_LIFT["mobile"], TRUE_LIFT["desktop"])
    p = np.where(variant == "treatment", base * (1 + lift), base)
    converted = rng.random(n) < p

    values = rng.choice(order_values, size=n, replace=True)
    values = np.where(variant == "treatment", values * AOV_MULTIPLIER_TREATMENT, values)
    order_value = np.where(converted, np.round(values, 2), 0.0)

    return pd.DataFrame(
        {
            "visitor_id": np.arange(1, n + 1),
            "date": pd.to_datetime(date).date,
            "variant": variant,
            "device": device,
            "converted": converted.astype(np.int8),
            "order_value": order_value,
        }
    )
