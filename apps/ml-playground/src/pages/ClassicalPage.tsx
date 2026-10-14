import { Shuffle } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ConfusionMatrix } from '../components/charts/ConfusionMatrix.tsx'
import { DecisionPlot } from '../components/charts/DecisionPlot.tsx'
import { LineChart } from '../components/charts/LineChart.tsx'
import { PageIntro } from '../components/PageIntro.tsx'
import { Button, Card, Segmented, Select, Slider, Stat, StepSlider, Toggle } from '../components/ui/controls.tsx'
import { DATASET_2D } from '../engine/index.ts'
import { cn, num, pct } from '../lib/format.ts'
import { useDebounced } from '../lib/hooks.ts'
import type { ClassicalRequest, ClassicalResult, DataSource, DataSpec, ModelKind, ModelSpec } from '../workers/classicalTask.ts'
import { BiasVariancePanel } from './classical/BiasVariancePanel.tsx'

const MODELS: { value: ModelKind; label: string }[] = [
  { value: 'logistic', label: 'Logistic regression' },
  { value: 'knn', label: 'k-nearest neighbours' },
  { value: 'tree', label: 'Decision tree' },
  { value: 'forest', label: 'Random forest' },
  { value: 'nb', label: 'Gaussian naive Bayes' },
  { value: 'svm', label: 'Support vector machine' },
]

const DEFAULT_SPECS: { [K in ModelKind]: Extract<ModelSpec, { kind: K }> } = {
  logistic: { kind: 'logistic', degree: 1, l2: 1e-3 },
  knn: { kind: 'knn', k: 7, weighted: false },
  tree: { kind: 'tree', maxDepth: 5, minSamplesSplit: 2, criterion: 'gini' },
  forest: { kind: 'forest', nTrees: 40, maxDepth: 0 },
  nb: { kind: 'nb' },
  svm: { kind: 'svm', kernel: 'rbf', C: 1, gamma: 3, degree: 3 },
}

const LOG_L2 = [0, 1e-5, 1e-4, 1e-3, 1e-2, 0.1, 1] as const
const LOG_C = [0.01, 0.03, 0.1, 0.3, 1, 3, 10, 30, 100] as const
const LOG_GAMMA = [0.1, 0.3, 1, 3, 10, 30, 100] as const

const SOURCES: { value: DataSource; label: string }[] = [
  ...DATASET_2D.map((d) => ({ value: d.id as DataSource, label: d.label })),
  { value: 'iris', label: 'Iris (PCA → 2-D)' },
  { value: 'wine', label: 'Wine (PCA → 2-D)' },
]

export default function ClassicalPage() {
  const [kind, setKind] = useState<ModelKind>('svm')
  const [specs, setSpecs] = useState(DEFAULT_SPECS)
  const [data, setData] = useState<DataSpec>({ source: 'moons', noise: 0.5, n: 300, classes: 3, seed: 1, trainRatio: 0.7 })
  const [result, setResult] = useState<ClassicalResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [showTest, setShowTest] = useState(true)
  const workerRef = useRef<Worker | null>(null)
  const reqId = useRef(0)

  useEffect(() => {
    const w = new Worker(new URL('../workers/classical.worker.ts', import.meta.url), { type: 'module' })
    workerRef.current = w
    w.onmessage = (e: MessageEvent<ClassicalResult>) => {
      if (e.data.id !== reqId.current) return
      setBusy(false)
      if (!e.data.error) setResult(e.data)
    }
    return () => w.terminate()
  }, [])

  const model = specs[kind]
  const request = useDebounced(useMemo(() => ({ data, model }), [data, model]), 120)
  useEffect(() => {
    const w = workerRef.current
    if (!w) return
    const id = ++reqId.current
    setBusy(true)
    w.postMessage({ id, ...request } satisfies ClassicalRequest)
  }, [request])

  const update = <K extends ModelKind>(k: K, patch: Partial<Extract<ModelSpec, { kind: K }>>) => setSpecs((s) => ({ ...s, [k]: { ...s[k], ...patch } }))
  const setD = <K extends keyof DataSpec>(key: K, v: DataSpec[K]) => setData((d) => ({ ...d, [key]: v }))
  const isReal = data.source === 'iris' || data.source === 'wine'

  const rocSeries = useMemo(
    () =>
      result?.roc
        ? [
            { label: `ROC (AUC ${result.roc.auc.toFixed(3)})`, color: '#22d3ee', x: result.roc.fpr, y: result.roc.tpr, width: 2 },
            { label: 'chance', color: '#64748b', x: [0, 1], y: [0, 1], dashed: true },
          ]
        : [],
    [result],
  )
  const sweepSeries = useMemo(
    () =>
      result?.sweep
        ? [
            { label: 'train accuracy', color: '#38bdf8', y: result.sweep.train },
            { label: 'test accuracy', color: '#f59e0b', y: result.sweep.test, dashed: true },
          ]
        : [],
    [result],
  )

  return (
    <div className="space-y-5">
      <PageIntro
        title="Classical machine learning"
        lead="Six classic classifiers implemented from scratch: logistic regression (Newton/IRLS), k-NN on a k-d tree, CART decision trees, random forests, Gaussian naive Bayes and a kernel SVM trained with SMO. Models are fitted in a Web Worker; every slider refits and re-evaluates on a held-out test set."
      />
      <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)_380px]">
        <div className="space-y-4">
          <Card title="Model">
            <div className="space-y-3">
              <Select label="Algorithm" value={kind} onChange={setKind} options={MODELS} />
              {model.kind === 'logistic' && (
                <>
                  <Slider label="Polynomial degree" value={model.degree} min={1} max={8} onChange={(v) => update('logistic', { degree: v })} />
                  <StepSlider label="L2 penalty λ" values={LOG_L2} value={model.l2 as (typeof LOG_L2)[number]} onChange={(v) => update('logistic', { l2: v })} />
                </>
              )}
              {model.kind === 'knn' && (
                <>
                  <Slider label="k" value={model.k} min={1} max={60} onChange={(v) => update('knn', { k: v })} />
                  <Toggle label="Distance-weighted votes" checked={model.weighted} onChange={(v) => update('knn', { weighted: v })} />
                </>
              )}
              {model.kind === 'tree' && (
                <>
                  <Slider label="Max depth" value={model.maxDepth} min={0} max={15} onChange={(v) => update('tree', { maxDepth: v })} format={(v) => (v ? String(v) : '∞')} />
                  <Slider label="Min samples to split" value={model.minSamplesSplit} min={2} max={40} onChange={(v) => update('tree', { minSamplesSplit: v })} />
                  <Segmented label="Criterion" size="sm" value={model.criterion} onChange={(v) => update('tree', { criterion: v })} options={[{ value: 'gini', label: 'Gini' }, { value: 'entropy', label: 'Entropy' }]} />
                </>
              )}
              {model.kind === 'forest' && (
                <>
                  <Slider label="Trees" value={model.nTrees} min={1} max={100} onChange={(v) => update('forest', { nTrees: v })} />
                  <Slider label="Max depth" value={model.maxDepth} min={0} max={15} onChange={(v) => update('forest', { maxDepth: v })} format={(v) => (v ? String(v) : '∞')} />
                </>
              )}
              {model.kind === 'nb' && <p className="text-xs text-slate-500">No hyper-parameters: one Gaussian per feature and class, combined with Bayes' rule.</p>}
              {model.kind === 'svm' && (
                <>
                  <Segmented label="Kernel" size="sm" value={model.kernel} onChange={(v) => update('svm', { kernel: v })} options={[{ value: 'linear', label: 'Linear' }, { value: 'rbf', label: 'RBF' }, { value: 'poly', label: 'Poly' }]} />
                  <StepSlider label="C (soft margin)" values={LOG_C} value={model.C as (typeof LOG_C)[number]} onChange={(v) => update('svm', { C: v })} />
                  {model.kernel === 'rbf' && <StepSlider label="γ (RBF width)" values={LOG_GAMMA} value={model.gamma as (typeof LOG_GAMMA)[number]} onChange={(v) => update('svm', { gamma: v })} />}
                  {model.kernel === 'poly' && <Slider label="Degree" value={model.degree} min={2} max={6} onChange={(v) => update('svm', { degree: v })} />}
                </>
              )}
            </div>
          </Card>
          <Card title="Data">
            <div className="space-y-3">
              <Select label="Dataset" value={data.source} onChange={(v) => setD('source', v)} options={SOURCES} />
              {!isReal && (
                <>
                  {(data.source === 'blobs' || data.source === 'spiral') && <Slider label="Classes" value={data.classes} min={2} max={5} onChange={(v) => setD('classes', v)} />}
                  <Slider label="Noise" value={data.noise} min={0} max={1} step={0.05} onChange={(v) => setD('noise', v)} format={(v) => v.toFixed(2)} />
                  <Slider label="Points" value={data.n} min={60} max={600} step={20} onChange={(v) => setD('n', v)} />
                </>
              )}
              <Slider label="Train split" value={data.trainRatio} min={0.2} max={0.9} step={0.05} onChange={(v) => setD('trainRatio', v)} format={(v) => pct(v, 0)} />
              <Button onClick={() => setD('seed', data.seed + 1)} className="w-full">
                <Shuffle size={14} /> {isReal ? 'New split' : 'New sample'}
              </Button>
              {isReal && <p className="text-xs text-slate-500">The real dataset is standardised and projected onto its first two principal components (computed by this app's PCA) so the decision boundary can be drawn.</p>}
            </div>
          </Card>
        </div>

        <Card title="Decision boundary" actions={<span className={cn('text-xs', busy ? 'text-cyan-300' : 'text-slate-500')}>{busy ? 'fitting…' : result ? `fit ${result.fitMs.toFixed(1)} ms · ${result.info}` : ''}</span>} className="min-w-0">
          <DecisionPlot
            probs={result?.grid}
            res={result?.res}
            numClasses={result?.numClasses ?? 2}
            train={result?.train}
            test={result?.test}
            showTest={showTest}
            highlight={result?.supportVectors}
            maxSize={560}
            ariaLabel="Decision boundary of the selected classifier"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <Toggle label="Show test points (rings)" checked={showTest} onChange={setShowTest} />
            {result?.supportVectors && <span className="text-xs text-slate-400">white rings = support vectors</span>}
          </div>
          {result?.sweep && (
            <div className="mt-5">
              <h4 className="eyebrow mb-1">Model complexity sweep · {result.sweep.param}</h4>
              <LineChart
                series={sweepSeries}
                height={170}
                yMin={Math.max(0, Math.min(...result.sweep.test, ...result.sweep.train) - 0.05)}
                yMax={1}
                markerX={result.sweep.current}
                formatX={(i) => result.sweep!.labels[Math.round(i)] ?? ''}
                formatY={(v) => pct(v, 0)}
                xLabel={result.sweep.param}
                ariaLabel="Train and test accuracy as the main hyper-parameter varies"
              />
              <p className="mt-1 text-xs text-slate-500">The gap between the curves is overfitting; both low means underfitting. The dashed marker is the current setting.</p>
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Train accuracy" value={result ? pct(result.trainAcc) : '—'} accent="#38bdf8" />
            <Stat label="Test accuracy" value={result ? pct(result.testAcc) : '—'} accent="#f59e0b" />
            <Stat label="Precision (macro)" value={result ? num(result.report.macro.precision, 3) : '—'} />
            <Stat label="Recall (macro)" value={result ? num(result.report.macro.recall, 3) : '—'} />
            <Stat label="F1 (macro)" value={result ? num(result.report.macro.f1, 3) : '—'} />
            <Stat label="ROC AUC" value={result?.roc ? num(result.roc.auc, 3) : 'n/a'} sub={result?.roc ? 'binary, test set' : 'multiclass'} />
          </div>
          <Card title="Confusion matrix (test set)">{result && <ConfusionMatrix matrix={result.confusion} labels={result.classNames.map((c) => (c.length > 6 ? c.slice(0, 6) : c))} />}</Card>
          {result?.roc && (
            <Card title="ROC curve (test set)">
              <LineChart series={rocSeries} height={190} yMin={0} yMax={1} formatX={(v) => v.toFixed(2)} formatY={(v) => v.toFixed(2)} xLabel="false positive rate" ariaLabel="ROC curve" />
            </Card>
          )}
        </div>
      </div>
      <BiasVariancePanel />
    </div>
  )
}
