"""Download the UCI Online Retail dataset into analysis/data/raw/.

Sources are tried in order. The primary source is the UCI Machine Learning
Repository (dataset 352, CC BY 4.0). Because that host is not reachable from
every network, a byte-identical CSV export of the same dataset that is
published in the Databricks "Spark: The Definitive Guide" repository is used
as a fallback. Both produce the same 541,909-row table; the checksum of the
CSV that the committed dashboard data was built from is recorded in config.py.

Usage:  python analysis/fetch_data.py [--force]
"""

from __future__ import annotations

import argparse
import hashlib
import io
import sys
import urllib.request
import zipfile

import pandas as pd

from config import RAW_COLUMNS, RAW_CSV, RAW_SHA256

UCI_ZIP = "https://archive.ics.uci.edu/static/public/352/online+retail.zip"
MIRROR_CSV = (
    "https://raw.githubusercontent.com/databricks/Spark-The-Definitive-Guide/"
    "master/data/retail-data/all/online-retail-dataset.csv"
)


def _get(url: str, timeout: int = 180) -> bytes:
    with urllib.request.urlopen(url, timeout=timeout) as resp:  # noqa: S310 (fixed https URLs)
        return resp.read()


def from_uci() -> pd.DataFrame:
    payload = _get(UCI_ZIP)
    with zipfile.ZipFile(io.BytesIO(payload)) as zf:
        name = next(n for n in zf.namelist() if n.lower().endswith(".xlsx"))
        with zf.open(name) as fh:
            df = pd.read_excel(fh, dtype={"InvoiceNo": str, "StockCode": str})
    # Match the CSV export's date format so downstream parsing is identical.
    df["InvoiceDate"] = pd.to_datetime(df["InvoiceDate"]).dt.strftime("%-m/%-d/%Y %-H:%M")
    df["CustomerID"] = df["CustomerID"].astype("Int64")
    return df[RAW_COLUMNS]


def from_mirror() -> bytes:
    payload = _get(MIRROR_CSV)
    header = payload.split(b"\n", 1)[0].decode().strip().split(",")
    if header != RAW_COLUMNS:
        raise ValueError(f"unexpected header {header}")
    return payload


def sha256(path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--force", action="store_true", help="re-download even if the file exists")
    args = parser.parse_args()

    if RAW_CSV.exists() and not args.force:
        print(f"[fetch] {RAW_CSV} already present (sha256 {sha256(RAW_CSV)[:12]}…)")
        return 0

    RAW_CSV.parent.mkdir(parents=True, exist_ok=True)
    errors: list[str] = []
    loaders: tuple = (("UCI repository", from_uci), ("GitHub mirror", from_mirror))
    for label, loader in loaders:
        try:
            print(f"[fetch] trying {label} …")
            df = loader()
        except Exception as exc:  # network/proxy errors are expected on some hosts
            errors.append(f"{label}: {exc}")
            continue
        if isinstance(df, bytes):
            RAW_CSV.write_bytes(df)
        else:
            df.to_csv(RAW_CSV, index=False)
        digest = sha256(RAW_CSV)
        note = "matches" if digest == RAW_SHA256 else "differs from"
        print(f"[fetch] wrote {RAW_CSV} (sha256 {note} the reference build)")
        return 0

    print("[fetch] all sources failed:\n  " + "\n  ".join(errors), file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
