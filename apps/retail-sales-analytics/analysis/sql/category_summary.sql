-- Category performance: revenue, share, product count, and share of products in ABC class A.
WITH pr AS (
    SELECT p.category, p.product_key, sum(f.revenue) AS revenue, sum(f.quantity) AS units
    FROM fact_sales f JOIN dim_product p USING (product_key)
    GROUP BY ALL
)
SELECT
    category,
    round(sum(revenue), 2)                          AS revenue,
    sum(units)                                      AS units,
    count(*)                                        AS products,
    round(sum(revenue) / sum(sum(revenue)) OVER (), 4) AS revenue_share,
    round(sum(revenue) / count(*), 2)               AS revenue_per_product
FROM pr
GROUP BY category
ORDER BY revenue DESC;
