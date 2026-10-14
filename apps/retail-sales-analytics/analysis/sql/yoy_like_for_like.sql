-- Like-for-like YoY: the extract ends on 2011-12-09, so December 2011 is only
-- comparable with the same calendar days of December 2010.
WITH bounds AS (
    SELECT max(invoice_ts)::DATE AS last_day FROM fact_sales
),
periods AS (
    SELECT
        date_trunc('month', last_day)::DATE                       AS cur_start,
        last_day                                                  AS cur_end,
        (date_trunc('month', last_day) - INTERVAL 1 YEAR)::DATE   AS prev_start,
        (last_day - INTERVAL 1 YEAR)::DATE                        AS prev_end
    FROM bounds
)
SELECT
    p.cur_start, p.cur_end, p.prev_start, p.prev_end,
    round(sum(f.revenue) FILTER (WHERE f.invoice_ts::DATE BETWEEN p.cur_start AND p.cur_end), 2)  AS cur_revenue,
    round(sum(f.revenue) FILTER (WHERE f.invoice_ts::DATE BETWEEN p.prev_start AND p.prev_end), 2) AS prev_revenue,
    count(DISTINCT f.invoice_no) FILTER (WHERE f.invoice_ts::DATE BETWEEN p.cur_start AND p.cur_end)  AS cur_orders,
    count(DISTINCT f.invoice_no) FILTER (WHERE f.invoice_ts::DATE BETWEEN p.prev_start AND p.prev_end) AS prev_orders
FROM fact_sales f, periods p
GROUP BY ALL;
