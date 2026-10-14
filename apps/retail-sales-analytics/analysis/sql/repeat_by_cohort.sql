-- Share of each acquisition cohort that has placed a second order within 90 days,
-- restricted to cohorts that have had a full 90 days to do so.
WITH orders AS (
    SELECT customer_key, invoice_no, min(invoice_ts) AS order_ts
    FROM fact_sales WHERE customer_key <> 0 GROUP BY ALL
),
seq AS (
    SELECT customer_key, order_ts,
           row_number() OVER (PARTITION BY customer_key ORDER BY order_ts, invoice_no) AS n
    FROM orders
),
firsts AS (
    SELECT
        f.customer_key,
        f.order_ts AS first_ts,
        s.order_ts AS second_ts
    FROM seq f
    LEFT JOIN seq s ON s.customer_key = f.customer_key AND s.n = 2
    WHERE f.n = 1
)
SELECT
    strftime(date_trunc('month', first_ts), '%Y-%m')               AS cohort,
    count(*)                                                       AS customers,
    count(*) FILTER (WHERE datediff('day', first_ts, second_ts) <= 90) AS repeat_90d,
    round(count(*) FILTER (WHERE datediff('day', first_ts, second_ts) <= 90) / count(*), 4) AS repeat_rate_90d
FROM firsts
WHERE first_ts <= (SELECT max(invoice_ts) FROM fact_sales) - INTERVAL 90 DAY
GROUP BY ALL
ORDER BY cohort;
