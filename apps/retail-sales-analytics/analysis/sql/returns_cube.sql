-- Returns value on the same grain as kpi_cube, for the return-rate KPI.
SELECT
    d.month_label                       AS month,
    coalesce(r.country, '__all__')      AS country,
    coalesce(p.category, '__all__')     AS category,
    round(sum(r.revenue), 2)            AS returns_value
FROM fact_returns r
JOIN dim_date d USING (date_key)
JOIN dim_product p USING (product_key)
GROUP BY GROUPING SETS (
    (d.month_label, r.country, p.category),
    (d.month_label, r.country),
    (d.month_label, p.category),
    (d.month_label)
)
ORDER BY month, country, category;
