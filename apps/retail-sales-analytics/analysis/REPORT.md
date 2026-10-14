# Retail Sales Analytics: findings and recommendations

**To:** Commercial leadership (Sales, Marketing, Buying, E-commerce)
**From:** Jeevan, Data Analyst
**Period analysed:** 1 Dec 2010 – 9 Dec 2011 (UCI Online Retail, 541,909 invoice lines)
**Interactive dashboard:** https://retail-sales-analytics-jeevan.vercel.app

---

## Executive summary

1. **The business is growing fast, but the growth is seasonal.** June–November revenue was **£5.61M, up 49%** on December–May (£3.76M). September–November alone delivered **38%** of the year's revenue, with November the peak at **£1.44M**. Early December is **+9.6% year on year** like-for-like, driven by bigger baskets (orders −2%).
2. **Revenue depends on a small set of loyal B2B accounts.** **17% of customers ("Champions") generate 67% of revenue.** 65% of customers reorder, and repeat orders are **79% of revenue**. Acquisition is the weak link: only **19%** of a new cohort buys again the following month.
3. **The range has a long, costly tail.** **22% of SKUs make 80% of revenue**, while **1,988 SKUs (53% of the range) make just 5%.**
4. **The one-page checkout works. Ship it.** Conversion rose **+14.5%** (95% CI +5.0% to +24.9%, p = 0.002). The gain is concentrated on **mobile (+32%)**. *(This test is simulated: see Caveats.)*
5. **Don't plan the pre-Christmas fortnight off the statistical forecast alone.** Every univariate model under-forecast the November peak by about 25–29%. For 10–23 December, plan to the **YoY-anchored ≈ £396K** and treat the model's £656K as the upside case.

## 1. Revenue and growth

| Metric (Dec 2010 – Nov 2011, 12 full months) | Value |
|---|---|
| Revenue (fulfilled sales) | £9.38M |
| Orders | 18,836 |
| Average order value | £498 |
| Average monthly active customers | 1,031 |
| Return rate (credit notes / revenue) | 0.91% |

- Revenue was flat at £0.5–0.7M a month through August, then stepped up: **Sep +42% MoM, Nov +34% MoM**. The ramp comes from more orders (Nov: 2,740, the highest of the year) at a stable AOV (£525). In other words, more customers reorder in Q4; baskets do not get bigger.
- **Saturday has no trading at all.** Orders arrive in office hours, Tuesday to Thursday, peaking 10:00–15:00. This is a B2B buying pattern, so time campaigns and customer-service staffing to it.
- **Geography is concentrated.** The UK is **84.7%** of revenue. Several export markets are really a handful of key accounts: the Netherlands is 2.9% of revenue from **9 customers** (AOV £3,048), and EIRE is 2.7% from **3 customers**.

## 2. Customers

- **Repeat behaviour is strong.** 2,822 of 4,324 identified customers (**65.3%**) ordered at least twice. The median time to a second order is **52 days**, and **22 days** between subsequent orders.
- **Acquisition is the weak link.** Excluding the left-censored December 2010 cohort, **month-1 retention averages 19%**, and 38–48% of 2011 cohorts reorder within 90 days.
- **k-means segmentation (k = 3, chosen by silhouette among k ≥ 3):**

| Segment | Customers | Share of revenue | Median recency | Median orders | Median spend |
|---|---|---|---|---|---|
| Champions | 728 (17%) | **66.7%** | 10 days | 10 | £3,640 |
| Loyal | 1,708 (40%) | 25.1% | 30 days | 3 | £965 |
| Dormant | 1,888 (44%) | 8.1% | 159 days | 1 | £291 |

- The rule-based RFM grid (NTILE quintiles) agrees and adds one actionable group: **288 "Cannot Lose" customers**, frequent buyers who have gone quiet. They hold 6.0% of revenue.
- **Customer lifetime value (MBG/NBD + Gamma-Gamma):** the current base is expected to generate **£8.1M over the next 12 months** (mean £1,883, median £984). The **top decile holds 49% of that value**.

## 3. Products

- **Pareto:** the top 1% of SKUs make 17% of revenue, the top 20% make **78%**. ABC split: A = 835 SKUs (80% of revenue), B = 963 (15%), C = 1,988 (5%).
- **Categories** (rule-based from descriptions): Kitchen & Dining 29%, Home Décor 19%, Bags & Storage 13%. The top 3 products are Regency Cakestand 3-Tier (£170K), White Hanging Heart T-Light Holder (£100K) and Party Bunting (£99K).
- **Basket analysis** (906 pairs with ≥ 1% support): the highest-lift pairs are design variants of the same item. Herb-marker variants have **lift ≈ 70–76×**; Poppy's Playhouse rooms and wooden decoration sets have lift ≈ 32–46×. Customers buy them as collections.

## 4. Forecast

- **Model:** additive Holt-Winters with damped trend and weekly seasonality, back-tested on the last 42 days.
- **Accuracy:** weekly MAPE **29.6%**, against **37.9%** for seasonal-naive and **28.7%** for a 4-week same-weekday average.
- **Why the error is high:** all three models carry a **−25% to −34% bias**. With less than a year of history, no univariate model can learn the Q4 ramp. The 80% prediction interval covered only 56% of holdout days.
- **Next 14 days (10–23 Dec):** the model says £656K (80% PI £556K–£738K). Last year's same fortnight scaled by the +9.6% like-for-like growth gives **≈ £396K**.

## 5. Experiment: one-page checkout

| | Control | Treatment |
|---|---|---|
| Visitors | 31,027 | 30,559 |
| Conversion | 3.02% | 3.46% |
| AOV (guardrail) | £510 | £456 (−10.7%, p = 0.29, n.s.) |

**Conversion**
- **Overall:** **+14.5%** relative (+0.44 pp), 95% CI +5.0% to +24.9%, z = 3.08, p = 0.002.
- **Validity:** the sample-ratio check passes (χ² p = 0.059). The test ran its full pre-registered 28 days at 126% of the required sample.
- **Mobile:** +32.1% (CI +14% to +53%).
- **Desktop:** +5.7% (CI −5% to +18%, not significant). That is below this test's minimum detectable effect of 13.2%, so read it as *not detected*, not *no effect*.

**Revenue per visitor**
- **Too noisy to read directly.** The CI is −21% to +25%, because heavy-tailed wholesale order values swamp the conversion signal. For the business case, use the conversion lift at the pre-test AOV.

## Recommendations

| # | Action | Owner | Expected impact / KPI |
|---|---|---|---|
| 1 | Roll out the one-page checkout, mobile first. Keep AOV as a guardrail for 4 weeks after launch. | E-commerce | +10–15% conversion. KPI: weekly conversion by device. |
| 2 | Assign account managers to the **728 Champions** and the top CLV decile (433 accounts, 49% of forward value). Add volume-tier pricing. | Sales | Protect ~£4.5M of 12-month CLV. KPI: Champion retention. |
| 3 | Run a **win-back** for the 288 "Cannot Lose" customers before Q4 buying closes. | Marketing | Recover part of the £0.49M they spent last year. KPI: reactivation within 60 days. |
| 4 | Build a **second-order programme** for new customers: reorder reminder at day 30 and a sample pack of A-class bestsellers. | Marketing | Lift month-1 retention from 19% to 25%. KPI: 90-day repeat rate. |
| 5 | Sell high-lift variants as **sets/bundles** (herb markers, playhouse rooms, wooden decorations). Put cross-category pairs in "frequently bought together". | Buying / E-commerce | Higher units per order. KPI: attach rate. |
| 6 | Review the **1,988 C-class SKUs** for delisting or made-to-order. | Buying | Lower inventory carrying cost; 5% of revenue at stake. |
| 7 | **Forecasting:** plan December to the YoY anchor now, and refit the model with a yearly seasonal term once 24 months of data exist. Capture missing CustomerIDs at checkout: 25% of lines, 15% of revenue. | Finance / Data | Better Q4 stock planning, more complete customer analytics. |

## Caveats

- **Simulated experiment.** The A/B test is simulated (seeded and reproducible) on the real order-value distribution, because the public dataset contains no experiment. It demonstrates the method, not a real result.
- **Revenue, not margin.** There is no cost data, so CLV and all value figures are revenue.
- **Churn isn't identifiable.** With only 12 months of history, the CLV model can't separate churned customers from slow buyers: the dropout probability is ≈ 0, which makes CLV an upper bound.
  - On a calibration/holdout split, the model under-predicted Q4 repeat purchases by 25% while ranking customers well (r = 0.80).
  - Sanity check: the January 2011 cohort actually spent £2,392 per customer in its first 11 months, against a modelled £1,940 for the next 12.
- **Heuristic categories.** Categories are keyword rules, not a merchandising hierarchy. "Other" holds 3% of revenue.
- **Data quality.** 16,373 raw rows (3.0%) were removed by six documented rules. The key one was 2,817 purchase lines that were exactly reversed by a cancellation; this also removed the two 80,995- and 74,215-unit keying errors. All 30 blocking checks pass; the one warning is the CLV holdout error above.
