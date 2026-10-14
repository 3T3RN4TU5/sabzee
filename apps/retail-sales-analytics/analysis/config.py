"""Shared paths and constants for the analysis pipeline."""

from __future__ import annotations

from pathlib import Path

ANALYSIS_DIR = Path(__file__).resolve().parent
REPO_ROOT = ANALYSIS_DIR.parent
DATA_DIR = ANALYSIS_DIR / "data"
RAW_DIR = DATA_DIR / "raw"
RAW_CSV = RAW_DIR / "online_retail.csv"
WAREHOUSE = DATA_DIR / "warehouse.duckdb"
EXPERIMENT_CSV = DATA_DIR / "experiment_visitors.csv"
SQL_DIR = ANALYSIS_DIR / "sql"
OUTPUT_DIR = REPO_ROOT / "public" / "data"

# The UCI "Online Retail" extract has exactly this many rows. A mismatch means
# the source changed (or a different extract was downloaded) and is surfaced as
# a data-quality warning rather than silently analysed.
EXPECTED_RAW_ROWS = 541_909
RAW_SHA256 = "a2f79bbdd4463df6db8a3f5a50b9c980ae8f645a370bf5e2c0d6097f9e817b05"

RAW_COLUMNS = [
    "InvoiceNo",
    "StockCode",
    "Description",
    "Quantity",
    "InvoiceDate",
    "UnitPrice",
    "CustomerID",
    "Country",
]

# Analysis window: the extract covers 2010-12-01 .. 2011-12-09.
PERIOD_START = "2010-12-01"
PERIOD_END_EXCLUSIVE = "2011-12-10"

SEED = 2410
