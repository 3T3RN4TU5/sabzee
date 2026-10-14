-- Customer-day transaction log used by the BG/NBD + Gamma-Gamma CLV model.
-- A "transaction" is a distinct purchase day, the convention in the BTYD literature.
SELECT
    f.customer_key,
    f.invoice_ts::DATE      AS order_date,
    round(sum(f.revenue), 2) AS value
FROM fact_sales f
WHERE f.customer_key <> 0
GROUP BY ALL
ORDER BY f.customer_key, order_date;
