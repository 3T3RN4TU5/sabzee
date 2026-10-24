/** Phrase library for the bullet helper: verbs, STAR/XYZ templates and role-specific examples. */
import { ACTION_VERBS, pastTense } from './dictionaries.ts'

export const VERB_CATEGORIES: { name: string; verbs: string[] }[] = Object.entries(ACTION_VERBS).map(([name, verbs]) => ({
  name,
  verbs: verbs.map((v) => {
    const p = pastTense(v)
    return p.charAt(0).toUpperCase() + p.slice(1)
  }),
}))

export interface BulletTemplate {
  name: string
  pattern: string
  example: string
}

/** Bracketed parts are placeholders — the ATS checker flags any that are left in. */
export const BULLET_TEMPLATES: BulletTemplate[] = [
  { name: 'XYZ (Google style)', pattern: '[What you achieved, with a number] as measured by [metric], by [what you did]', example: 'Cut checkout drop-off 18% as measured by funnel analytics, by rebuilding the payment form' },
  { name: 'STAR — result first', pattern: '[Result with a number] by [action you took] to solve [situation]', example: 'Raised test coverage from 40% to 85% by introducing Playwright suites to stop weekly regressions' },
  { name: 'Problem → action → impact', pattern: '[Action verb] [what you built/changed] to fix [problem], [impact with metric]', example: 'Rebuilt the search index to fix stale results, reducing support tickets by 30%' },
  { name: 'Scale & scope', pattern: '[Action verb] [system] serving [N users / requests] across [scope]', example: 'Operated a notification service handling 5M messages a day across 3 regions' },
  { name: 'Leadership', pattern: 'Led a team of [N] to [deliver outcome] [timeframe], [business impact]', example: 'Led a team of 4 to launch the partner portal in 10 weeks, adding ₹2 crore in annual revenue' },
  { name: 'Efficiency', pattern: 'Automated [manual process], saving [N hours/week] and reducing errors by [N%]', example: 'Automated month-end reconciliation, saving 12 hours a week and reducing errors by 90%' },
  { name: 'Collaboration', pattern: 'Partnered with [teams] to [goal], resulting in [measurable result]', example: 'Partnered with design and sales to redesign onboarding, lifting activation 22%' },
  { name: 'Recognition', pattern: '[Achievement] — recognised with [award/promotion] for [reason]', example: 'Shipped the v2 billing engine on time — promoted to Senior Engineer for technical ownership' },
]

export const EXAMPLE_BULLETS: { role: string; bullets: string[] }[] = [
  {
    role: 'Software engineering',
    bullets: [
      'Built a real-time dashboard with React and WebSockets used by 50k+ daily users',
      'Reduced p95 API latency from 800 ms to 220 ms by adding Redis caching and query indexes',
      'Migrated a monolith to 6 containerised services on Kubernetes with zero downtime',
      'Introduced CI checks and code-review guidelines that cut production bugs by 35%',
      'Mentored 3 junior engineers through onboarding and their first production launches',
    ],
  },
  {
    role: 'Data & analytics',
    bullets: [
      'Designed a churn model (AUC 0.87) that let the retention team save ₹1.2 crore a year',
      'Automated weekly KPI reporting with dbt and Airflow, freeing 10 analyst hours a week',
      'Ran 14 A/B tests on pricing pages; the winning variant lifted conversion by 9%',
      'Built Tableau dashboards adopted by 120+ stakeholders across sales and operations',
    ],
  },
  {
    role: 'Product & design',
    bullets: [
      'Defined the roadmap for a self-serve onboarding flow that increased activation by 25%',
      'Interviewed 40 customers to prioritise features, cutting time-to-value from 7 to 2 days',
      'Redesigned the mobile checkout in Figma, reducing drop-off by 18%',
      'Created a design system of 60+ components used across 4 product teams',
    ],
  },
  {
    role: 'Marketing & sales',
    bullets: [
      'Grew organic traffic 3× in 9 months through SEO-driven content and technical fixes',
      'Exceeded quarterly sales quota by 132%, closing ₹85 lakh in new annual contracts',
      'Launched a referral programme that generated 1,800 sign-ups in its first month',
      'Cut cost per acquisition by 27% by reallocating spend across paid channels',
    ],
  },
  {
    role: 'Operations & support',
    bullets: [
      'Resolved 60+ customer tickets a day while maintaining a 96% CSAT score',
      'Streamlined vendor onboarding from 3 weeks to 5 days by standardising contracts',
      'Trained 25 new hires on internal tools, reducing ramp-up time by 30%',
      'Managed a ₹40 lakh annual budget and negotiated 12% savings with suppliers',
    ],
  },
  {
    role: 'Students & freshers',
    bullets: [
      'Won 1st place among 120 teams at a 36-hour national hackathon with an accessibility app',
      'Led a 5-member team to build a campus events app adopted by 2,000+ students',
      'Published an open-source library that reached 300+ GitHub stars',
      'Tutored 15 first-year students in data structures, raising average grades by one band',
    ],
  },
]
