"""ETL: raw UCI Online Retail CSV -> cleaned facts -> DuckDB star schema.

Cleaning rules are applied in a fixed order and every removed row is attributed
to exactly one rule, so raw row count = kept rows + sum(removed by rule). That
reconciliation is itself a blocking data-quality check.

Rules (in order):
  R1 duplicate          duplicate rows: same invoice, product, quantity, price,
                        timestamp, customer and country (the free-text
                        description is ignored; it varies for the same SKU)
  R2 non_merchandise    postage, carriage, fees, manual adjustments, discounts,
                        bad-debt adjustments, samples, gift vouchers
  R3 stock_adjustment   negative quantity on a non-cancellation invoice
                        (warehouse write-offs: "damaged", "lost", "?")
  R4 invalid_price      unit price <= 0 (free samples, unpriced lines)
  R5 cancelled_order    purchase line exactly reversed by a later cancellation
                        (same customer, product and quantity); both the
                        purchase and the cancellation are dropped because the
                        order was never fulfilled. This also removes the two
                        famous 80,995 / 74,215-unit keying errors.
  R6 implausible_line   quantity >= 10,000 units or unit price >= £1,000 on a
                        merchandise line: a hard guard for keying errors that
                        R5 did not catch (none remain in this extract).
  Large but plausible B2B lines (e.g. 3,114 units at £2.10) are *kept*: this is
  a wholesaler and bulk orders are its business. Skew is handled downstream
  with medians and log transforms instead of deleting real revenue.
  Remaining cancellations become fact_returns (partial returns / credits).
  Missing CustomerID is kept as a guest customer (key 0): it is valid revenue,
  but excluded from customer-level analytics.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

import duckdb
import numpy as np
import pandas as pd

from categories import OTHER, categorize
from config import EXPECTED_RAW_ROWS, PERIOD_END_EXCLUSIVE, PERIOD_START, RAW_COLUMNS, SQL_DIR
from quality import QualityReport

MERCH_CODE = r"^\d{5}[A-Z]{0,2}$"
MAX_QUANTITY = 10_000
MAX_UNIT_PRICE = 1_000.0
RETAIL_PRICE_RATIO = 8.0

RULES = [
    ("duplicate", "Exact duplicate rows"),
    ("non_merchandise", "Postage, fees, manual adjustments, discounts, vouchers"),
    ("stock_adjustment", "Negative quantity on a non-cancellation invoice (write-offs)"),
    ("invalid_price", "Unit price is zero or negative"),
    ("cancelled_order", "Purchase line fully reversed by a cancellation"),
    ("cancelled_order_reversal", "The cancellation line that reversed it"),
    ("implausible_line", f"Quantity >= {MAX_QUANTITY:,} or unit price >= £{MAX_UNIT_PRICE:,.0f}"),
]


@dataclass
class CleanResult:
    sales: pd.DataFrame
    returns: pd.DataFrame
    removed: dict[str, int]
    raw_rows: int
    guest_rows: int
    examples: dict[str, list[dict]] = field(default_factory=dict)
    flagged_retail: int = 0
    flagged_retail_guest_share: float = 0.0


# ─── Load & standardise ─────────────────────────────────────────────────────


def load_raw(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path, dtype=str, keep_default_na=False, na_values=[""])
    missing = [c for c in RAW_COLUMNS if c not in df.columns]
    if missing:
        raise ValueError(f"raw file is missing columns: {missing}")
    return df[RAW_COLUMNS]


def standardize(raw: pd.DataFrame) -> pd.DataFrame:
    """Rename to snake_case and coerce types. Unparseable values raise."""
    df = pd.DataFrame(
        {
            "source_row": np.arange(len(raw), dtype=np.int64),
            "invoice_no": raw["InvoiceNo"].astype("string").str.strip().str.upper(),
            "stock_code": raw["StockCode"].astype("string").str.strip().str.upper(),
            "description": raw["Description"].astype("string").str.strip().str.replace(r"\s+", " ", regex=True),
            "quantity": pd.to_numeric(raw["Quantity"], errors="raise").astype(np.int64),
            "invoice_ts": pd.to_datetime(raw["InvoiceDate"], format="%m/%d/%Y %H:%M", errors="raise"),
            "unit_price": pd.to_numeric(raw["UnitPrice"], errors="raise").astype(float),
            "customer_id": raw["CustomerID"].astype("string").str.strip().str.replace(r"\.0$", "", regex=True),
            "country": raw["Country"].astype("string").str.strip(),
        }
    )
    df.loc[df["description"] == "", "description"] = pd.NA
    df.loc[df["customer_id"] == "", "customer_id"] = pd.NA
    df["is_cancellation"] = df["invoice_no"].str.startswith("C")
    return df


# ─── Cleaning rules ─────────────────────────────────────────────────────────


def match_cancellations(purchases: pd.DataFrame, cancels: pd.DataFrame) -> tuple[list[int], list[int]]:
    """One-to-one match each cancellation to the most recent earlier purchase line
    with the same customer, product and quantity. Returns (purchase_rows, cancel_rows)
    as `source_row` ids. Guest lines are never matched (no reliable key)."""
    p = purchases[purchases["customer_id"].notna()]
    pools: dict[tuple, list[tuple]] = {}
    for row in p[["customer_id", "stock_code", "quantity", "invoice_ts", "source_row"]].itertuples(index=False):
        pools.setdefault((row.customer_id, row.stock_code, row.quantity), []).append((row.invoice_ts, row.source_row))
    for v in pools.values():
        v.sort()

    matched_p: list[int] = []
    matched_c: list[int] = []
    c = cancels[cancels["customer_id"].notna()].sort_values("invoice_ts")
    for row in c[["customer_id", "stock_code", "quantity", "invoice_ts", "source_row"]].itertuples(index=False):
        pool = pools.get((row.customer_id, row.stock_code, -row.quantity))
        if not pool:
            continue
        # latest purchase at or before the cancellation
        idx = None
        for i in range(len(pool) - 1, -1, -1):
            if pool[i][0] <= row.invoice_ts:
                idx = i
                break
        if idx is None:
            continue
        _, src = pool.pop(idx)
        matched_p.append(src)
        matched_c.append(row.source_row)
    return matched_p, matched_c


def clean(raw: pd.DataFrame) -> CleanResult:
    raw_rows = len(raw)
    df = standardize(raw)
    removed: dict[str, int] = {}
    examples: dict[str, list[dict]] = {}

    def drop(mask: pd.Series, rule: str) -> None:
        nonlocal df
        mask = mask.fillna(False).astype(bool)
        removed[rule] = removed.get(rule, 0) + int(mask.sum())
        if mask.any() and rule not in examples:
            ex = df.loc[mask, ["invoice_no", "stock_code", "description", "quantity", "unit_price"]].head(3)
            examples[rule] = [
                {k: (None if pd.isna(v) else (v.item() if hasattr(v, "item") else v)) for k, v in r.items()}
                for r in ex.to_dict("records")
            ]
        df = df.loc[~mask]

    # R1 exact duplicates (on the source columns, not our row id)
    src_cols = ["invoice_no", "stock_code", "quantity", "invoice_ts", "unit_price", "customer_id", "country"]
    drop(df.duplicated(subset=src_cols, keep="first"), "duplicate")
    # R2 non-merchandise codes
    drop(~df["stock_code"].str.match(MERCH_CODE), "non_merchandise")
    # R3 stock write-offs
    drop((df["quantity"] < 0) & ~df["is_cancellation"], "stock_adjustment")
    # R4 price
    drop(df["unit_price"] <= 0, "invalid_price")

    unknown = df[~df["invoice_no"].str.match(r"^C?\d{6}$")]
    if len(unknown):
        raise ValueError(f"unexpected invoice number formats: {unknown['invoice_no'].unique()[:5]}")

    # R5 exact reversals
    purchases = df[~df["is_cancellation"]]
    cancels = df[df["is_cancellation"]]
    mp, mc = match_cancellations(purchases, cancels)
    drop(df["source_row"].isin(mp), "cancelled_order")
    drop(df["source_row"].isin(mc), "cancelled_order_reversal")

    # R6 hard guard against implausible lines
    drop((df["quantity"].abs() >= MAX_QUANTITY) | (df["unit_price"] >= MAX_UNIT_PRICE), "implausible_line")

    # Flag (not drop) lines priced far above the product's median: on inspection
    # these are retail-priced sales to guest customers, i.e. a real second price tier.
    med = df[~df["is_cancellation"]].groupby("stock_code")["unit_price"].median()
    retail_flag = (df["unit_price"] / df["stock_code"].map(med)) > RETAIL_PRICE_RATIO
    flagged_retail = int(retail_flag.sum())
    flagged_retail_guest = float(df.loc[retail_flag, "customer_id"].isna().mean()) if flagged_retail else 0.0

    # Canonical description per product: the most frequent non-null text.
    canon = (
        df.dropna(subset=["description"])
        .groupby(["stock_code", "description"])
        .size()
        .reset_index(name="n")
        .sort_values(["stock_code", "n", "description"], ascending=[True, False, True])
        .drop_duplicates("stock_code")
        .set_index("stock_code")["description"]
    )
    df["description"] = df["stock_code"].map(canon).fillna("UNKNOWN PRODUCT")
    df["revenue"] = (df["quantity"].abs() * df["unit_price"]).round(2)
    df["quantity"] = df["quantity"].abs()

    sales = df[~df["is_cancellation"]].drop(columns="is_cancellation").reset_index(drop=True)
    returns = df[df["is_cancellation"]].drop(columns="is_cancellation").reset_index(drop=True)
    sales["line_no"] = sales.groupby("invoice_no").cumcount() + 1
    returns["line_no"] = returns.groupby("invoice_no").cumcount() + 1

    return CleanResult(
        sales=sales,
        returns=returns,
        removed={k: removed.get(k, 0) for k, _ in RULES},
        raw_rows=raw_rows,
        guest_rows=int(sales["customer_id"].isna().sum()),
        examples=examples,
        flagged_retail=flagged_retail,
        flagged_retail_guest_share=flagged_retail_guest,
    )


# ─── Dimensions ─────────────────────────────────────────────────────────────


def build_dim_date(start: str, end_inclusive: str) -> pd.DataFrame:
    d = pd.date_range(start, end_inclusive, freq="D")
    return pd.DataFrame(
        {
            "date_key": (d.year * 10000 + d.month * 100 + d.day).astype(np.int32),
            "date": d.date,
            "year": d.year.astype(np.int16),
            "quarter": d.quarter.astype(np.int8),
            "month": d.month.astype(np.int8),
            "month_start": d.to_period("M").to_timestamp().date,
            "month_label": d.strftime("%Y-%m"),
            "iso_week": d.isocalendar().week.to_numpy().astype(np.int8),
            "day_of_week": (d.dayofweek + 1).astype(np.int8),  # 1 = Monday
            "day_name": d.day_name(),
            "is_weekend": d.dayofweek >= 5,
        }
    )


def build_dims(res: CleanResult) -> dict[str, pd.DataFrame]:
    both = pd.concat([res.sales, res.returns], ignore_index=True)

    products = (
        both.groupby("stock_code", as_index=False)["description"].first().sort_values("stock_code").reset_index(drop=True)
    )
    products.insert(0, "product_key", np.arange(1, len(products) + 1, dtype=np.int32))
    products["category"] = products["description"].map(categorize)

    known = res.sales.dropna(subset=["customer_id"])
    first = known.groupby("customer_id")["invoice_ts"].min()
    # A customer's home country = the country of most of their purchase lines.
    country = (
        known.groupby(["customer_id", "country"]).size().reset_index(name="n")
        .sort_values(["customer_id", "n"], ascending=[True, False]).drop_duplicates("customer_id")
        .set_index("customer_id")["country"]
    )
    ids = sorted(set(both["customer_id"].dropna()))
    customers = pd.DataFrame({"customer_id": ids})
    customers.insert(0, "customer_key", np.arange(1, len(ids) + 1, dtype=np.int32))
    customers["country"] = customers["customer_id"].map(country)
    # Customers that only appear on returns get the return's country.
    ret_country = res.returns.dropna(subset=["customer_id"]).groupby("customer_id")["country"].first()
    customers["country"] = customers["country"].fillna(customers["customer_id"].map(ret_country))
    customers["first_order_date"] = customers["customer_id"].map(first).dt.date
    customers["cohort_month"] = customers["customer_id"].map(first).dt.to_period("M").dt.to_timestamp().dt.date
    customers["is_guest"] = False
    guest = pd.DataFrame(
        [{"customer_key": 0, "customer_id": "GUEST", "country": None, "first_order_date": None,
          "cohort_month": None, "is_guest": True}]
    )
    customers = pd.concat([guest, customers], ignore_index=True)
    customers["customer_key"] = customers["customer_key"].astype(np.int32)

    end = (pd.Timestamp(PERIOD_END_EXCLUSIVE) - pd.Timedelta(days=1)).strftime("%Y-%m-%d")
    dates = build_dim_date(PERIOD_START, pd.Timestamp(end).to_period("M").end_time.strftime("%Y-%m-%d"))
    return {"dim_product": products, "dim_customer": customers, "dim_date": dates}


def to_fact(lines: pd.DataFrame, dims: dict[str, pd.DataFrame]) -> pd.DataFrame:
    pkey = dims["dim_product"].set_index("stock_code")["product_key"]
    ckey = dims["dim_customer"].set_index("customer_id")["customer_key"]
    ts = lines["invoice_ts"]
    return pd.DataFrame(
        {
            "invoice_no": lines["invoice_no"].astype(str),
            "line_no": lines["line_no"].astype(np.int32),
            "date_key": (ts.dt.year * 10000 + ts.dt.month * 100 + ts.dt.day).astype(np.int32),
            "invoice_ts": ts,
            "customer_key": lines["customer_id"].map(ckey).fillna(0).astype(np.int32),
            "product_key": lines["stock_code"].map(pkey).astype(np.int32),
            "country": lines["country"].astype(str),
            "quantity": lines["quantity"].astype(np.int32),
            "unit_price": lines["unit_price"].astype(float),
            "revenue": lines["revenue"].astype(float),
            "source_row": lines["source_row"].astype(np.int64),
        }
    )


# ─── Load into DuckDB ───────────────────────────────────────────────────────


def write_warehouse(path: Path, res: CleanResult) -> duckdb.DuckDBPyConnection:
    dims = build_dims(res)
    fact_sales = to_fact(res.sales, dims)
    fact_returns = to_fact(res.returns, dims)

    if path.exists():
        path.unlink()
    con = duckdb.connect(str(path))
    con.execute((SQL_DIR / "schema.sql").read_text())
    for name, frame in {**dims, "fact_sales": fact_sales, "fact_returns": fact_returns}.items():
        con.register("_frame", frame)
        cols = ", ".join(frame.columns)
        # Declared PRIMARY KEY / FOREIGN KEY constraints are enforced on insert.
        con.execute(f"INSERT INTO {name} ({cols}) SELECT {cols} FROM _frame")
        con.unregister("_frame")
    return con


# ─── Data-quality checks ────────────────────────────────────────────────────


def run_quality_checks(con: duckdb.DuckDBPyConnection, res: CleanResult, report: QualityReport) -> None:
    q = lambda sql: con.execute(sql).fetchone()[0]  # noqa: E731

    report.check("Raw row count matches the published dataset", stage="extract", category="volume",
                 ok=res.raw_rows == EXPECTED_RAW_ROWS, observed=res.raw_rows,
                 expected=f"= {EXPECTED_RAW_ROWS:,}", severity="warn")

    kept = len(res.sales) + len(res.returns)
    report.check("Row reconciliation: raw = kept + removed by rule", stage="transform", category="volume",
                 ok=res.raw_rows == kept + sum(res.removed.values()),
                 observed=f"{kept:,} kept + {sum(res.removed.values()):,} removed",
                 expected=f"= {res.raw_rows:,}")

    report.check("No duplicate lines remain in fact_sales", stage="load", category="uniqueness",
                 ok=q("""SELECT count(*) FROM (SELECT invoice_no, customer_key, product_key, quantity,
                        unit_price, invoice_ts, count(*) c FROM fact_sales GROUP BY ALL HAVING c > 1)""") == 0,
                 observed=q("""SELECT count(*) FROM (SELECT invoice_no, customer_key, product_key, quantity,
                        unit_price, invoice_ts, count(*) c FROM fact_sales GROUP BY ALL HAVING c > 1)"""),
                 expected="0 duplicate groups")

    for table in ("fact_sales", "fact_returns"):
        nulls = q(f"""SELECT count(*) FROM {table} WHERE invoice_no IS NULL OR date_key IS NULL
                     OR product_key IS NULL OR customer_key IS NULL OR quantity IS NULL
                     OR unit_price IS NULL OR revenue IS NULL""")
        report.check(f"{table}: no nulls in key and measure columns", stage="load", category="completeness",
                     ok=nulls == 0, observed=nulls, expected="0 rows")

    guest_share = q("SELECT coalesce(sum(revenue) FILTER (WHERE customer_key = 0), 0) / sum(revenue) FROM fact_sales")
    report.check("Guest (missing CustomerID) revenue share", stage="load", category="completeness",
                 ok=guest_share < 0.20, observed=float(guest_share), expected="< 20% of revenue",
                 detail="Guest lines are kept for revenue KPIs but excluded from customer analytics.",
                 severity="warn")

    for table in ("fact_sales", "fact_returns"):
        for dim, key in (("dim_product", "product_key"), ("dim_customer", "customer_key"), ("dim_date", "date_key")):
            orphans = q(f"SELECT count(*) FROM {table} f ANTI JOIN {dim} d USING ({key})")
            report.check(f"Referential integrity {table}.{key} -> {dim}", stage="load", category="integrity",
                         ok=orphans == 0, observed=orphans, expected="0 orphan rows")

    for dim, key in (("dim_product", "product_key"), ("dim_customer", "customer_key"), ("dim_date", "date_key")):
        dupes = q(f"SELECT count(*) - count(DISTINCT {key}) FROM {dim}")
        report.check(f"{dim}.{key} is unique", stage="load", category="uniqueness",
                     ok=dupes == 0, observed=dupes, expected="0 duplicates")

    bad_qty = q("SELECT count(*) FROM fact_sales WHERE quantity <= 0")
    report.check("fact_sales.quantity > 0", stage="load", category="validity",
                 ok=bad_qty == 0, observed=bad_qty, expected="0 violations")
    bad_price = q("SELECT count(*) FROM fact_sales WHERE unit_price <= 0")
    report.check("fact_sales.unit_price > 0", stage="load", category="validity",
                 ok=bad_price == 0, observed=bad_price, expected="0 violations")
    out_of_range = q(f"""SELECT count(*) FROM fact_sales WHERE invoice_ts < TIMESTAMP '{PERIOD_START}'
                         OR invoice_ts >= TIMESTAMP '{PERIOD_END_EXCLUSIVE}'""")
    report.check("Invoice timestamps inside the extract window", stage="load", category="validity",
                 ok=out_of_range == 0, observed=out_of_range,
                 expected=f"all in [{PERIOD_START}, {PERIOD_END_EXCLUSIVE})")
    max_line = q("SELECT max(revenue) FROM fact_sales")
    report.check("Largest single line after outlier rules", stage="load", category="validity",
                 ok=max_line < 50_000, observed=float(max_line), expected="< £50,000",
                 detail="Guards against keying errors such as the 80,995-unit line in the raw data.")

    rev_db = q("SELECT round(sum(revenue), 2) FROM fact_sales")
    rev_pd = round(float(res.sales["revenue"].sum()), 2)
    report.check("Revenue reconciles between pandas and the warehouse", stage="load", category="reconciliation",
                 ok=abs(rev_db - rev_pd) < 0.01, observed=f"£{rev_db:,.2f}", expected=f"£{rev_pd:,.2f}")

    gaps = q("""WITH m AS (SELECT DISTINCT d.month_start FROM fact_sales f JOIN dim_date d USING (date_key))
                SELECT count(*) FROM (SELECT DISTINCT month_start FROM dim_date
                WHERE date <= (SELECT max(invoice_ts)::DATE FROM fact_sales)) a ANTI JOIN m USING (month_start)""")
    report.check("Every calendar month has sales", stage="load", category="completeness",
                 ok=gaps == 0, observed=gaps, expected="0 empty months")

    other_share = q(f"""SELECT coalesce(sum(f.revenue) FILTER (WHERE p.category = '{OTHER}'), 0) / sum(f.revenue)
                        FROM fact_sales f JOIN dim_product p USING (product_key)""")
    report.check("Category rules cover the catalogue", stage="transform", category="coverage",
                 ok=other_share < 0.25, observed=float(other_share),
                 expected="'Other' < 25% of revenue", severity="warn")

    unknown_desc = q("SELECT count(*) FROM dim_product WHERE description = 'UNKNOWN PRODUCT'")
    report.check("Products without any description", stage="transform", category="completeness",
                 ok=unknown_desc == 0, observed=unknown_desc, expected="0 products", severity="warn")

    report.check("High-price lines (> 8x product median) investigated", stage="transform", category="validity",
                 ok=res.flagged_retail_guest_share > 0.9, observed=f"{res.flagged_retail:,} lines, "
                 f"{res.flagged_retail_guest_share:.0%} guest", expected="> 90% guest (retail price tier)",
                 detail="Retained: they are retail-priced sales to non-account customers, not keying errors.",
                 severity="warn")

    ret_ratio = q("SELECT (SELECT sum(revenue) FROM fact_returns) / (SELECT sum(revenue) FROM fact_sales)")
    report.check("Returns value as share of sales", stage="load", category="validity",
                 ok=0 < ret_ratio < 0.10, observed=float(ret_ratio), expected="between 0% and 10%",
                 severity="warn")
