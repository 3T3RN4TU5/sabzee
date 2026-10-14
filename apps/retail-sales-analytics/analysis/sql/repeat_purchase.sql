-- Repeat-purchase behaviour of identified customers.
WITH orders AS (
    SELECT
        customer_key,
        invoice_no,
        min(invoice_ts) AS order_ts,
        sum(revenue)    AS order_value
    FROM fact_sales
    WHERE customer_key <> 0
    GROUP BY ALL
),
sequenced AS (
    SELECT
        *,
        row_number() OVER (PARTITION BY customer_key ORDER BY order_ts, invoice_no) AS order_seq,
        datediff('day', lag(order_ts) OVER (PARTITION BY customer_key ORDER BY order_ts, invoice_no), order_ts) AS days_since_prev
    FROM orders
),
per_customer AS (
    SELECT
        customer_key,
        count(*)                                     AS n_orders,
        max(days_since_prev) FILTER (WHERE order_seq = 2) AS days_to_second
    FROM sequenced
    GROUP BY customer_key
)
SELECT
    count(*)                                                   AS customers,
    count(*) FILTER (WHERE n_orders >= 2)                      AS repeat_customers,
    round(count(*) FILTER (WHERE n_orders >= 2) / count(*), 4) AS repeat_rate,
    round(avg(n_orders), 2)                                    AS avg_orders_per_customer,
    median(days_to_second)                                     AS median_days_to_second_order,
    (SELECT median(days_since_prev) FROM sequenced WHERE days_since_prev IS NOT NULL) AS median_days_between_orders,
    (SELECT round(sum(order_value) FILTER (WHERE order_seq >= 2) / sum(order_value), 4) FROM sequenced) AS revenue_share_repeat_orders
FROM per_customer;
