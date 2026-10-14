import { useEffect, useMemo, useRef, useState } from 'react'
import { LineChart } from '../../components/charts/LineChart.tsx'
import { Tex } from '../../components/Tex.tsx'
import { Card, Slider, StepSlider } from '../../components/ui/controls.tsx'
import { fitPolynomial1D, makeRegression1D, meanSquaredError, predictPolynomial1D, trueRegressionFn } from '../../engine/index.ts'
import { setupCanvas } from '../../lib/canvas.ts'
import { num } from '../../lib/format.ts'
import { useElementWidth } from '../../lib/hooks.ts'

const MAX_DEGREE = 15
const ALPHAS = [0, 1e-6, 1e-4, 1e-3, 1e-2, 0.1, 1] as const
const CURVE = Float64Array.from({ length: 241 }, (_, i) => -1 + i / 120)

/** Polynomial regression on 1-D data: train vs test error across degrees. */
export function BiasVariancePanel() {
  const [degree, setDegree] = useState(3)
  const [alpha, setAlpha] = useState<(typeof ALPHAS)[number]>(0)
  const [nTrain, setNTrain] = useState(20)
  const [noise, setNoise] = useState(0.2)
  const train = useMemo(() => makeRegression1D(nTrain, noise, 11), [nTrain, noise])
  const test = useMemo(() => makeRegression1D(400, noise, 12), [noise])

  const curves = useMemo(() => {
    const tr: number[] = []
    const te: number[] = []
    for (let d = 0; d <= MAX_DEGREE; d++) {
      const m = fitPolynomial1D(train.x, train.y, d, alpha)
      tr.push(meanSquaredError(predictPolynomial1D(m, train.x), train.y))
      te.push(meanSquaredError(predictPolynomial1D(m, test.x), test.y))
    }
    return { tr, te }
  }, [train, test, alpha])

  const model = useMemo(() => fitPolynomial1D(train.x, train.y, degree, alpha), [train, degree, alpha])
  const fit = useMemo(() => predictPolynomial1D(model, CURVE), [model])

  const [wrapRef, width] = useElementWidth<HTMLDivElement>()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const height = 280
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || width <= 0) return
    const ctx = setupCanvas(canvas, width, height)
    ctx.fillStyle = '#0b1120'
    ctx.fillRect(0, 0, width, height)
    const X = (x: number) => ((x + 1) / 2) * width
    const Y = (y: number) => height / 2 - y * (height / 3.2)
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'
    ctx.beginPath()
    ctx.moveTo(0, Y(0))
    ctx.lineTo(width, Y(0))
    ctx.stroke()
    ctx.fillStyle = 'rgba(148,163,184,0.25)'
    for (let i = 0; i < test.x.length; i++) {
      ctx.beginPath()
      ctx.arc(X(test.x[i]), Y(test.y[i]), 1.6, 0, Math.PI * 2)
      ctx.fill()
    }
    // True function.
    ctx.strokeStyle = 'rgba(226,232,240,0.6)'
    ctx.setLineDash([5, 5])
    ctx.lineWidth = 1.5
    ctx.beginPath()
    CURVE.forEach((x, i) => (i ? ctx.lineTo(X(x), Y(trueRegressionFn(x))) : ctx.moveTo(X(x), Y(trueRegressionFn(x)))))
    ctx.stroke()
    ctx.setLineDash([])
    // Fitted polynomial.
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, 0, width, height)
    ctx.clip()
    ctx.strokeStyle = '#22d3ee'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    CURVE.forEach((x, i) => (i ? ctx.lineTo(X(x), Y(fit[i])) : ctx.moveTo(X(x), Y(fit[i]))))
    ctx.stroke()
    ctx.restore()
    for (let i = 0; i < train.x.length; i++) {
      ctx.beginPath()
      ctx.arc(X(train.x[i]), Y(train.y[i]), 4.5, 0, Math.PI * 2)
      ctx.fillStyle = '#f59e0b'
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 1.2
      ctx.stroke()
    }
  }, [width, train, test, fit])

  const series = useMemo(
    () => [
      { label: 'train MSE', color: '#38bdf8', y: curves.tr },
      // Clamp the exploding high-degree errors so the interesting range stays readable.
      { label: 'test MSE', color: '#f59e0b', y: curves.te.map((v) => Math.min(v, 2)), dashed: true },
    ],
    [curves],
  )

  return (
    <Card title="Bias–variance trade-off · polynomial ridge regression">
      <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          <Slider label="Polynomial degree" value={degree} min={0} max={MAX_DEGREE} onChange={setDegree} />
          <StepSlider label="Ridge α" values={ALPHAS} value={alpha} onChange={setAlpha} />
          <Slider label="Training points" value={nTrain} min={8} max={100} onChange={setNTrain} />
          <Slider label="Noise σ" value={noise} min={0.05} max={0.5} step={0.05} onChange={setNoise} format={(v) => v.toFixed(2)} />
          <p className="text-xs leading-relaxed text-slate-500">
            Fit by Householder QR on <Tex>{'[x, x^2, \\dots, x^d]'}</Tex>. Low degree: high bias. High degree with few points: high variance, the curve chases the noise. Ridge
            shrinkage tames it.
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-slate-950/60 p-2">
              <div className="text-slate-500">train MSE</div>
              <div className="font-mono text-sky-300">{num(curves.tr[degree], 4)}</div>
            </div>
            <div className="rounded-lg bg-slate-950/60 p-2">
              <div className="text-slate-500">test MSE</div>
              <div className="font-mono text-amber-300">{num(curves.te[degree], 4)}</div>
            </div>
          </div>
        </div>
        <div ref={wrapRef} className="min-w-0">
          <canvas ref={canvasRef} role="img" aria-label="Training points, the true function and the fitted polynomial" className="block rounded-xl ring-1 ring-white/10" />
          <p className="mt-1 text-xs text-slate-500">orange: training points · grey: test sample · dashed: true function · cyan: fit</p>
        </div>
        <div className="min-w-0">
          <LineChart series={series} logY height={280} markerX={degree} xLabel="polynomial degree" formatY={(v) => num(v, 3)} ariaLabel="Train and test mean squared error versus polynomial degree" />
        </div>
      </div>
    </Card>
  )
}
