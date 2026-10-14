import sys
from pathlib import Path

import pytest

ML_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ML_DIR))


@pytest.fixture(scope="session")
def data():
    from sklearn.model_selection import train_test_split

    from churn.data import load

    X, y, _ = load()
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.3, stratify=y, random_state=0)
    return X_tr, X_te, y_tr, y_te
