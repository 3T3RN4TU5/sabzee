/** Bars (e.g. explained variance per component) with an optional cumulative line. */
export function BarChart({ values, labels, cumulative, height = 170, color = '#22d3ee', ariaLabel }: { values: number[]; labels: string[]; cumulative?: boolean; height?: number; color?: string; ariaLabel: string }) {
  const W = 100
  const H = 100
  const n = values.length
  const max = cumulative ? 1 : Math.max(...values, 1e-9)
  const bw = W / Math.max(n, 1)
  let acc = 0
  const cum = values.map((v) => (acc += v))
  return (
    <figure aria-label={ariaLabel} className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ height }} className="w-full overflow-visible">
        {[0.25, 0.5, 0.75, 1].map((t) => (
          <line key={t} x1={0} x2={W} y1={H - t * H} y2={H - t * H} stroke="rgba(255,255,255,0.06)" strokeWidth={0.4} vectorEffect="non-scaling-stroke" />
        ))}
        {values.map((v, i) => (
          <rect key={i} x={i * bw + bw * 0.15} width={bw * 0.7} y={H - (v / max) * H} height={(v / max) * H} rx={0.6} fill={color} opacity={0.8}>
            <title>{`${labels[i]}: ${(v * 100).toFixed(1)}%`}</title>
          </rect>
        ))}
        {cumulative && (
          <polyline
            fill="none"
            stroke="#f59e0b"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
            points={cum.map((c, i) => `${i * bw + bw / 2},${H - c * H}`).join(' ')}
          />
        )}
      </svg>
      <div className="mt-1 flex text-[10px] text-slate-500">
        {labels.map((l) => (
          <span key={l} className="flex-1 truncate text-center font-mono">
            {l}
          </span>
        ))}
      </div>
    </figure>
  )
}
