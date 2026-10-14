-- Daily revenue on a complete calendar (non-trading days = 0) for forecasting.
SELECT
    d.date,
    d.day_of_week,
    coalesce(round(sum(f.revenue), 2), 0) AS revenue,
    count(DISTINCT f.invoice_no)          AS orders
FROM dim_date d
LEFT JOIN fact_sales f USING (date_key)
WHERE d.date <= (SELECT max(invoice_ts)::DATE FROM fact_sales)
GROUP BY ALL
ORDER BY d.date;
