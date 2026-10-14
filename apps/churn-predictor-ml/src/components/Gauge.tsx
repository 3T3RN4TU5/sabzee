/** Semi-circular probability gauge with the decision threshold marked. */
const R = 80
const CX = 100
const CY = 96

const point = (p: number, r = R) => {
  const a = Math.PI * (1 - p)
  return [CX + r * Math.cos(a), CY - r * Math.sin(a)] as const
}

function arc(from: number, to: number): string {
  const [x0, y0] = point(from)
  const [x1, y1] = point(to)
  return `M ${x0} ${y0} A ${R} ${R} 0 ${to - from > 0.5 ? 1 : 0} 1 ${x1} ${y1}`
}

export function Gauge({ p, threshold }: { p: number; threshold: number }) {
  const high = Math.max(0.5, threshold)
  const [nx, ny] = point(p, R - 16)
  const [tx0, ty0] = point(threshold, R - 11)
  const [tx1, ty1] = point(threshold, R + 11)
  return (
    <svg viewBox="0 0 200 112" className="w-full max-w-[280px]" role="img" aria-label={`Churn probability ${(p * 100).toFixed(1)} percent`}>
      <path d={arc(0, 1)} stroke="rgb(255 255 255 / 0.06)" strokeWidth={14} fill="none" strokeLinecap="round" />
      <path d={arc(0.001, threshold)} stroke="#199e70" strokeOpacity={0.55} strokeWidth={14} fill="none" />
      <path d={arc(threshold, high)} stroke="#c98500" strokeOpacity={0.6} strokeWidth={14} fill="none" />
      <path d={arc(high, 0.999)} stroke="#e66767" strokeOpacity={0.6} strokeWidth={14} fill="none" />
      <line x1={tx0} y1={ty0} x2={tx1} y2={ty1} stroke="#f8fafc" strokeWidth={2} />
      <line x1={CX} y1={CY} x2={nx} y2={ny} stroke="#f8fafc" strokeWidth={3} strokeLinecap="round" style={{ transition: 'all 250ms ease-out' }} />
      <circle cx={CX} cy={CY} r={6} fill="#f8fafc" />
      <text x={CX - R} y={CY + 14} textAnchor="middle" className="fill-slate-500 text-[9px]">0%</text>
      <text x={CX + R} y={CY + 14} textAnchor="middle" className="fill-slate-500 text-[9px]">100%</text>
    </svg>
  )
}
