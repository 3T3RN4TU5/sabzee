"""Candidate models and hyper-parameter search spaces."""

from __future__ import annotations

from scipy.stats import loguniform, randint, uniform
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

from . import SEED
from .features import build_preprocessor

MODEL_LABELS = {
    "dummy": "Dummy (class prior)",
    "logreg_l2": "Logistic regression (L2)",
    "logreg_l1": "Logistic regression (L1)",
    "random_forest": "Random forest",
    "hist_gb": "Hist. gradient boosting",
}

FAMILY_LABELS = {
    "logreg": "Logistic regression (elastic net)",
    "random_forest": "Random forest",
    "hist_gb": "Hist. gradient boosting",
}


def make_estimator(name: str, class_weight: str | None = None):
    if name == "dummy":
        return DummyClassifier(strategy="prior")
    if name == "logreg_l2":
        return LogisticRegression(C=1.0, l1_ratio=0.0, max_iter=5000, class_weight=class_weight)
    if name == "logreg_l1":
        return LogisticRegression(C=1.0, l1_ratio=1.0, solver="liblinear", max_iter=5000,
                                  class_weight=class_weight, random_state=SEED)
    if name == "random_forest":
        return RandomForestClassifier(n_estimators=300, min_samples_leaf=5, max_features="sqrt",
                                      n_jobs=-1, random_state=SEED, class_weight=class_weight)
    if name == "hist_gb":
        return HistGradientBoostingClassifier(learning_rate=0.05, max_iter=200, random_state=SEED,
                                              class_weight=class_weight, early_stopping=False)
    if name == "logreg":
        return LogisticRegression(solver="saga", max_iter=20000, class_weight=class_weight,
                                  random_state=SEED)
    raise KeyError(name)


def make_pipeline(name: str, class_weight: str | None = None) -> Pipeline:
    return Pipeline([("prep", build_preprocessor()), ("clf", make_estimator(name, class_weight))])


SEARCH_SPACES = {
    "logreg": {
        "clf__C": loguniform(1e-3, 1e2),
        "clf__l1_ratio": uniform(0, 1),
    },
    "hist_gb": {
        "clf__learning_rate": loguniform(0.01, 0.2),
        "clf__max_iter": randint(50, 400),
        "clf__max_leaf_nodes": randint(4, 32),
        "clf__max_depth": [None, 3, 4, 5, 6],
        "clf__min_samples_leaf": randint(10, 120),
        "clf__l2_regularization": loguniform(1e-3, 10),
    },
    "random_forest": {
        "clf__n_estimators": randint(150, 400),
        "clf__min_samples_leaf": randint(1, 30),
        "clf__max_features": ["sqrt", 0.3, 0.5],
        "clf__max_depth": [None, 6, 10, 16],
    },
}
