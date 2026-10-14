"""Round-trip tests: sklearn -> JSON -> reference scorer, plus TreeSHAP correctness."""

import itertools
import json
import math
from pathlib import Path

import numpy as np
import pytest
from sklearn.calibration import CalibratedClassifierCV
from sklearn.frozen import FrozenEstimator

from churn import inference
from churn.export import export_model
from churn.modeling import make_pipeline

ROOT = Path(__file__).resolve().parents[2]


def _rows(X, n):
    out = []
    for rec in X.iloc[:n].to_dict(orient="records"):
        out.append({k: (None if isinstance(v, float) and math.isnan(v) else v) for k, v in rec.items()})
    return out


def _fit(name, X, y, params=None):
    pipe = make_pipeline(name)
    if params:
        pipe.set_params(**params)
    return pipe.fit(X, y)


@pytest.mark.parametrize("name,params", [
    ("logreg_l2", None),
    ("hist_gb", {"clf__max_iter": 30, "clf__max_leaf_nodes": 8}),
    ("random_forest", {"clf__n_estimators": 15, "clf__max_depth": 6}),
])
@pytest.mark.parametrize("method", ["none", "sigmoid", "isotonic"])
def test_round_trip_parity(data, name, params, method):
    X_tr, X_te, y_tr, y_te = data
    X_fit, y_fit = X_tr.iloc[:2500], y_tr.iloc[:2500]
    X_cal, y_cal = X_tr.iloc[2500:], y_tr.iloc[2500:]
    pipe = _fit(name, X_fit, y_fit, params)
    final = pipe if method == "none" else CalibratedClassifierCV(
        FrozenEstimator(pipe), method=method).fit(X_cal, y_cal)
    mean = pipe.named_steps["prep"].transform(X_fit).mean(axis=0)
    bundle = json.loads(json.dumps(export_model(final, mean)))  # through real JSON
    expected = final.predict_proba(X_te.iloc[:150])[:, 1]
    got = np.array([inference.predict_proba(r, bundle) for r in _rows(X_te, 150)])
    # Forests compare float32-cast inputs in sklearn; allow for boundary rounding there.
    tol = 1e-6 if name == "random_forest" else 1e-12
    np.testing.assert_allclose(got, expected, atol=tol, rtol=0)


def _brute_force_tree_shap(tree, z):
    """Exact Shapley values of v(S) = E[tree | x_S] with cover-weighted marginalisation."""
    feats = sorted({f for f in tree["feature"] if f >= 0})

    def v(S, node=0):
        f = tree["feature"][node]
        if f < 0:
            return tree["value"][node]
        left, right = tree["left"][node], tree["right"][node]
        if f in S:
            return v(S, left if z[f] <= tree["threshold"][node] else right)
        c = tree["cover"]
        return (c[left] * v(S, left) + c[right] * v(S, right)) / c[node]

    n = len(feats)
    phi = {}
    for f in feats:
        others = [g for g in feats if g != f]
        total = 0.0
        for k in range(n):
            for S in itertools.combinations(others, k):
                w = math.factorial(k) * math.factorial(n - k - 1) / math.factorial(n)
                total += w * (v(set(S) | {f}) - v(set(S)))
        phi[f] = total
    return phi


def test_tree_shap_matches_brute_force(data):
    X_tr, X_te, y_tr, _ = data
    pipe = _fit("hist_gb", X_tr, y_tr, {"clf__max_iter": 5, "clf__max_leaf_nodes": 12})
    mean = pipe.named_steps["prep"].transform(X_tr).mean(axis=0)
    bundle = export_model(pipe, mean)
    for row in _rows(X_te, 8):
        z = inference.transform_row(row, bundle)
        for tree in bundle["model"]["trees"]:
            phi = np.zeros(len(z))
            inference.tree_shap(tree, z, phi)
            expected = _brute_force_tree_shap(tree, z)
            for f, val in expected.items():
                assert phi[f] == pytest.approx(val, abs=1e-10)
            # Local accuracy per tree.
            leaf_value = tree["value"][inference._leaf(tree, z)]
            assert inference.tree_expected_value(tree) + phi.sum() == pytest.approx(leaf_value, abs=1e-10)


def test_tree_shap_matches_shap_library(data):
    shap = pytest.importorskip("shap")
    X_tr, X_te, y_tr, _ = data
    pipe = _fit("hist_gb", X_tr, y_tr, {"clf__max_iter": 20, "clf__max_leaf_nodes": 8})
    mean = pipe.named_steps["prep"].transform(X_tr).mean(axis=0)
    bundle = export_model(pipe, mean)
    Z = pipe.named_steps["prep"].transform(X_te.iloc[:10])
    explainer = shap.TreeExplainer(pipe.named_steps["clf"], feature_perturbation="tree_path_dependent")
    ref = explainer.shap_values(Z)
    for i, row in enumerate(_rows(X_te, 10)):
        _, phi = inference.explain(row, bundle)
        np.testing.assert_allclose(phi, ref[i], atol=1e-6)


def test_linear_explanation_is_additive(data):
    X_tr, X_te, y_tr, _ = data
    pipe = _fit("logreg_l2", X_tr, y_tr)
    mean = pipe.named_steps["prep"].transform(X_tr).mean(axis=0)
    bundle = export_model(pipe, mean)
    for row in _rows(X_te, 20):
        base, phi = inference.explain(row, bundle)
        raw = inference.raw_score(inference.transform_row(row, bundle), bundle["model"])
        assert base + phi.sum() == pytest.approx(raw, abs=1e-12)


@pytest.mark.parametrize("fname,role", [("model.json", "champion"), ("model_challenger.json", "challenger")])
def test_committed_artifacts_match_fixture(fname, role):
    """The shipped JSON model reproduces the shipped sklearn fixture probabilities."""
    model = json.loads((ROOT / "public" / "model" / fname).read_text())
    fixture = json.loads((ROOT / "public" / "model" / "parity_fixture.json").read_text())
    assert len(fixture["rows"]) >= 200
    for r in fixture["rows"]:
        assert inference.predict_proba(r["features"], model) == pytest.approx(r[role]["proba"], abs=1e-9)
