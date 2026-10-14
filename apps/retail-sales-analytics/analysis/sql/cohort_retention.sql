-- Monthly acquisition cohorts and retention matrix.
-- Cohort = month of a customer's first purchase in the extract. Note that the
-- December 2010 cohort is left-censored: it includes customers acquired before
-- the extract began, which is why its retention runs higher than later cohorts.
WITH activity AS (
    SELECT DISTINCT
        c.customer_key,
        c.cohort_month,
        d.month_start AS activity_month
    FROM fact_sales f
    JOIN dim_customer c USING (customer_key)
    JOIN dim_date d USING (date_key)
    WHERE NOT c.is_guest
),
indexed AS (
    SELECT
        cohort_month,
        datediff('month', cohort_month, activity_month) AS months_since,
        count(*) AS active_customers
    FROM activity
    GROUP BY ALL
)
SELECT
    strftime(cohort_month, '%Y-%m') AS cohort,
    months_since,
    active_customers,
    first_value(active_customers) OVER (PARTITION BY cohort_month ORDER BY months_since) AS cohort_size,
    round(active_customers / first_value(active_customers) OVER (PARTITION BY cohort_month ORDER BY months_since), 4) AS retention
FROM indexed
ORDER BY cohort_month, months_since;
