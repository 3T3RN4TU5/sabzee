"""Export a fitted (calibrated) sklearn pipeline to a self-describing JSON file
that the browser can score without Python.

Format (version 1):
  preprocess   imputation values, scaler mean/scale, one-hot vocabularies
  model        {type: logistic|gbdt|forest, ...parameters / tree arrays}
  calibration  {method: isotonic (x,y knots) | sigmoid (a,b) | none}
"""

from __future__ import annotations

import numpy as np
import sklearn
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.isotonic import IsotonicRegression
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

from .features import (
    CAT_FEATURES,
    NUM_FEATURES,
    SERVICE_COLS,
    TENURE_EDGES,
    TENURE_LABELS,
    feature_group,
)

FORMAT_VERSION = 1


def _f(a) -> list[float]:
    return [float(x) for x in np.asarray(a, dtype=np.float64).ravel()]


def export_preprocessor(prep: Pipeline) -> dict:
    cols = prep.named_steps["columns"]
    num = cols.named_transformers_["num"]
    cat = cols.named_transformers_["cat"]
    return {
        "numeric": {
            "features": list(NUM_FEATURES),
            "impute": _f(num.named_steps["impute"].statistics_),
            "mean": _f(num.named_steps["scale"].mean_),
            "scale": _f(num.named_steps["scale"].scale_),
        },
        "categorical": {
            "features": list(CAT_FEATURES),
            "impute": [str(v) for v in cat.named_steps["impute"].statistics_],
            "categories": [[str(c) for c in cats] for cats in cat.named_steps["onehot"].categories_],
        },
    }


def _hgb_trees(clf: HistGradientBoostingClassifier) -> tuple[float, list[dict]]:
    trees = []
    for (predictor,) in clf._predictors:
        nodes = predictor.nodes
        if nodes["is_categorical"].any():
            raise ValueError("categorical splits are not supported by the exporter")
        leaf = nodes["is_leaf"].astype(bool)
        trees.append({
            "feature": [-1 if lf else int(f) for f, lf in zip(nodes["feature_idx"], leaf)],
            "threshold": [0.0 if lf else float(t) for t, lf in zip(nodes["num_threshold"], leaf)],
            "left": [-1 if lf else int(v) for v, lf in zip(nodes["left"], leaf)],
            "right": [-1 if lf else int(v) for v, lf in zip(nodes["right"], leaf)],
            "missing_left": [bool(v) for v in nodes["missing_go_to_left"]],
            # Leaf values already include the learning-rate shrinkage. Internal
            # values are unused at inference; zero them to keep the file honest.
            "value": [float(v) if lf else 0.0 for v, lf in zip(nodes["value"], leaf)],
            "cover": [int(c) for c in nodes["count"]],
        })
    baseline = float(np.asarray(clf._baseline_prediction).ravel()[0])
    return baseline, trees


def _forest_trees(clf: RandomForestClassifier) -> list[dict]:
    trees = []
    pos = list(clf.classes_).index(1)
    for est in clf.estimators_:
        t = est.tree_
        leaf = t.children_left == -1
        proba = t.value[:, 0, :] / t.value[:, 0, :].sum(axis=1, keepdims=True)
        trees.append({
            "feature": [-1 if lf else int(f) for f, lf in zip(t.feature, leaf)],
            "threshold": [0.0 if lf else float(v) for v, lf in zip(t.threshold, leaf)],
            "left": [int(v) for v in t.children_left],
            "right": [int(v) for v in t.children_right],
            "missing_left": [bool(v) for v in t.missing_go_to_left],
            "value": [float(v) if lf else 0.0 for v, lf in zip(proba[:, pos], leaf)],
            "cover": [float(c) for c in t.weighted_n_node_samples],
        })
    return trees


def export_model(calibrated, prep_mean: np.ndarray, extra: dict | None = None) -> dict:
    """`calibrated` is a CalibratedClassifierCV around a FrozenEstimator(pipeline),
    or a bare fitted Pipeline when no calibration was selected."""
    if isinstance(calibrated, CalibratedClassifierCV):
        (cc,) = calibrated.calibrated_classifiers_
        pipe: Pipeline = cc.estimator
        if hasattr(pipe, "estimator"):  # FrozenEstimator
            pipe = pipe.estimator
        (calibrator,) = cc.calibrators
        if isinstance(calibrator, IsotonicRegression):
            calibration = {"method": "isotonic", "x": _f(calibrator.X_thresholds_),
                           "y": _f(calibrator.y_thresholds_)}
        else:
            calibration = {"method": "sigmoid", "a": float(calibrator.a_), "b": float(calibrator.b_)}
    else:
        pipe = calibrated
        calibration = {"method": "none"}

    prep, clf = pipe.named_steps["prep"], pipe.named_steps["clf"]
    names = [str(n) for n in prep.named_steps["columns"].get_feature_names_out()]

    if isinstance(clf, LogisticRegression):
        model = {"type": "logistic", "coef": _f(clf.coef_[0]), "intercept": float(clf.intercept_[0])}
        score_space = "logit"
    elif isinstance(clf, HistGradientBoostingClassifier):
        baseline, trees = _hgb_trees(clf)
        model = {"type": "gbdt", "baseline": baseline, "link": "logit", "trees": trees}
        score_space = "logit"
    elif isinstance(clf, RandomForestClassifier):
        model = {"type": "forest", "trees": _forest_trees(clf)}
        score_space = "probability"
    else:
        raise TypeError(f"cannot export {type(clf).__name__}")

    out = {
        "format_version": FORMAT_VERSION,
        "sklearn_version": sklearn.__version__,
        "estimator": type(clf).__name__,
        "engineering": {
            "service_cols": list(SERVICE_COLS),
            "tenure_edges": list(TENURE_EDGES),
            "tenure_labels": list(TENURE_LABELS),
        },
        "preprocess": export_preprocessor(prep),
        "feature_names": names,
        "feature_groups": [feature_group(n) for n in names],
        "model": model,
        "score_space": score_space,
        "calibration": calibration,
        "explanation": {
            "method": "linear" if model["type"] == "logistic" else "tree_shap",
            "space": "log-odds" if score_space == "logit" else "probability",
            "background_mean": _f(prep_mean),
        },
    }
    if extra:
        out.update(extra)
    return out
