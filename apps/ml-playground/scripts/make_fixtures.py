"""Generate the bundled real datasets and the scikit-learn cross-check fixtures.

Run with `npm run fixtures` (needs numpy + scikit-learn). Outputs are committed,
so the app and `npm test` never need Python.

  src/data/{iris,wine,digits}.json   real datasets used by the PCA / classification pages
  tests/fixtures/sklearn.json        reference results the TypeScript engine is checked against
"""

import json
from pathlib import Path

import numpy as np
from sklearn import datasets
from sklearn.decomposition import PCA
from sklearn.linear_model import LinearRegression, LogisticRegression, Ridge
from sklearn.naive_bayes import GaussianNB

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "src" / "data"
FIXTURES = ROOT / "tests" / "fixtures"


def r(a, nd=6):
    return np.round(np.asarray(a, dtype=float), nd).tolist()


def dump(path: Path, obj) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, separators=(",", ":")) + "\n")
    print(f"wrote {path.relative_to(ROOT)} ({path.stat().st_size / 1024:.1f} KiB)")


def export_datasets() -> None:
    iris = datasets.load_iris()
    dump(DATA / "iris.json", {
        "name": "Iris",
        "featureNames": list(iris.feature_names),
        "classNames": list(iris.target_names),
        "X": r(iris.data, 2),
        "y": iris.target.tolist(),
    })
    wine = datasets.load_wine()
    dump(DATA / "wine.json", {
        "name": "Wine",
        "featureNames": list(wine.feature_names),
        "classNames": [f"cultivar {c}" for c in range(3)],
        "X": r(wine.data, 3),
        "y": wine.target.tolist(),
    })
    digits = datasets.load_digits()
    dump(DATA / "digits.json", {
        "name": "Digits 8x8",
        "featureNames": [f"px{i}" for i in range(64)],
        "classNames": [str(d) for d in range(10)],
        "X": digits.data.astype(int).tolist(),
        "y": digits.target.tolist(),
    })


def export_fixtures() -> None:
    rng = np.random.default_rng(42)
    out = {}

    # Ordinary least squares and ridge on a random linear problem.
    X = rng.normal(size=(60, 3))
    y = X @ np.array([1.5, -2.0, 0.7]) + 0.3 + rng.normal(scale=0.1, size=60)
    # Round first so the TypeScript side sees exactly the data sklearn fitted.
    X, y = np.round(X, 6), np.round(y, 6)
    ols = LinearRegression().fit(X, y)
    ridge = Ridge(alpha=2.0).fit(X, y)
    out["linear"] = {"X": r(X), "y": r(y), "coef": r(ols.coef_, 10), "intercept": float(ols.intercept_),
                     "ridgeAlpha": 2.0, "ridgeCoef": r(ridge.coef_, 10), "ridgeIntercept": float(ridge.intercept_)}

    # Unregularised logistic regression on overlapping classes (finite optimum).
    Xl = np.vstack([rng.normal(loc=[-1, -0.5], size=(60, 2)), rng.normal(loc=[1, 0.8], size=(60, 2))])
    Xl = np.round(Xl, 6)
    yl = np.array([0] * 60 + [1] * 60)
    logreg = LogisticRegression(C=np.inf, tol=1e-12, max_iter=10_000).fit(Xl, yl)
    out["logistic"] = {"X": r(Xl), "y": yl.tolist(), "coef": r(logreg.coef_[0], 10), "intercept": float(logreg.intercept_[0])}

    # PCA on Iris (the same rounded copy the app ships).
    iris = datasets.load_iris()
    Xi = np.round(iris.data, 2)
    pca = PCA().fit(Xi)
    out["pcaIris"] = {"explainedVariance": r(pca.explained_variance_, 10),
                      "explainedVarianceRatio": r(pca.explained_variance_ratio_, 10),
                      "components": r(pca.components_, 10)}

    # Gaussian naive Bayes on Iris.
    gnb = GaussianNB().fit(Xi, iris.target)
    out["gnbIris"] = {"predictions": gnb.predict(Xi).tolist(), "theta": r(gnb.theta_, 10), "var": r(gnb.var_, 10)}

    dump(FIXTURES / "sklearn.json", out)


if __name__ == "__main__":
    export_datasets()
    export_fixtures()
