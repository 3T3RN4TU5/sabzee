"""End-to-end pipeline: fetch -> ETL + quality gates -> SQL marts -> models -> JSON.

Usage:  python analysis/run_pipeline.py

Writes compact aggregates to public/data/*.json, which the dashboard reads at
runtime. The JSON is committed, so the site builds without Python.
"""

from __future__ import annotations

import json
import math
import subprocess
import sys
import time
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd

import generate_experiment as gx
import models
from config import EXPERIMENT_CSV, OUTPUT_DIR, RAW_CSV, SQL_DIR, WAREHOUSE
from etl import RULES, clean, load_raw, run_quality_checks, standardize, write_warehouse
from quality import QualityReport


def log(msg: str) -> None:
    print(f"[pipeline {time.strftime('%H:%M:%S')}] {msg}", flush=True)


def sql(con, name: str) -> pd.DataFrame:
    return con.execute((SQL_DIR / f"{name}.sql").read_text()).df()


def _clean_json(obj):
    """Make numpy/pandas values JSON-safe and round floats to keep files small."""
    if isinstance(obj, dict):
        return {str(k): _clean_json(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_clean_json(v) for v in obj]
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, (np.floating, float)):
        f = float(obj)
        if math.isnan(f) or math.isinf(f):
            return None
        return round(f, 6) if abs(f) < 1 else round(f, 2)
    if isinstance(obj, (np.bool_,)):
        return bool(obj)
    if isinstance(obj, (pd.Timestamp, date)):
        return obj.strftime("%Y-%m-%d")
    if obj is pd.NA or obj is pd.NaT:
        return None
    return obj


def records(df: pd.DataFrame) -> list[dict]:
    return df.to_dict("records")


def write(name: str, payload) -> int:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUTPUT_DIR / f"{name}.json"
    text = json.dumps(_clean_json(payload), separators=(",", ":"), ensure_ascii=False)
    path.write_text(text, encoding="utf-8")
    return len(text.encode())


def main() -> int:
    t0 = time.time()
    if not RAW_CSV.exists():
        log("raw data missing, fetching …")
        if subprocess.call([sys.executable, str(Path(__file__).with_name("fetch_data.py"))]) != 0:
            return 1

    # ── Extract / transform ────────────────────────────────────────────────
    log("loading raw CSV")
    raw = load_raw(RAW_CSV)
    std = standardize(raw)
    profile = {
        "rows": int(len(std)),
        "columns": [
            {"column": c, "null_rate": float(std[c].isna().mean()), "distinct": int(std[c].nunique(dropna=True))}
            for c in ["invoice_no", "stock_code", "description", "quantity", "invoice_ts", "unit_price", "customer_id", "country"]
        ],
        "negative_quantity_rows": int((std["quantity"] < 0).sum()),
        "non_positive_price_rows": int((std["unit_price"] <= 0).sum()),
        "cancellation_rows": int(std["is_cancellation"].sum()),
        "max_quantity": int(std["quantity"].max()),
        "min_quantity": int(std["quantity"].min()),
    }
    log("cleaning")
    res = clean(raw)
    log(f"loading warehouse {WAREHOUSE.name}")
    con = write_warehouse(WAREHOUSE, res)

    report = QualityReport()
    run_quality_checks(con, res, report)

    # ── SQL marts ──────────────────────────────────────────────────────────
    log("running SQL marts")
    monthly = sql(con, "monthly_revenue")
    lfl = sql(con, "yoy_like_for_like").iloc[0]
    cube = sql(con, "kpi_cube")
    returns_cube = sql(con, "returns_cube")
    cohorts = sql(con, "cohort_retention")
    rfm = sql(con, "rfm")
    pareto = sql(con, "product_pareto")
    basket = sql(con, "basket_pairs")
    repeat = sql(con, "repeat_purchase").iloc[0]
    repeat_cohort = sql(con, "repeat_by_cohort")
    countries = sql(con, "country_summary")
    weekday_hour = sql(con, "weekday_hour")
    daily = sql(con, "daily_revenue")
    tx = sql(con, "customer_transactions")
    categories = sql(con, "category_summary")

    all_rows = cube[(cube["country"] == "__all__") & (cube["category"] == "__all__")].set_index("month")["revenue"]
    diff = (all_rows - monthly.set_index("month_label")["revenue"]).abs().max()
    report.check("Dashboard cube reconciles to monthly revenue mart", stage="publish", category="reconciliation",
                 ok=bool(diff < 0.05), observed=f"£{diff:,.2f}", expected="max monthly difference < £0.05")
    cat_sum = cube[(cube["country"] == "__all__") & (cube["category"] != "__all__")].groupby("month")["revenue"].sum()
    diff2 = (cat_sum - all_rows).abs().max()
    report.check("Category slices sum to the monthly total", stage="publish", category="reconciliation",
                 ok=bool(diff2 < 0.5), observed=f"£{diff2:,.2f}", expected="max difference < £0.50")
    cohort_total = int(cohorts[cohorts["months_since"] == 0]["cohort_size"].sum())
    report.check("Cohort sizes sum to identified customers", stage="publish", category="reconciliation",
                 ok=cohort_total == len(rfm), observed=cohort_total, expected=f"= {len(rfm):,}")

    # ── Models ─────────────────────────────────────────────────────────────
    log("k-means segmentation")
    seg_out, seg_map = models.segment_customers(rfm)
    log("forecasting")
    fc = models.forecast_revenue(daily)
    log("CLV (MBG/NBD + Gamma-Gamma)")
    clv = models.customer_lifetime_value(tx, seg_map)
    id_map = rfm.set_index("customer_key")["customer_id"]
    for r in clv["top_customers"]:
        r["customer_id"] = id_map.get(r.pop("customer_key"), "?")
    report.check("MBG/NBD holdout: predicted vs actual repeat transactions", stage="model", category="validation",
                 ok=abs(clv["validation_error"]) < 0.20, observed=f"{clv['validation_error']:+.1%}",
                 expected="within ±20%", severity="warn")
    hw = next(m for m in fc["models"] if m["key"] == "hw")
    naive = next(m for m in fc["models"] if m["key"] == "naive")
    report.check("Forecast beats the seasonal-naive baseline (weekly MAPE)", stage="model", category="validation",
                 ok=hw["mape_weekly"] < naive["mape_weekly"], observed=f"{hw['mape_weekly']:.1%}",
                 expected=f"< {naive['mape_weekly']:.1%} (seasonal naive)", severity="warn")

    log("simulating + analysing A/B test")
    order_values = (
        con.execute("SELECT sum(revenue) v FROM fact_sales WHERE customer_key <> 0 GROUP BY invoice_no ORDER BY invoice_no").df()["v"].to_numpy()
    )
    visitors = gx.simulate(order_values)
    visitors.to_csv(EXPERIMENT_CSV, index=False)
    ab = models.analyze_experiment(visitors, gx.PRE_REG)
    report.check("A/B test sample-ratio mismatch (chi-square)", stage="model", category="validation",
                 ok=ab["srm"]["passed"], observed=f"p = {ab['srm']['p_value']:.3f}", expected="p ≥ 0.001")

    # ── Export ─────────────────────────────────────────────────────────────
    log("writing JSON")
    sizes: dict[str, int] = {}

    months = sorted(cube["month"].unique())
    country_order = ["__all__"] + countries["country"].tolist()
    category_order = ["__all__"] + categories["category"].tolist()
    ci = {c: i for i, c in enumerate(country_order)}
    ki = {c: i for i, c in enumerate(category_order)}
    mi = {m: i for i, m in enumerate(months)}
    ret = returns_cube.set_index(["month", "country", "category"])["returns_value"]
    rows = []
    for r in cube.itertuples(index=False):
        rows.append([
            mi[r.month], ci[r.country], ki[r.category], round(float(r.revenue), 2), int(r.units), int(r.orders),
            int(r.customers), round(float(ret.get((r.month, r.country, r.category), 0.0)), 2),
        ])
    sizes["cube"] = write("cube", {
        "months": months,
        "countries": ["All countries"] + country_order[1:],
        "categories": ["All categories"] + category_order[1:],
        "fields": ["month", "country", "category", "revenue", "units", "orders", "customers", "returns"],
        "rows": rows,
    })

    sizes["monthly"] = write("monthly", {
        "months": records(monthly.drop(columns=["month_start"])),
        "like_for_like": {k: (v.strftime("%Y-%m-%d") if hasattr(v, "strftime") else v) for k, v in lfl.items()},
        "countries": records(countries),
        "categories": records(categories),
        "weekday_hour": records(weekday_hour),
    })
    sizes["forecast"] = write("forecast", fc)

    cohort_matrix = [
        {"cohort": c, "size": int(g["cohort_size"].iloc[0]),
         "retention": [round(float(x), 4) for x in g.sort_values("months_since")["retention"]]}
        for c, g in cohorts.groupby("cohort")
    ]
    m1 = cohorts[cohorts["months_since"] == 1]
    sizes["customers"] = write("customers", {
        "cohorts": cohort_matrix,
        "avg_month1_retention_excl_first": float(m1[m1["cohort"] != cohorts["cohort"].min()]["retention"].mean()),
        "repeat": {k: (float(v) if isinstance(v, (float, np.floating)) else int(v)) for k, v in repeat.items()},
        "repeat_by_cohort": records(repeat_cohort),
        "segmentation": seg_out,
    })
    sizes["clv"] = write("clv", clv)

    # Pareto curve: keep ~250 points, enough for a smooth curve
    step = max(1, len(pareto) // 250)
    curve = pareto.iloc[::step][["cum_product_share", "cum_revenue_share"]]
    curve = pd.concat([pd.DataFrame([{"cum_product_share": 0.0, "cum_revenue_share": 0.0}]), curve,
                       pareto.tail(1)[["cum_product_share", "cum_revenue_share"]]])
    abc = (
        pareto.groupby("abc_class")
        .agg(products=("stock_code", "size"), revenue=("revenue", "sum"), units=("units", "sum"))
        .reset_index()
    )
    abc["product_share"] = abc["products"] / abc["products"].sum()
    abc["revenue_share"] = abc["revenue"] / abc["revenue"].sum()
    top_share = {p: float(pareto[pareto["cum_product_share"] <= p]["revenue"].sum() / pareto["revenue"].sum())
                 for p in (0.01, 0.05, 0.10, 0.20)}
    cat_abc = (
        pareto.pivot_table(index="category", columns="abc_class", values="stock_code", aggfunc="count", fill_value=0)
        .reset_index().to_dict("records")
    )
    basket_out = basket.copy()
    basket_out["cross_category"] = basket_out["category_a"] != basket_out["category_b"]
    sizes["products"] = write("products", {
        "n_products": int(len(pareto)),
        "pareto_curve": records(curve.round(5)),
        "top_share": top_share,
        "abc": records(abc),
        "category_abc": cat_abc,
        "top_products": records(pareto.head(60).drop(columns=["product_key"])),
        "basket": {
            "n_pairs": int(len(basket)),
            "min_support": 0.01,
            "n_baskets": int(con.execute("SELECT count(DISTINCT invoice_no) FROM fact_sales").fetchone()[0]),
            "pairs": records(pd.concat([basket_out.head(120),
                                        basket_out[basket_out["cross_category"]].head(60)]).drop_duplicates(
                subset=["product_a", "product_b"])),
        },
    })
    sizes["experiment"] = write("experiment", ab)

    report.raise_on_failure()  # fail loudly *before* publishing quality.json / meta.json
    table_counts = {t: int(con.execute(f"SELECT count(*) FROM {t}").fetchone()[0])
                    for t in ("fact_sales", "fact_returns", "dim_customer", "dim_product", "dim_date")}
    sizes["quality"] = write("quality", {
        "summary": report.summary(),
        "checks": report.to_dict(),
        "profile": profile,
        "ledger": [{"rule": k, "description": d, "rows": res.removed[k], "examples": res.examples.get(k, [])}
                   for k, d in RULES],
        "kept": {"sales_lines": len(res.sales), "return_lines": len(res.returns), "guest_lines": res.guest_rows},
        "tables": table_counts,
    })

    total_rev = float(monthly["revenue"].sum())
    sizes["meta"] = write("meta", {
        "title": "Retail Sales Analytics",
        "dataset": "UCI Online Retail (Chen, Sain & Guo, 2012), CC BY 4.0",
        "dataset_url": "https://archive.ics.uci.edu/dataset/352/online+retail",
        "period_start": str(daily["date"].min())[:10],
        "period_end": str(daily["date"].max())[:10],
        "generated": date.today().isoformat(),
        "raw_rows": res.raw_rows,
        "clean_lines": len(res.sales),
        "revenue": total_rev,
        "orders": int(monthly["orders"].sum()),
        "customers": int(len(rfm)),
        "products": int(len(pareto)),
        "countries": int(len(countries)),
        "quality": report.summary(),
        "experiment_simulated": True,
    })
    con.close()
    total = sum(sizes.values())
    log("wrote " + ", ".join(f"{k}.json {v / 1024:.0f} KB" for k, v in sizes.items()) + f" (total {total / 1024:.0f} KB)")
    log(f"quality: {report.summary()}  |  done in {time.time() - t0:.1f}s")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
