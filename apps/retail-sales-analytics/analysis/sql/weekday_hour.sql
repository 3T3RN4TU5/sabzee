-- When do orders arrive? Revenue and order counts by weekday x hour.
SELECT
    d.day_of_week,
    d.day_name,
    hour(f.invoice_ts)               AS hour,
    count(DISTINCT f.invoice_no)     AS orders,
    round(sum(f.revenue), 2)         AS revenue
FROM fact_sales f
JOIN dim_date d USING (date_key)
GROUP BY ALL
ORDER BY d.day_of_week, hour;
