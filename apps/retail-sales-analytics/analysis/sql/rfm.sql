-- RFM scoring per (non-guest) customer, quintile scores via NTILE window functions.
-- Snapshot date = day after the last invoice. Monetary = fulfilled sales value.
WITH snapshot AS (
    SELECT max(invoice_ts)::DATE + 1 AS as_of FROM fact_sales
),
base AS (
    SELECT
        f.customer_key,
        c.customer_id,
        c.country,
        datediff('day', max(f.invoice_ts)::DATE, any_value(s.as_of))  AS recency_days,
        count(DISTINCT f.invoice_no)                                  AS frequency,
        round(sum(f.revenue), 2)                                      AS monetary,
        min(f.invoice_ts)::DATE                                       AS first_order,
        max(f.invoice_ts)::DATE                                       AS last_order
    FROM fact_sales f
    JOIN dim_customer c USING (customer_key)
    CROSS JOIN snapshot s
    WHERE NOT c.is_guest
    GROUP BY f.customer_key, c.customer_id, c.country
),
scored AS (
    SELECT
        *,
        -- lower recency is better, so order descending to give recent buyers a 5
        ntile(5) OVER (ORDER BY recency_days DESC, customer_key) AS r_score,
        ntile(5) OVER (ORDER BY frequency, monetary, customer_key) AS f_score,
        ntile(5) OVER (ORDER BY monetary, customer_key)           AS m_score
    FROM base
)
SELECT
    *,
    r_score * 100 + f_score * 10 + m_score AS rfm_cell,
    CASE
        WHEN r_score >= 4 AND f_score >= 4                 THEN 'Champions'
        WHEN r_score >= 3 AND f_score >= 3                 THEN 'Loyal'
        WHEN r_score >= 4 AND f_score <= 2                 THEN 'New & Promising'
        WHEN r_score = 3 AND f_score <= 2                  THEN 'Needs Attention'
        WHEN r_score <= 2 AND f_score >= 4                 THEN 'Cannot Lose'
        WHEN r_score <= 2 AND f_score = 3                  THEN 'At Risk'
        WHEN r_score = 2 AND f_score <= 2                  THEN 'Hibernating'
        ELSE 'Lost'
    END AS rfm_segment
FROM scored
ORDER BY monetary DESC;
