import { lazy, Suspense, useEffect, useState } from 'react'
import { BookOpen, Gauge as GaugeIcon, LineChart, Table2 } from 'lucide-react'
import { Loading, Segmented } from './components/ui.tsx'
import { useArtefacts } from './lib/data.ts'
import type { BusinessParams } from './ml/types.ts'

// Pages are code-split so the first paint does not wait for every chart.
const PredictPage = lazy(() => import('./pages/Predict.tsx').then((m) => ({ default: m.PredictPage })))
const BatchPage = lazy(() => import('./pages/Batch.tsx').then((m) => ({ default: m.BatchPage })))
const PerformancePage = lazy(() => import('./pages/Performance.tsx').then((m) => ({ default: m.PerformancePage })))
const ModelCardPage = lazy(() => import('./pages/ModelCard.tsx').then((m) => ({ default: m.ModelCardPage })))

const ROUTES = [
  { id: 'predict', label: 'Predict', icon: GaugeIcon },
  { id: 'batch', label: 'Batch scoring', icon: Table2 },
  { id: 'performance', label: 'Model performance', icon: LineChart },
  { id: 'model-card', label: 'Model card', icon: BookOpen },
] as const
export type RouteId = (typeof ROUTES)[number]['id']
export type ModelRole = 'champion' | 'challenger'

const readRoute = (): RouteId => {
  const h = window.location.hash.replace(/^#\/?/, '')
  return ROUTES.some((r) => r.id === h) ? (h as RouteId) : 'predict'
}

const GITHUB = 'https://github.com/Jeevan2410/churn-predictor-ml'

export interface Settings {
  role: ModelRole
  threshold: number
  business: BusinessParams
  setThreshold: (t: number) => void
  setBusiness: (b: BusinessParams) => void
}

export default function App() {
  const [route, setRoute] = useState<RouteId>(readRoute)
  const [role, setRole] = useState<ModelRole>('champion')
  const [threshold, setThreshold] = useState<number | null>(null)
  const [business, setBusiness] = useState<BusinessParams | null>(null)
  const state = useArtefacts()

  useEffect(() => {
    const onHash = () => {
      setRoute(readRoute())
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const ready = state.status === 'ready' ? state.data : null
  const settings: Settings | null = ready
    ? {
        role,
        threshold: threshold ?? ready.champion.threshold,
        business: business ?? ready.champion.business,
        setThreshold,
        setBusiness,
      }
    : null

  return (
    <div className="mx-auto flex min-h-screen max-w-[1400px] flex-col px-4 pb-10 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3 py-4">
        <a href="#/predict" className="flex items-center gap-2.5">
          <img src="/favicon.svg" alt="" className="size-8" />
          <div>
            <div className="text-[15px] leading-tight font-bold text-slate-50">Churn Predictor</div>
            <div className="text-[11px] leading-tight text-slate-400">calibrated · cost-aware · explainable · runs in your browser</div>
          </div>
        </a>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-slate-400 sm:inline">Model</span>
          <Segmented
            label="Model"
            value={role}
            onChange={setRole}
            options={[
              { value: 'champion', label: <>Champion<span className="hidden sm:inline"> · {ready ? short(ready.champion.model_name) : ''}</span></> },
              { value: 'challenger', label: <>Challenger<span className="hidden sm:inline"> · {ready ? short(ready.challenger.model_name) : ''}</span></> },
            ]}
          />
          <a href={GITHUB} target="_blank" rel="noreferrer" className="btn hidden md:inline-flex" aria-label="Source code on GitHub">
            <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true"><path d="M12 .5a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.9 1.3 1.9 1.3 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.7 18.3 5 18.3 5c.7 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .5Z" /></svg>
            GitHub
          </a>
        </div>
      </header>

      <nav aria-label="Pages" className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-white/[0.07] bg-slate-900/60 p-1">
        {ROUTES.map((r) => {
          const Icon = r.icon
          const active = r.id === route
          return (
            <a
              key={r.id}
              href={`#/${r.id}`}
              aria-current={active ? 'page' : undefined}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                active ? 'bg-sky-500/15 text-sky-100' : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
              }`}
            >
              <Icon className="size-4" aria-hidden="true" />
              {r.label}
            </a>
          )
        })}
      </nav>

      <main className="flex-1">
        {state.status === 'error' && <div className="card p-6 text-rose-300">Could not load model artefacts: {state.error}</div>}
        {state.status === 'loading' && <Loading />}
        {ready && settings && (
          <Suspense fallback={<Loading label="Loading page…" />}>
            {route === 'predict' && <PredictPage data={ready} settings={settings} />}
            {route === 'batch' && <BatchPage data={ready} settings={settings} />}
            {route === 'performance' && <PerformancePage data={ready} settings={settings} />}
            {route === 'model-card' && <ModelCardPage data={ready} />}
          </Suspense>
        )}
      </main>

      <footer className="mt-10 flex flex-wrap justify-between gap-2 border-t border-white/[0.06] pt-4 text-xs text-slate-500">
        <span>
          Built by Jeevan · <a className="hover:text-slate-300" href={GITHUB}>Jeevan2410/churn-predictor-ml</a>
        </span>
        <span>IBM Telco Customer Churn dataset · scikit-learn → JSON → TypeScript inference (no server)</span>
      </footer>
    </div>
  )
}

function short(name: string): string {
  if (name.startsWith('Logistic')) return 'Logistic reg.'
  if (name.startsWith('Hist')) return 'Gradient boosting'
  return name
}
