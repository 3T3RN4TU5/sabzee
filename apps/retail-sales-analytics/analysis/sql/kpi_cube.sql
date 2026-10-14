-- Pre-aggregated cube for the dashboard's filters (month x country x category).
-- GROUPING SETS give exact distinct counts at every level the UI can request,
-- so selecting "All countries" never sums distinct counts across countries.
-- Distinct counts are *not* additive across months; the UI only sums the
-- additive measures (revenue, units, lines, orders) over a date range.
SELECT
    d.month_label                                   AS month,
    coalesce(f.country, '__all__')                  AS country,
    coalesce(p.category, '__all__')                 AS category,
    round(sum(f.revenue), 2)                        AS revenue,
    sum(f.quantity)                                 AS units,
    count(*)                                        AS lines,
    count(DISTINCT f.invoice_no)                    AS orders,
    count(DISTINCT f.customer_key) FILTER (WHERE f.customer_key <> 0) AS customers,
    round(sum(f.revenue) FILTER (WHERE f.customer_key = 0), 2)        AS guest_revenue
FROM fact_sales f
JOIN dim_date d USING (date_key)
JOIN dim_product p USING (product_key)
GROUP BY GROUPING SETS (
    (d.month_label, f.country, p.category),
    (d.month_label, f.country),
    (d.month_label, p.category),
    (d.month_label)
)
ORDER BY month, country, category;
