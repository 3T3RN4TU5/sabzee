"""Loading and schema-level cleaning of the IBM Telco Customer Churn dataset.

Only *stateless*, row-wise cleaning happens here (type coercion). Anything that
learns from data (imputation values, vocabularies, scaling) lives inside the
sklearn Pipeline so it is fitted on the training split only.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

DATA_PATH = Path(__file__).resolve().parents[1] / "data" / "Telco-Customer-Churn.csv"
SOURCE_URL = (
    "https://raw.githubusercontent.com/IBM/telco-customer-churn-on-icp4d/"
    "master/data/Telco-Customer-Churn.csv"
)

ID_COL = "customerID"
TARGET = "Churn"

CATEGORICAL = [
    "gender",
    "Partner",
    "Dependents",
    "PhoneService",
    "MultipleLines",
    "InternetService",
    "OnlineSecurity",
    "OnlineBackup",
    "DeviceProtection",
    "TechSupport",
    "StreamingTV",
    "StreamingMovies",
    "Contract",
    "PaperlessBilling",
    "PaymentMethod",
]
NUMERIC = ["SeniorCitizen", "tenure", "MonthlyCharges", "TotalCharges"]
RAW_FEATURES = CATEGORICAL[:1] + ["SeniorCitizen"] + CATEGORICAL[1:] + ["tenure", "MonthlyCharges", "TotalCharges"]


def clean(df: pd.DataFrame) -> pd.DataFrame:
    """Coerce dtypes. Blank TotalCharges (brand-new customers) become NaN."""
    out = df.copy()
    out["TotalCharges"] = pd.to_numeric(
        out["TotalCharges"].astype(str).str.strip().replace("", np.nan), errors="coerce"
    )
    for col in ("SeniorCitizen", "tenure", "MonthlyCharges"):
        out[col] = pd.to_numeric(out[col], errors="coerce").astype(float)
    for col in CATEGORICAL:
        out[col] = out[col].astype(object)
    if TARGET in out:
        out[TARGET] = (out[TARGET].astype(str).str.strip() == "Yes").astype(int)
    return out


def load(path: Path = DATA_PATH) -> tuple[pd.DataFrame, pd.Series, pd.Series]:
    """Return (X raw features, y, customer ids)."""
    df = clean(pd.read_csv(path))
    return df[RAW_FEATURES].copy(), df[TARGET].copy(), df[ID_COL].copy()


def eda_summary(X: pd.DataFrame, y: pd.Series) -> dict:
    """Small, JSON-serialisable EDA summary used in the report and the web app."""
    summary: dict = {
        "n_rows": int(len(X)),
        "n_features": int(X.shape[1]),
        "churn_rate": float(y.mean()),
        "missing": {c: int(v) for c, v in X.isna().sum().items() if v},
        "numeric": {},
        "categorical_churn_rates": {},
    }
    for col in ("tenure", "MonthlyCharges", "TotalCharges"):
        s = X[col]
        summary["numeric"][col] = {
            "mean": float(s.mean()),
            "std": float(s.std()),
            "min": float(s.min()),
            "median": float(s.median()),
            "max": float(s.max()),
            "mean_churned": float(s[y == 1].mean()),
            "mean_retained": float(s[y == 0].mean()),
        }
    for col in ("Contract", "InternetService", "PaymentMethod", "TechSupport", "SeniorCitizen"):
        rates = y.groupby(X[col]).agg(["mean", "size"])
        summary["categorical_churn_rates"][col] = [
            {"level": str(k), "churn_rate": float(r["mean"]), "n": int(r["size"])}
            for k, r in rates.iterrows()
        ]
    return summary
