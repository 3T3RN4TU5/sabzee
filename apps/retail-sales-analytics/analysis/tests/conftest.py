import sys
from pathlib import Path

import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


def _row(inv, code, desc, qty, ts, price, cust, country="United Kingdom"):
    return {"InvoiceNo": inv, "StockCode": code, "Description": desc, "Quantity": str(qty),
            "InvoiceDate": ts, "UnitPrice": str(price), "CustomerID": cust, "Country": country}


@pytest.fixture
def toy_raw() -> pd.DataFrame:
    """A small raw extract that exercises every cleaning rule."""
    rows = [
        # customer 100: two orders, first one contains a pair bought together
        _row("536365", "85123A", "WHITE HANGING HEART T-LIGHT HOLDER", 6, "12/1/2010 8:26", 2.55, "100"),
        _row("536365", "71053", "WHITE METAL LANTERN", 6, "12/1/2010 8:26", 3.39, "100"),
        _row("536365", "71053", "WHITE METAL LANTERN", 6, "12/1/2010 8:26", 3.39, "100"),       # R1 duplicate
        _row("536365", "POST", "POSTAGE", 1, "12/1/2010 8:26", 18.0, "100"),                     # R2 non-merch
        _row("536400", "85123A", "WHITE HANGING HEART T-LIGHT HOLDER", 12, "1/5/2011 10:00", 2.55, "100"),
        _row("536400", "71053", "WHITE METAL LANTERN", 2, "1/5/2011 10:00", 3.39, "100"),
        # customer 200: an order that is fully cancelled (R5) + a partial return
        _row("536500", "22423", "REGENCY CAKESTAND 3 TIER", 80995, "1/10/2011 9:00", 2.08, "200"),
        _row("C536501", "22423", "REGENCY CAKESTAND 3 TIER", -80995, "1/10/2011 9:05", 2.08, "200"),
        _row("536502", "22423", "REGENCY CAKESTAND 3 TIER", 10, "2/1/2011 9:00", 10.95, "200"),
        _row("536502", "85123A", "WHITE HANGING HEART T-LIGHT HOLDER", 4, "2/1/2011 9:00", 2.95, "200"),
        _row("C536600", "22423", "REGENCY CAKESTAND 3 TIER", -2, "2/15/2011 9:00", 10.95, "200"),  # partial return
        # warehouse write-off (R3) and a zero-price line (R4)
        _row("536700", "21777", None, -50, "3/1/2011 9:00", 0.0, None),
        _row("536701", "22086", "PAPER CHAIN KIT 50'S CHRISTMAS", 1, "3/1/2011 9:00", 0.0, "300"),
        # guest purchase (kept, customer_key 0), description variant canonicalised
        _row("536800", "22086", "PAPER CHAIN KIT 50'S CHRISTMAS", 3, "3/2/2011 11:00", 2.95, None, "France"),
        _row("536801", "22086", "PAPER CHAIN KIT 50S XMAS", 2, "3/3/2011 11:00", 2.95, "300", "France"),
        _row("536802", "22086", "PAPER CHAIN KIT 50'S CHRISTMAS", 2, "4/3/2011 11:00", 2.95, "300", "France"),
    ]
    return pd.DataFrame(rows)
