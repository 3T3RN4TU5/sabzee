-- Product Pareto / ABC classification on revenue.
-- A = products making up the first 80% of cumulative revenue, B = next 15%, C = the tail.
WITH product_revenue AS (
    SELECT
        p.product_key,
        p.stock_code,
        p.description,
        p.category,
        sum(f.revenue)                AS revenue,
        sum(f.quantity)               AS units,
        count(DISTINCT f.invoice_no)  AS orders,
        count(DISTINCT f.customer_key) FILTER (WHERE f.customer_key <> 0) AS customers
    FROM fact_sales f
    JOIN dim_product p USING (product_key)
    GROUP BY ALL
),
ranked AS (
    SELECT
        *,
        row_number() OVER (ORDER BY revenue DESC, stock_code)                       AS revenue_rank,
        sum(revenue) OVER (ORDER BY revenue DESC, stock_code ROWS UNBOUNDED PRECEDING)
            / sum(revenue) OVER ()                                                AS cum_share,
        count(*) OVER ()                                                          AS n_products
    FROM product_revenue
)
SELECT
    product_key, stock_code, description, category,
    round(revenue, 2) AS revenue, units, orders, customers,
    revenue_rank,
    round(revenue_rank / n_products, 6) AS cum_product_share,
    round(cum_share, 6)                 AS cum_revenue_share,
    CASE
        WHEN cum_share - revenue / sum(revenue) OVER () < 0.80 THEN 'A'
        WHEN cum_share - revenue / sum(revenue) OVER () < 0.95 THEN 'B'
        ELSE 'C'
    END AS abc_class
FROM ranked
ORDER BY revenue_rank;
