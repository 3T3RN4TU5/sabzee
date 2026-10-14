import duckdb
import pandas as pd
import pytest

import etl
from categories import OTHER, categorize
from config import SQL_DIR
from quality import DataQualityError, QualityReport


def test_every_removed_row_is_attributed_to_one_rule(toy_raw):
    res = etl.clean(toy_raw)
    kept = len(res.sales) + len(res.returns)
    assert res.raw_rows == len(toy_raw)
    assert kept + sum(res.removed.values()) == res.raw_rows
    assert res.removed["duplicate"] == 1
    assert res.removed["non_merchandise"] == 1
    assert res.removed["stock_adjustment"] == 1
    assert res.removed["invalid_price"] == 1
    assert res.removed["cancelled_order"] == 1
    assert res.removed["cancelled_order_reversal"] == 1


def test_exactly_reversed_order_is_dropped_but_partial_return_is_kept(toy_raw):
    res = etl.clean(toy_raw)
    assert res.sales["quantity"].max() < 1000, "the 80,995-unit keying error must be removed"
    assert len(res.returns) == 1
    ret = res.returns.iloc[0]
    assert ret["invoice_no"] == "C536600" and ret["quantity"] == 2
    assert ret["revenue"] == pytest.approx(21.90)


def test_guest_lines_are_kept_and_descriptions_canonicalised(toy_raw):
    res = etl.clean(toy_raw)
    assert res.guest_rows == 1
    assert set(res.sales.loc[res.sales["stock_code"] == "22086", "description"]) == {"PAPER CHAIN KIT 50'S CHRISTMAS"}


def test_types_are_coerced(toy_raw):
    std = etl.standardize(toy_raw)
    assert str(std["quantity"].dtype) == "int64"
    assert str(std["unit_price"].dtype) == "float64"
    assert pd.api.types.is_datetime64_any_dtype(std["invoice_ts"])
    assert std["is_cancellation"].sum() == 2


def test_unparseable_values_raise(toy_raw):
    bad = toy_raw.copy()
    bad.loc[0, "Quantity"] = "six"
    with pytest.raises(ValueError):
        etl.standardize(bad)


def test_match_cancellations_is_one_to_one_and_backward_only():
    ts = pd.to_datetime
    purchases = pd.DataFrame({
        "customer_id": ["1", "1", "1"], "stock_code": ["A", "A", "A"], "quantity": [5, 5, 5],
        "invoice_ts": [ts("2011-01-01"), ts("2011-01-02"), ts("2011-03-01")], "source_row": [10, 11, 12],
    })
    cancels = pd.DataFrame({
        "customer_id": ["1", "1", "1"], "stock_code": ["A", "A", "A"], "quantity": [-5, -5, -5],
        "invoice_ts": [ts("2011-01-03"), ts("2011-01-04"), ts("2011-01-05")], "source_row": [20, 21, 22],
    })
    mp, mc = etl.match_cancellations(purchases, cancels)
    assert sorted(mp) == [10, 11], "the March purchase happens after every cancellation"
    assert mc == [20, 21], "the third cancellation has no remaining earlier purchase"


def test_warehouse_and_quality_checks(toy_raw, tmp_path):
    res = etl.clean(toy_raw)
    con = etl.write_warehouse(tmp_path / "wh.duckdb", res)
    report = QualityReport()
    etl.run_quality_checks(con, res, report)
    failures = [c.name for c in report.failures]
    # The toy extract has gaps between months by construction; everything else must pass.
    assert set(failures) <= {"Every calendar month has sales"}
    assert con.execute("SELECT count(*) FROM fact_sales").fetchone()[0] == len(res.sales)
    assert con.execute("SELECT count(*) FROM dim_customer WHERE customer_key = 0").fetchone()[0] == 1


def test_foreign_keys_are_enforced(toy_raw, tmp_path):
    con = etl.write_warehouse(tmp_path / "wh.duckdb", etl.clean(toy_raw))
    with pytest.raises(duckdb.ConstraintException):
        con.execute("""INSERT INTO fact_sales VALUES ('999999', 1, 20110101, TIMESTAMP '2011-01-01', 0,
                       987654, 'United Kingdom', 1, 1.0, 1.0, 0)""")


def test_quality_report_fails_loudly():
    r = QualityReport()
    r.check("ok", stage="t", category="c", ok=True, observed=0, expected="0")
    r.check("soft", stage="t", category="c", ok=False, observed=1, expected="0", severity="warn")
    r.raise_on_failure()  # warnings never block
    r.check("hard", stage="t", category="c", ok=False, observed=1, expected="0")
    with pytest.raises(DataQualityError, match="hard"):
        r.raise_on_failure()
    assert r.summary() == {"pass": 1, "warn": 1, "fail": 1}


def _toy_con(toy_raw, tmp_path):
    return etl.write_warehouse(tmp_path / "wh.duckdb", etl.clean(toy_raw))


def test_basket_lift_matches_hand_calculation(toy_raw, tmp_path):
    con = _toy_con(toy_raw, tmp_path)
    df = con.execute((SQL_DIR / "basket_pairs.sql").read_text()).df()
    pair = df[(df["product_a"].str.contains("LANTERN") | df["product_b"].str.contains("LANTERN"))
              & (df["product_a"].str.contains("HEART") | df["product_b"].str.contains("HEART"))].iloc[0]
    # 6 baskets; heart in 3, lantern in 2, both in 2 -> lift = (2/6) / ((3/6)(2/6)) = 2
    n = con.execute("SELECT count(DISTINCT invoice_no) FROM fact_sales").fetchone()[0]
    assert n == 6
    assert pair["baskets_together"] == 2
    assert pair["lift"] == pytest.approx(2.0, abs=0.01)


def test_abc_classes_from_sql(toy_raw, tmp_path):
    con = _toy_con(toy_raw, tmp_path)
    df = con.execute((SQL_DIR / "product_pareto.sql").read_text()).df()
    assert df["cum_revenue_share"].is_monotonic_increasing
    assert df["cum_revenue_share"].iloc[-1] == pytest.approx(1.0)
    assert df.iloc[0]["abc_class"] == "A"
    assert set(df["abc_class"]) <= {"A", "B", "C"}


def test_cohort_retention_and_rfm(toy_raw, tmp_path):
    con = _toy_con(toy_raw, tmp_path)
    coh = con.execute((SQL_DIR / "cohort_retention.sql").read_text()).df()
    assert (coh.loc[coh["months_since"] == 0, "retention"] == 1).all()
    dec = coh[coh["cohort"] == "2010-12"].set_index("months_since")
    assert dec.loc[1, "retention"] == pytest.approx(1.0)  # customer 100 came back in January
    rfm = con.execute((SQL_DIR / "rfm.sql").read_text()).df()
    assert len(rfm) == 3  # guests are excluded
    assert rfm["r_score"].between(1, 5).all()
    assert rfm.set_index("customer_id").loc["100", "frequency"] == 2


def test_monthly_revenue_window_functions(toy_raw, tmp_path):
    con = _toy_con(toy_raw, tmp_path)
    m = con.execute((SQL_DIR / "monthly_revenue.sql").read_text()).df()
    assert m["revenue_running_total"].iloc[-1] == pytest.approx(m["revenue"].sum(), abs=0.02)
    second = m.iloc[1]
    assert second["mom_growth"] == pytest.approx(second["revenue"] / m.iloc[0]["revenue"] - 1, abs=1e-3)


@pytest.mark.parametrize(
    ("desc", "expected"),
    [
        ("WHITE HANGING HEART T-LIGHT HOLDER", "Candles & Lighting"),
        ("PAPER CHAIN KIT 50'S CHRISTMAS", "Seasonal & Christmas"),
        ("JUMBO BAG RED RETROSPOT", "Bags & Storage"),
        ("REGENCY CAKESTAND 3 TIER", "Kitchen & Dining"),
        ("SPACEBOY LUNCH BOX", "Kitchen & Dining"),
        ("ASSORTED COLOUR BIRD ORNAMENT", "Garden & Outdoor"),
        ("HEART OF WICKER SMALL", "Home Décor"),
        ("SOMETHING ENTIRELY NEW", OTHER),
        (None, OTHER),
    ],
)
def test_categorize(desc, expected):
    assert categorize(desc) == expected
