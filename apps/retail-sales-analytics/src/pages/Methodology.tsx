import { Card, PageIntro } from '../components/ui.tsx'
import { REPO_URL } from '../lib/config.ts'
import { fmt } from '../lib/format.ts'
import type { Meta } from '../lib/types.ts'

const SQL_FILES: [string, string][] = [
  ['schema.sql', 'Star-schema DDL with PK / FK / CHECK constraints'],
  ['monthly_revenue.sql', 'Monthly revenue, MoM / YoY via LAG, 3-month rolling average, running total'],
  ['yoy_like_for_like.sql', 'Like-for-like YoY for the partial final month'],
  ['kpi_cube.sql', 'GROUPING SETS cube that powers every dashboard filter'],
  ['cohort_retention.sql', 'Acquisition cohorts × months-since-first-order with FIRST_VALUE'],
  ['rfm.sql', 'Recency / frequency / monetary with NTILE(5) scores and a rule-based segment grid'],
  ['product_pareto.sql', 'Cumulative revenue share with windowed SUM and ABC classes'],
  ['basket_pairs.sql', 'Invoice self-join with Apriori pruning: support, confidence and lift'],
  ['repeat_purchase.sql', 'Repeat rate, days to second order, revenue from repeat orders'],
  ['repeat_by_cohort.sql', '90-day repeat rate per cohort'],
  ['country_summary.sql', 'Country revenue, rank and share'],
  ['weekday_hour.sql', 'Order timing heatmap'],
]

export default function Methodology({ meta }: { meta: Meta }) {
  const src = (path: string) => `${REPO_URL}/blob/main/${path}`
  return (
    <>
      <PageIntro eyebrow="Methodology" title="How the analysis was built">
        Everything on this site is reproducible from one command: <code className="font-mono text-xs text-sky-200">python analysis/run_pipeline.py</code>. The
        pipeline writes compact JSON aggregates (≈250 KB in total) that this static React app reads at runtime.
      </PageIntro>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="1 · Data">
          <div className="prose-memo text-sm">
            <p>
              <a href={meta.dataset_url} target="_blank" rel="noreferrer">
                UCI Online Retail
              </a>{' '}
              (Chen, Sain &amp; Guo, 2012; CC BY 4.0): every transaction of a UK-based, registered non-store online retailer selling unique all-occasion gifts,
              mostly to wholesalers, between {meta.period_start} and {meta.period_end}. {fmt.int(meta.raw_rows)} raw invoice lines.
            </p>
            <p>
              Currency is GBP. Products have no category in the source, so 10 categories are assigned by ordered keyword rules on descriptions; the
              revenue share left in “Other” is monitored by a quality check.
            </p>
            <p>
              The <strong>A/B test is simulated</strong>: the dataset has no experiment. Visitors, device mix and conversion rates are synthetic and seeded;
              order values are resampled from the real cleaned orders.
            </p>
          </div>
        </Card>

        <Card title="2 · Cleaning rules (in order)">
          <div className="prose-memo text-sm">
            <ul>
              <li>
                <strong>R1 Duplicates:</strong> same invoice, product, quantity, price, timestamp, customer and country.
              </li>
              <li>
                <strong>R2 Non-merchandise:</strong> postage, Amazon fees, bank charges, manual adjustments, discounts, samples, vouchers (stock codes not
                matching <code>^\d{'{5}'}[A-Z]{'{0,2}'}$</code>).
              </li>
              <li>
                <strong>R3 Stock write-offs:</strong> negative quantity on a normal invoice (“damaged”, “lost”).
              </li>
              <li>
                <strong>R4 Price ≤ 0.</strong>
              </li>
              <li>
                <strong>R5 Cancelled orders:</strong> a purchase line exactly reversed by a later credit note is dropped together with the reversal. Other
                credit notes are kept as partial returns in <code>fact_returns</code>.
              </li>
              <li>
                <strong>R6 Implausible lines:</strong> ≥ 10,000 units or ≥ £1,000 per unit; a guard that catches nothing after R5.
              </li>
              <li>
                Large B2B orders are <em>kept</em>: they are the business. Skew is handled with medians, log transforms and bootstraps.
              </li>
            </ul>
          </div>
        </Card>

        <Card title="3 · Metric definitions">
          <div className="prose-memo text-sm">
            <ul>
              <li>
                <strong>Revenue:</strong> Σ quantity × unit price over fulfilled sales lines. Returns are reported separately as the return rate.
              </li>
              <li>
                <strong>Order:</strong> a distinct invoice. <strong>AOV:</strong> revenue / orders.
              </li>
              <li>
                <strong>Active customers:</strong> distinct identified customers in a month; over a range, the monthly average (distinct counts don't add).
              </li>
              <li>
                <strong>Cohort:</strong> month of first purchase in the extract (Dec 2010 is left-censored).
              </li>
              <li>
                <strong>KPI deltas:</strong> vs the preceding period of equal length; if there isn't one, last half vs first half of the selected range.
              </li>
            </ul>
          </div>
        </Card>

        <Card title="4 · Models">
          <div className="prose-memo text-sm">
            <ul>
              <li>
                <strong>Segmentation:</strong> k-means on standardised log(1 + R, F, M); k chosen by silhouette among k ≥ 3; clusters named from their median
                centroid relative to the customer base.
              </li>
              <li>
                <strong>Forecast:</strong> additive Holt-Winters with damped trend and weekly seasonality (statsmodels), Saturdays fixed to zero, trained after
                the 2010 Christmas shutdown. 42-day holdout vs seasonal-naive and 4-week-average baselines; prediction intervals from 2,000 simulated paths.
              </li>
              <li>
                <strong>CLV:</strong> MBG/NBD for purchase counts and dropout + Gamma-Gamma for spend, fitted by maximum likelihood with SciPy (no black-box
                library), validated on a calibration/holdout split.
              </li>
              <li>
                <strong>A/B test:</strong> pooled two-proportion z-test, Wald and delta-method CIs, Welch t-test and percentile bootstrap for order value,
                χ² sample-ratio-mismatch check, power and MDE from the normal approximation.
              </li>
            </ul>
          </div>
        </Card>

        <Card title="5 · SQL marts" className="lg:col-span-2">
          <ul className="grid gap-2 sm:grid-cols-2">
            {SQL_FILES.map(([file, what]) => (
              <li key={file} className="rounded-lg border border-white/[0.06] bg-slate-950/40 p-3">
                <a href={src(`analysis/sql/${file}`)} target="_blank" rel="noreferrer" className="font-mono text-sm text-sky-300 hover:underline">
                  {file}
                </a>
                <p className="mt-0.5 text-xs text-slate-400">{what}</p>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="6 · Limitations" className="lg:col-span-2">
          <div className="prose-memo text-sm">
            <ul>
              <li>One year of history: no annual seasonality can be learned, so the forecast misses the Q4 ramp and churn isn't identifiable for CLV.</li>
              <li>No cost data: CLV and all value metrics are revenue, not margin.</li>
              <li>25% of raw lines have no CustomerID (15% of revenue); they're in revenue KPIs but not in customer analytics.</li>
              <li>Categories are heuristic keyword rules, not a merchandising hierarchy.</li>
              <li>The experiment is simulated; it demonstrates the method, not a real business result.</li>
            </ul>
            <p>
              Read the full stakeholder memo in{' '}
              <a href={src('analysis/REPORT.md')} target="_blank" rel="noreferrer">
                analysis/REPORT.md
              </a>
              .
            </p>
          </div>
        </Card>
      </div>
    </>
  )
}
