import { Minus, Pause, Play, Plus, RotateCcw, Shuffle, StepForward } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DecisionPlot } from '../components/charts/DecisionPlot.tsx'
import { LineChart } from '../components/charts/LineChart.tsx'
import { PageIntro } from '../components/PageIntro.tsx'
import { Button, Card, Segmented, Select, Slider, Stat, StepSlider, Toggle } from '../components/ui/controls.tsx'
import { DATASET_2D, FEATURES, OPTIMIZER_LABELS, OPTIMIZER_NAMES, type ActivationName, type FeatureName, type LrSchedule, type OptimizerName } from '../engine/index.ts'
import { cn, num, pct } from '../lib/format.ts'
import type { FromNNWorker, NNData, NNSettings, NNSnapshot, StructuralSettings, ToNNWorker } from '../workers/nnProtocol.ts'
import { NetworkDiagram, type HoveredNode } from './nn/NetworkDiagram.tsx'

const LRS = [0.0001, 0.0003, 0.001, 0.003, 0.01, 0.03, 0.1, 0.3, 1] as const
const BATCHES = [1, 2, 4, 8, 16, 32, 64, 128] as const
const L2S = [0, 1e-5, 1e-4, 1e-3, 3e-3, 1e-2, 3e-2, 0.1] as const
const SPEEDS = [
  { value: '10', label: 'Slow' },
  { value: '60', label: '60/s' },
  { value: '0', label: 'Max' },
] as const

type ScheduleKind = LrSchedule['kind']
const scheduleFor = (kind: ScheduleKind): LrSchedule =>
  kind === 'step' ? { kind: 'step', stepSize: 100, gamma: 0.5 } : kind === 'cosine' ? { kind: 'cosine', period: 200, minFactor: 0.05 } : { kind: 'constant' }

const DEFAULTS: NNSettings = {
  dataset: 'spiral',
  noise: 0.1,
  nPoints: 400,
  trainRatio: 0.7,
  classes: 2,
  dataSeed: 1,
  features: ['x1', 'x2'],
  hidden: [8, 8, 6],
  activation: 'tanh',
  optimizer: 'adam',
  lr: 0.01,
  batchSize: 16,
  l2: 0,
  dropout: 0,
  schedule: { kind: 'constant' },
  seed: 1,
}

export default function NeuralNetPage() {
  const [settings, setSettings] = useState<NNSettings>(DEFAULTS)
  const [snap, setSnap] = useState<NNSnapshot | null>(null)
  const [data, setData] = useState<NNData | null>(null)
  const [running, setRunning] = useState(false)
  const [speed, setSpeed] = useState<string>('60')
  const [showTest, setShowTest] = useState(true)
  const [discretize, setDiscretize] = useState(false)
  const [logLoss, setLogLoss] = useState(true)
  const [hovered, setHovered] = useState<HoveredNode | null>(null)
  const workerRef = useRef<Worker | null>(null)

  const send = useCallback((msg: ToNNWorker) => workerRef.current?.postMessage(msg), [])

  useEffect(() => {
    const worker = new Worker(new URL('../workers/nn.worker.ts', import.meta.url), { type: 'module' })
    workerRef.current = worker
    worker.onmessage = (e: MessageEvent<FromNNWorker>) => {
      if (e.data.type === 'data') setData(e.data)
      else setSnap(e.data)
    }
    return () => {
      worker.terminate()
      workerRef.current = null
    }
  }, [])

  // Structural settings rebuild the dataset / model in the worker.
  // Live hyper-parameters are sent first; the worker merges them into every init.
  const { lr, batchSize, l2, schedule, ...structural } = settings
  useEffect(() => {
    send({ type: 'update', hyper: { lr, batchSize, l2, schedule } })
  }, [lr, batchSize, l2, schedule, send])
  const structuralKey = JSON.stringify(structural)
  useEffect(() => {
    send({ type: 'init', settings: JSON.parse(structuralKey) as StructuralSettings })
  }, [structuralKey, send])
  useEffect(() => {
    send({ type: 'speed', epochsPerSecond: Number(speed) })
  }, [speed, send])

  const set = <K extends keyof NNSettings>(key: K, value: NNSettings[K]) => setSettings((s) => ({ ...s, [key]: value }))

  const togglePlay = () => {
    send({ type: running ? 'pause' : 'play' })
    setRunning(!running)
  }
  const step = () => {
    send({ type: 'step' })
    setRunning(false)
  }
  const reset = () => send({ type: 'reset' })

  // Keyboard: space toggles training when focus is not in a form control.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (e.code !== 'Space' || ['INPUT', 'SELECT', 'BUTTON', 'TEXTAREA'].includes(t.tagName)) return
      e.preventDefault()
      togglePlay()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const featureLabels = useMemo(() => settings.features.map((f) => FEATURES.find((x) => x.id === f)!.label), [settings.features])
  const numClasses = data?.numClasses ?? 2
  const params = snap ? snap.layerSizes.slice(1).reduce((s, n, i) => s + n * (snap.layerSizes[i] + 1), 0) : 0

  const hoverValues = useMemo(() => (hovered && snap ? { data: snap.nodes, offset: hovered.index * snap.thumbRes ** 2, res: snap.thumbRes } : null), [hovered, snap])

  const lossSeries = useMemo(
    () =>
      snap
        ? [
            { label: 'train loss', color: '#38bdf8', y: snap.history.trainLoss, x: snap.history.epoch },
            { label: 'test loss', color: '#f59e0b', y: snap.history.testLoss, x: snap.history.epoch, dashed: true },
          ]
        : [],
    [snap],
  )
  const accSeries = useMemo(
    () =>
      snap
        ? [
            { label: 'train acc', color: '#38bdf8', y: snap.history.trainAcc, x: snap.history.epoch },
            { label: 'test acc', color: '#f59e0b', y: snap.history.testAcc, x: snap.history.epoch, dashed: true },
          ]
        : [],
    [snap],
  )

  const setHidden = (hidden: number[]) => set('hidden', hidden)

  return (
    <div className="space-y-5">
      <PageIntro
        title="Neural network playground"
        lead="A multilayer perceptron trained live by a from-scratch autograd engine running in a Web Worker. Pick a dataset, shape the network, choose an optimizer, and watch the decision boundary and every neuron evolve. Hover a neuron to see what it has learned."
      />

      {/* Playback bar */}
      <div className="card flex flex-wrap items-center gap-3 p-3">
        <Button onClick={reset} title="Reset weights">
          <RotateCcw size={16} />
        </Button>
        <button
          type="button"
          onClick={togglePlay}
          aria-label={running ? 'Pause training' : 'Start training'}
          data-testid="play"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/30 transition hover:bg-cyan-300"
        >
          {running ? <Pause size={22} /> : <Play size={22} className="ml-0.5" />}
        </button>
        <Button onClick={step} title="Train one epoch">
          <StepForward size={16} />
        </Button>
        <div className="ml-1">
          <div className="eyebrow">Epoch</div>
          <div className="font-mono text-2xl font-semibold tabular-nums" data-testid="epoch">
            {(snap?.epoch ?? 0).toLocaleString()}
          </div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <div className="w-44">
            <Segmented label="Training speed" size="sm" value={speed} options={SPEEDS} onChange={setSpeed} />
          </div>
          <span className="font-mono text-xs text-slate-500">{snap && running ? `${Math.round(snap.epochsPerSec)} epochs/s` : 'paused'}</span>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[290px_minmax(0,1fr)_400px]">
        {/* Controls */}
        <div className="space-y-4">
          <Card title="Data">
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-1.5">
                {DATASET_2D.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    aria-pressed={settings.dataset === d.id}
                    onClick={() => set('dataset', d.id)}
                    className={cn(
                      'rounded-lg border px-2 py-1.5 text-xs font-medium transition',
                      settings.dataset === d.id ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-200' : 'border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200',
                    )}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              {(settings.dataset === 'spiral' || settings.dataset === 'blobs') && (
                <Slider label="Classes" value={settings.classes} min={2} max={5} onChange={(v) => set('classes', v)} />
              )}
              <Slider label="Noise" value={settings.noise} min={0} max={1} step={0.05} onChange={(v) => set('noise', v)} format={(v) => v.toFixed(2)} />
              <Slider label="Points" value={settings.nPoints} min={100} max={1000} step={50} onChange={(v) => set('nPoints', v)} />
              <Slider label="Train split" value={settings.trainRatio} min={0.1} max={0.9} step={0.05} onChange={(v) => set('trainRatio', v)} format={(v) => pct(v, 0)} />
              <Button onClick={() => set('dataSeed', settings.dataSeed + 1)} className="w-full">
                <Shuffle size={14} /> New sample
              </Button>
            </div>
          </Card>

          <Card title="Input features">
            <div className="flex flex-wrap gap-1.5">
              {FEATURES.map((f) => {
                const on = settings.features.includes(f.id)
                return (
                  <button
                    key={f.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      const next: FeatureName[] = on ? settings.features.filter((x) => x !== f.id) : FEATURES.map((x) => x.id).filter((id) => id === f.id || settings.features.includes(id))
                      if (next.length) set('features', next)
                    }}
                    className={cn(
                      'rounded-md border px-2 py-1 font-mono text-xs transition',
                      on ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-200' : 'border-white/10 text-slate-500 hover:text-slate-300',
                    )}
                  >
                    {f.label}
                  </button>
                )
              })}
            </div>
          </Card>

          <Card title="Network">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Hidden layers: {settings.hidden.length}</span>
                <span className="flex gap-1">
                  <Button variant="ghost" className="px-2 py-1" title="Remove layer" disabled={settings.hidden.length === 0} onClick={() => setHidden(settings.hidden.slice(0, -1))}>
                    <Minus size={14} />
                  </Button>
                  <Button variant="ghost" className="px-2 py-1" title="Add layer" disabled={settings.hidden.length >= 6} onClick={() => setHidden([...settings.hidden, 4])}>
                    <Plus size={14} />
                  </Button>
                </span>
              </div>
              {settings.hidden.map((n, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-slate-950/50 px-2 py-1 text-xs">
                  <span className="text-slate-400">Layer {i + 1}</span>
                  <span className="flex items-center gap-1">
                    <Button variant="ghost" className="px-1.5 py-0.5" title={`Fewer neurons in layer ${i + 1}`} disabled={n <= 1} onClick={() => setHidden(settings.hidden.map((v, j) => (j === i ? v - 1 : v)))}>
                      <Minus size={12} />
                    </Button>
                    <span className="w-5 text-center font-mono text-slate-200">{n}</span>
                    <Button variant="ghost" className="px-1.5 py-0.5" title={`More neurons in layer ${i + 1}`} disabled={n >= 12} onClick={() => setHidden(settings.hidden.map((v, j) => (j === i ? v + 1 : v)))}>
                      <Plus size={12} />
                    </Button>
                  </span>
                </div>
              ))}
              <Select<ActivationName>
                label="Activation"
                value={settings.activation}
                onChange={(v) => set('activation', v)}
                options={[
                  { value: 'tanh', label: 'tanh' },
                  { value: 'relu', label: 'ReLU' },
                  { value: 'leakyRelu', label: 'Leaky ReLU' },
                  { value: 'sigmoid', label: 'Sigmoid' },
                  { value: 'linear', label: 'Linear (none)' },
                ]}
              />
              <Slider label="Dropout" value={settings.dropout} min={0} max={0.5} step={0.05} onChange={(v) => set('dropout', v)} format={(v) => v.toFixed(2)} />
            </div>
          </Card>

          <Card title="Optimization">
            <div className="space-y-3">
              <Select<OptimizerName> label="Optimizer" value={settings.optimizer} onChange={(v) => set('optimizer', v)} options={OPTIMIZER_NAMES.map((o) => ({ value: o, label: OPTIMIZER_LABELS[o] }))} />
              <StepSlider label="Learning rate" values={LRS} value={settings.lr as (typeof LRS)[number]} onChange={(v) => set('lr', v)} />
              <StepSlider label="Batch size" values={BATCHES} value={settings.batchSize as (typeof BATCHES)[number]} onChange={(v) => set('batchSize', v)} />
              <StepSlider label="L2 weight decay λ" values={L2S} value={settings.l2 as (typeof L2S)[number]} onChange={(v) => set('l2', v)} />
              <Select<ScheduleKind>
                label="LR schedule"
                value={settings.schedule.kind}
                onChange={(v) => set('schedule', scheduleFor(v))}
                options={[
                  { value: 'constant', label: 'Constant' },
                  { value: 'step', label: 'Step (×0.5 every 100 epochs)' },
                  { value: 'cosine', label: 'Cosine (warm restarts, T = 200)' },
                ]}
              />
            </div>
          </Card>
        </div>

        {/* Network */}
        <Card
          title="Network"
          actions={<span className="text-xs text-slate-500">{params.toLocaleString()} parameters</span>}
          className="min-w-0"
        >
          <NetworkDiagram snap={snap} featureLabels={featureLabels} onHover={setHovered} />
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-0.5 w-5 bg-sky-400" /> positive weight
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-0.5 w-5 bg-amber-500" /> negative weight
            </span>
            <span>thickness ∝ |w| · thumbnails = activation over the input plane</span>
          </div>
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <h4 className="eyebrow">Loss (cross-entropy)</h4>
                <Toggle label={<span className="text-xs">log</span>} checked={logLoss} onChange={setLogLoss} />
              </div>
              <LineChart series={lossSeries} logY={logLoss} height={170} xLabel="epoch" ariaLabel="Training and test loss per epoch" formatY={(v) => (v < 0.01 ? v.toExponential(0) : v.toFixed(2))} />
            </div>
            <div>
              <h4 className="eyebrow mb-1">Accuracy</h4>
              <LineChart series={accSeries} yMin={0} yMax={1} height={170} xLabel="epoch" ariaLabel="Training and test accuracy per epoch" formatY={(v) => pct(v, 0)} />
            </div>
          </div>
        </Card>

        {/* Output */}
        <div className="space-y-4">
          <Card title={hovered ? hovered.label : 'Output: decision boundary'}>
            <DecisionPlot
              probs={snap?.output}
              res={snap?.outRes}
              numClasses={numClasses}
              train={data?.train}
              test={data?.test}
              showTest={showTest}
              discretize={discretize}
              values={hoverValues}
              maxSize={400}
              ariaLabel="Decision boundary of the network over the input plane with training and test points"
            />
            <div className="mt-3 flex flex-wrap gap-4">
              <Toggle label="Show test data" checked={showTest} onChange={setShowTest} />
              <Toggle label="Discretize output" checked={discretize} onChange={setDiscretize} />
            </div>
            <p className="mt-2 text-xs text-slate-500">Filled dots: training set · rings: test set.</p>
          </Card>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Train loss" value={num(snap?.trainLoss ?? NaN, 3)} />
            <Stat label="Test loss" value={num(snap?.testLoss ?? NaN, 3)} />
            <Stat label="Train acc" value={snap ? pct(snap.trainAcc) : '—'} accent="#38bdf8" />
            <Stat label="Test acc" value={snap ? pct(snap.testAcc) : '—'} accent="#f59e0b" />
            <Stat label="Learning rate" value={num(snap?.lr ?? settings.lr, 4)} sub={settings.schedule.kind} />
            <Stat label="Optimizer" value={OPTIMIZER_LABELS[settings.optimizer]} sub={`batch ${settings.batchSize}`} />
          </div>
        </div>
      </div>
    </div>
  )
}
