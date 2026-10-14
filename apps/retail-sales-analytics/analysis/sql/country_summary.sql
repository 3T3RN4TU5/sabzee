-- Revenue and customer base by country, with rank and share via window functions.
SELECT
    f.country,
    round(sum(f.revenue), 2)                                           AS revenue,
    count(DISTINCT f.invoice_no)                                       AS orders,
    count(DISTINCT f.customer_key) FILTER (WHERE f.customer_key <> 0)  AS customers,
    round(sum(f.revenue) / count(DISTINCT f.invoice_no), 2)            AS aov,
    rank() OVER (ORDER BY sum(f.revenue) DESC)                         AS revenue_rank,
    round(sum(f.revenue) / sum(sum(f.revenue)) OVER (), 4)             AS revenue_share
FROM fact_sales f
GROUP BY f.country
ORDER BY revenue DESC;
