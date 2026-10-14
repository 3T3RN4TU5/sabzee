"""Feature engineering + leakage-safe preprocessing.

`engineer` is a pure, row-wise function (no fitted state), so it is safe to
apply anywhere. It is mirrored exactly in `src/ml/features.ts` for the browser.
Everything with learned state lives in the ColumnTransformer and is fitted on
the training fold only.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import FunctionTransformer, OneHotEncoder, StandardScaler

from .data import CATEGORICAL

SERVICE_COLS = [
    "PhoneService",
    "MultipleLines",
    "OnlineSecurity",
    "OnlineBackup",
    "DeviceProtection",
    "TechSupport",
    "StreamingTV",
    "StreamingMovies",
]
# Tenure bucket edges in months: [0,6) [6,12) [12,24) [24,48) [48,inf)
TENURE_EDGES = [6, 12, 24, 48]
TENURE_LABELS = ["0-5m", "6-11m", "12-23m", "24-47m", "48m+"]

ENGINEERED_NUMERIC = ["num_services", "avg_monthly_spend", "charge_ratio", "auto_pay", "has_family"]
ENGINEERED_CATEGORICAL = ["tenure_bucket"]

NUM_FEATURES = ["SeniorCitizen", "tenure", "MonthlyCharges", "TotalCharges", *ENGINEERED_NUMERIC]
CAT_FEATURES = [*CATEGORICAL, *ENGINEERED_CATEGORICAL]


def tenure_bucket(t: float) -> str | float:
    if t != t:  # NaN
        return np.nan
    for edge, label in zip(TENURE_EDGES, TENURE_LABELS):
        if t < edge:
            return label
    return TENURE_LABELS[-1]


def engineer(X: pd.DataFrame) -> pd.DataFrame:
    """Add domain features. Pure function of a single row (no data-dependent state)."""
    out = X.copy()
    services = sum((out[c] == "Yes").astype(float) for c in SERVICE_COLS)
    has_internet = (out["InternetService"].isin(["DSL", "Fiber optic"])).astype(float)
    out["num_services"] = services + has_internet
    tenure = out["tenure"].astype(float)
    total = out["TotalCharges"].astype(float)
    monthly = out["MonthlyCharges"].astype(float)
    # Average historical spend per month; undefined (NaN -> imputed) for tenure 0.
    avg = total / tenure.where(tenure > 0)
    out["avg_monthly_spend"] = avg
    # Current bill vs historical average: >1 means the price went up recently.
    out["charge_ratio"] = monthly / avg.where(avg > 0)
    out["auto_pay"] = out["PaymentMethod"].astype(str).str.contains("automatic").astype(float)
    out["has_family"] = ((out["Partner"] == "Yes") | (out["Dependents"] == "Yes")).astype(float)
    out["tenure_bucket"] = tenure.map(tenure_bucket).astype(object)
    return out


def build_preprocessor() -> Pipeline:
    numeric = Pipeline(
        [("impute", SimpleImputer(strategy="median")), ("scale", StandardScaler())]
    )
    categorical = Pipeline(
        [
            ("impute", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
        ]
    )
    columns = ColumnTransformer(
        [("num", numeric, NUM_FEATURES), ("cat", categorical, CAT_FEATURES)],
        verbose_feature_names_out=True,
    )
    return Pipeline(
        [
            ("engineer", FunctionTransformer(engineer, validate=False)),
            ("columns", columns),
        ]
    )


def feature_group(transformed_name: str) -> str:
    """Map a transformed column (e.g. 'cat__Contract_Two year') to its source feature."""
    kind, rest = transformed_name.split("__", 1)
    if kind == "num":
        return rest
    for col in sorted(CAT_FEATURES, key=len, reverse=True):
        if rest.startswith(col + "_"):
            return col
    raise ValueError(transformed_name)
