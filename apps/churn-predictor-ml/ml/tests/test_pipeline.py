"""Leakage and feature-engineering tests for the preprocessing pipeline."""

import math

import numpy as np
import pandas as pd

from churn import inference
from churn.data import RAW_FEATURES, clean
from churn.export import export_preprocessor
from churn.features import NUM_FEATURES, build_preprocessor, engineer
from churn.modeling import make_pipeline


def test_engineer_is_row_wise(data):
    """Engineering one row must equal the same row engineered in a batch (no batch statistics)."""
    X_tr, *_ = data
    batch = engineer(X_tr.iloc[:50])
    for i in range(50):
        single = engineer(X_tr.iloc[[i]])
        pd.testing.assert_frame_equal(single.reset_index(drop=True), batch.iloc[[i]].reset_index(drop=True))


def test_preprocessor_statistics_come_from_train_only(data):
    X_tr, X_te, *_ = data
    prep = build_preprocessor().fit(X_tr)
    exported = export_preprocessor(prep)
    eng_tr = engineer(X_tr)
    for name, imp, mean in zip(NUM_FEATURES, exported["numeric"]["impute"], exported["numeric"]["mean"]):
        col = eng_tr[name].astype(float)
        assert math.isclose(imp, float(col.median()), rel_tol=1e-12)
        assert math.isclose(mean, float(col.fillna(col.median()).mean()), rel_tol=1e-9, abs_tol=1e-12)
    # Statistics must differ from those of the full dataset (otherwise the test proves nothing).
    full = build_preprocessor().fit(pd.concat([X_tr, X_te]))
    assert export_preprocessor(full)["numeric"]["mean"] != exported["numeric"]["mean"]


def test_test_set_cannot_influence_fitted_pipeline(data):
    """Fitting on train then corrupting the test set changes nothing learned."""
    X_tr, X_te, y_tr, _ = data
    pipe = make_pipeline("logreg_l2").fit(X_tr, y_tr)
    coef_before = pipe.named_steps["clf"].coef_.copy()
    X_bad = X_te.copy()
    X_bad["MonthlyCharges"] = 1e6
    X_bad["Contract"] = "Never seen before"
    pipe.predict_proba(X_bad)  # unseen category handled, no refit
    np.testing.assert_array_equal(pipe.named_steps["clf"].coef_, coef_before)


def test_unknown_category_and_missing_values_are_handled(data):
    X_tr, _, y_tr, _ = data
    pipe = make_pipeline("logreg_l2").fit(X_tr, y_tr)
    row = X_tr.iloc[[0]].copy()
    row["PaymentMethod"] = "Crypto"
    row["TotalCharges"] = np.nan
    p = pipe.predict_proba(row)[0, 1]
    assert 0 < p < 1


def test_clean_handles_blank_total_charges():
    raw = pd.DataFrame([{c: "No" for c in RAW_FEATURES} | {
        "SeniorCitizen": 0, "tenure": 0, "MonthlyCharges": 20.0, "TotalCharges": " ", "Churn": "No"}])
    out = clean(raw)
    assert math.isnan(out["TotalCharges"].iloc[0])
    assert out["Churn"].iloc[0] == 0


def test_python_twin_matches_pandas_feature_engineering(data):
    X_tr, *_ = data
    spec = {"service_cols": __import__("churn.features", fromlist=["x"]).SERVICE_COLS,
            "tenure_edges": [6, 12, 24, 48], "tenure_labels": ["0-5m", "6-11m", "12-23m", "24-47m", "48m+"]}
    eng = engineer(X_tr.iloc[:300])
    for i in range(300):
        row = {k: (None if isinstance(v, float) and math.isnan(v) else v)
               for k, v in X_tr.iloc[i].to_dict().items()}
        twin = inference.engineer_row(row, spec)
        for col in ("num_services", "avg_monthly_spend", "charge_ratio", "auto_pay", "has_family"):
            a, b = float(eng[col].iloc[i]), float(twin[col])
            assert (math.isnan(a) and math.isnan(b)) or a == b, col
        assert eng["tenure_bucket"].iloc[i] == twin["tenure_bucket"]
