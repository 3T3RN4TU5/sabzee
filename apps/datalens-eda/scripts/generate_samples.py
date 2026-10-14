"""Generate the bundled sample datasets in public/samples/.

Synthetic, deterministic (seeded) data that looks like real-world sources and
deliberately contains things the profiler should find: nulls, outliers,
skewed distributions, a constant column, an ID column, a mixed-type column and
a handful of exact duplicate rows.

    pip install duckdb pandas
    python scripts/generate_samples.py
"""

from __future__ import annotations

import math
import random
from datetime import date, datetime, timedelta
from pathlib import Path

import duckdb
import pandas as pd

OUT = Path(__file__).resolve().parent.parent / "public" / "samples"
OUT.mkdir(parents=True, exist_ok=True)


# ─── NYC-taxi-like trips (Parquet) ────────────────────────────────────────────
def taxi_trips(n: int = 60_000) -> pd.DataFrame:
    rng = random.Random(42)
    boroughs = {
        "Manhattan": 0.62,
        "Brooklyn": 0.14,
        "Queens": 0.15,
        "Bronx": 0.05,
        "Staten Island": 0.01,
        "EWR": 0.03,
    }
    zones = list(boroughs)
    weights = list(boroughs.values())
    vendors = ["CMT", "VTS"]
    payment = ["Credit card", "Cash", "No charge", "Dispute"]
    pay_w = [0.74, 0.23, 0.02, 0.01]
    start = datetime(2024, 1, 1)
    rows = []
    for i in range(n):
        # Busier during commute hours and weekend nights.
        day = rng.randrange(0, 91)
        hour = int(rng.choices(range(24), weights=[3, 2, 1, 1, 1, 2, 4, 7, 9, 8, 7, 7, 8, 8, 8, 9, 10, 11, 11, 10, 9, 8, 6, 4])[0])
        pickup = start + timedelta(days=day, hours=hour, minutes=rng.randrange(60), seconds=rng.randrange(60))
        pu = rng.choices(zones, weights)[0]
        do = pu if rng.random() < 0.7 else rng.choices(zones, weights)[0]
        dist = rng.lognormvariate(0.6, 0.75)
        if pu == "EWR" or do == "EWR":
            dist += 14
        if rng.random() < 0.002:
            dist = rng.uniform(80, 400)  # GPS glitches → outliers
        speed = max(4.0, rng.gauss(11, 3.5))
        minutes = max(1.0, dist / speed * 60 + rng.gauss(2, 1))
        fare = round(3.0 + dist * 2.5 + minutes * 0.5, 2)
        pay = rng.choices(payment, pay_w)[0]
        tip = round(fare * max(0, rng.gauss(0.18, 0.06)), 2) if pay == "Credit card" else 0.0
        passengers = rng.choices([1, 2, 3, 4, 5, 6], [70, 15, 5, 3, 4, 3])[0]
        if rng.random() < 0.03:
            passengers = None  # missing from some meters
        rating = rng.choices([1, 2, 3, 4, 5], [2, 3, 10, 35, 50])[0] if rng.random() < 0.4 else None
        rows.append(
            {
                "trip_id": 1_000_000 + i,
                "vendor": rng.choice(vendors),
                "pickup_at": pickup,
                "dropoff_at": pickup + timedelta(minutes=minutes),
                "pickup_borough": pu,
                "dropoff_borough": do,
                "passenger_count": passengers,
                "trip_miles": round(dist, 2),
                "duration_min": round(minutes, 1),
                "payment_type": pay,
                "fare_usd": fare,
                "tip_usd": tip,
                "total_usd": round(fare + tip + 3.25, 2),
                "driver_rating": rating,
            }
        )
    df = pd.DataFrame(rows)
    df["passenger_count"] = df["passenger_count"].astype("Int8")
    df["driver_rating"] = df["driver_rating"].astype("Int8")
    return df


# ─── E-commerce orders (CSV) ──────────────────────────────────────────────────
def ecommerce_orders(n: int = 15_000) -> pd.DataFrame:
    rng = random.Random(7)
    catalog = {
        "Electronics": [("Wireless Earbuds", 59), ("Smartwatch", 199), ("4K Monitor", 329), ("USB-C Hub", 39)],
        "Home": [("Air Fryer", 89), ("Desk Lamp", 29), ("Coffee Grinder", 49), ("Throw Blanket", 35)],
        "Fashion": [("Running Shoes", 120), ("Denim Jacket", 85), ("Sunglasses", 45), ("Backpack", 70)],
        "Beauty": [("Face Serum", 32), ("Hair Dryer", 75), ("Perfume", 95)],
        "Books": [("SQL for Analysts", 42), ("Statistics Primer", 38), ("Data Viz Handbook", 47)],
    }
    countries = ["India", "United States", "United Kingdom", "Germany", "Canada", "Australia", "Singapore"]
    country_w = [30, 28, 12, 9, 8, 7, 6]
    channels = ["Organic", "Paid Search", "Social", "Email", "Referral"]
    statuses = ["delivered", "delivered", "delivered", "delivered", "shipped", "returned", "cancelled"]
    start = date(2023, 1, 1)
    rows = []
    for i in range(n):
        cat = rng.choices(list(catalog), [30, 25, 22, 13, 10])[0]
        product, price = rng.choice(catalog[cat])
        qty = rng.choices([1, 2, 3, 4, 5, 10], [60, 22, 9, 5, 3, 1])[0]
        disc = rng.choice([0, 0, 0, 0.05, 0.1, 0.15, 0.2])
        offset = rng.gauss(400, 200)
        while not 0 <= offset < 730:  # resample instead of clamping, so no spike at the edges
            offset = rng.gauss(400, 200)
        d = start + timedelta(days=int(offset))
        unit = round(price * rng.uniform(0.95, 1.05), 2)
        rating = rng.choices(["1", "2", "3", "4", "5", "", "N/A"], [3, 4, 10, 30, 38, 12, 3])[0]
        rows.append(
            {
                "order_id": f"ORD-{100000 + i}",
                "order_date": d.isoformat(),
                "customer_id": f"C{rng.randrange(1, 4200):05d}",
                "country": rng.choices(countries, country_w)[0],
                "channel": rng.choice(channels),
                "category": cat,
                "product": product,
                "quantity": qty,
                "unit_price": unit,
                "discount": disc,
                "revenue": round(qty * unit * (1 - disc), 2),
                "status": rng.choice(statuses),
                "rating": rating,  # mixed: numbers, blanks and "N/A"
                "currency": "USD",  # constant column
            }
        )
    # A few exact duplicate rows, like a double-fired ingestion job.
    for j in range(25):
        rows.append(dict(rows[rng.randrange(len(rows))]))
    rng.shuffle(rows)
    return pd.DataFrame(rows)


# ─── Daily product metrics (JSON) ─────────────────────────────────────────────
def daily_metrics() -> list[dict]:
    rng = random.Random(2024)
    regions = {"APAC": 1.2, "EMEA": 1.0, "Americas": 1.5}
    out = []
    start = date(2023, 1, 1)
    for region, scale in regions.items():
        for k in range(730):
            d = start + timedelta(days=k)
            trend = 1 + k / 730 * 0.8
            weekly = 0.82 if d.weekday() >= 5 else 1.0
            yearly = 1 + 0.15 * math.sin(2 * math.pi * (k - 60) / 365)
            sessions = int(4000 * scale * trend * weekly * yearly * rng.uniform(0.9, 1.1))
            if region == "EMEA" and date(2024, 3, 10) <= d <= date(2024, 3, 12):
                sessions *= 4  # campaign spike → outliers
            signups = int(sessions * rng.uniform(0.025, 0.04))
            conv = rng.uniform(0.012, 0.022)
            orders = int(sessions * conv)
            revenue = round(orders * rng.uniform(38, 55), 2)
            out.append(
                {
                    "date": d.isoformat(),
                    "region": region,
                    "sessions": sessions,
                    "signups": signups,
                    "orders": orders,
                    "revenue": revenue,
                    "avg_session_sec": round(rng.gauss(185, 25), 1),
                    "bounce_rate": round(min(0.95, max(0.2, rng.gauss(0.42, 0.05))), 3),
                    "app_version": None if k < 120 else f"3.{k // 90}.0",
                }
            )
    return out


def main() -> None:
    con = duckdb.connect()
    trips = taxi_trips()
    con.register("trips", trips)
    con.execute(
        f"COPY (SELECT * FROM trips ORDER BY pickup_at) TO '{OUT / 'taxi_trips.parquet'}' (FORMAT PARQUET, COMPRESSION ZSTD)"
    )

    ecommerce_orders().to_csv(OUT / "ecommerce_orders.csv", index=False)

    pd.DataFrame(daily_metrics()).to_json(OUT / "daily_metrics.json", orient="records", indent=None)

    for f in sorted(OUT.iterdir()):
        print(f"{f.name:28s} {f.stat().st_size / 1024:8.1f} KB")


if __name__ == "__main__":
    main()
