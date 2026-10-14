-- Monthly revenue trend with MoM / YoY growth, rolling average and running total.
-- Revenue = fulfilled sales (fact_sales). Returns are reported separately so that
-- a credit note in month m+1 does not distort the trend of month m.
WITH monthly AS (
    SELECT
        d.month_start,
        d.month_label,
        sum(f.revenue)                                   AS revenue,
        count(DISTINCT f.invoice_no)                     AS orders,
        count(DISTINCT f.customer_key) FILTER (WHERE f.customer_key <> 0) AS active_customers,
        sum(f.quantity)                                  AS units,
        count(DISTINCT d.date)                           AS trading_days,
        max(d.date)                                      AS last_trading_day
    FROM fact_sales f
    JOIN dim_date d USING (date_key)
    GROUP BY ALL
),
returns AS (
    SELECT d.month_start, sum(r.revenue) AS returns_value
    FROM fact_returns r JOIN dim_date d USING (date_key)
    GROUP BY ALL
)
SELECT
    m.month_label,
    m.month_start,
    round(m.revenue, 2)                                          AS revenue,
    m.orders,
    m.active_customers,
    m.units,
    m.trading_days,
    round(m.revenue / m.orders, 2)                               AS aov,
    round(coalesce(r.returns_value, 0), 2)                       AS returns_value,
    -- the final month is partial when the extract stops before month end
    (m.month_start = max(m.month_start) OVER () AND m.last_trading_day < last_day(m.month_start)) AS is_partial,
    round(m.revenue / lag(m.revenue) OVER w - 1, 4)              AS mom_growth,
    round(m.revenue / lag(m.revenue, 12) OVER w - 1, 4)          AS yoy_growth,
    round(avg(m.revenue) OVER (w ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2) AS revenue_3m_avg,
    round(sum(m.revenue) OVER (w ROWS UNBOUNDED PRECEDING), 2)   AS revenue_running_total,
    round(m.revenue / sum(m.revenue) OVER (), 4)                 AS share_of_total
FROM monthly m
LEFT JOIN returns r USING (month_start)
WINDOW w AS (ORDER BY m.month_start)
ORDER BY m.month_start;
