-- Market-basket analysis: product pairs bought on the same invoice.
--   support(A,B)     = P(A and B)            share of invoices containing both
--   confidence(A->B) = P(B | A)
--   lift(A,B)        = P(A and B) / (P(A) P(B))   > 1 means bought together more than chance
-- Pairs need >= 1% support (about 185 invoices) so that lift is not driven by noise.
WITH baskets AS (
    SELECT DISTINCT invoice_no, product_key FROM fact_sales
),
n AS (
    SELECT count(DISTINCT invoice_no)::DOUBLE AS n_baskets FROM baskets
),
item AS (
    SELECT product_key, count(*) AS n_item FROM baskets GROUP BY product_key
),
frequent AS (   -- Apriori pruning: a pair can only be frequent if both items are
    SELECT i.product_key FROM item i, n WHERE i.n_item / n.n_baskets >= 0.01
),
pairs AS (
    SELECT a.product_key AS a_key, b.product_key AS b_key, count(*) AS n_pair
    FROM baskets a
    JOIN baskets b ON a.invoice_no = b.invoice_no AND a.product_key < b.product_key
    WHERE a.product_key IN (SELECT product_key FROM frequent)
      AND b.product_key IN (SELECT product_key FROM frequent)
    GROUP BY ALL
)
SELECT
    pa.description AS product_a,
    pb.description AS product_b,
    pa.category    AS category_a,
    pb.category    AS category_b,
    p.n_pair       AS baskets_together,
    round(p.n_pair / n.n_baskets, 5)                                   AS support,
    round(p.n_pair / ia.n_item, 4)                                     AS confidence_a_to_b,
    round(p.n_pair / ib.n_item, 4)                                     AS confidence_b_to_a,
    round((p.n_pair / n.n_baskets) / ((ia.n_item / n.n_baskets) * (ib.n_item / n.n_baskets)), 2) AS lift
FROM pairs p
CROSS JOIN n
JOIN item ia ON ia.product_key = p.a_key
JOIN item ib ON ib.product_key = p.b_key
JOIN dim_product pa ON pa.product_key = p.a_key
JOIN dim_product pb ON pb.product_key = p.b_key
WHERE p.n_pair / n.n_baskets >= 0.01
ORDER BY lift DESC, baskets_together DESC;
