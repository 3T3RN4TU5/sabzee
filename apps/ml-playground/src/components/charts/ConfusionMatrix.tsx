import { classColor } from '../../lib/colors.ts'

export function ConfusionMatrix({ matrix, labels }: { matrix: number[][]; labels: string[] }) {
  const max = Math.max(1, ...matrix.flat())
  const k = matrix.length
  return (
    <div className="overflow-x-auto">
      <table className="mx-auto border-separate border-spacing-1 text-xs">
        <thead>
          <tr>
            <th />
            <th colSpan={k} className="pb-1 text-center font-normal text-slate-400">
              predicted
            </th>
          </tr>
          <tr>
            <th className="pr-1 text-right font-normal text-slate-400">actual</th>
            {labels.map((l, j) => (
              <th key={j} className="px-1 font-mono font-medium" style={{ color: classColor(j) }}>
                {l}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => (
            <tr key={i}>
              <th className="pr-1 text-right font-mono font-medium" style={{ color: classColor(i) }}>
                {labels[i]}
              </th>
              {row.map((v, j) => {
                const a = v / max
                return (
                  <td
                    key={j}
                    className="h-9 min-w-9 rounded-md text-center font-mono tabular-nums"
                    style={{
                      background: i === j ? `rgba(34,211,238,${0.08 + a * 0.55})` : `rgba(244,63,94,${v ? 0.1 + a * 0.5 : 0.03})`,
                      color: a > 0.5 ? '#f8fafc' : '#cbd5e1',
                    }}
                  >
                    {v}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
