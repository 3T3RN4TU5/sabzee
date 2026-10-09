import type { CompetencyScore } from "@/lib/schemas";

/** Single-hue horizontal meters with direct value labels (magnitude, 0–10). */
export function CompetencyBars({ competencies }: { competencies: CompetencyScore[] }) {
  return (
    <ul className="space-y-4">
      {competencies.map((competency, index) => (
        <li key={competency.name}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-zinc-200">{competency.name}</span>
            <span className="font-medium text-white tabular-nums">
              {competency.score.toFixed(1)}
              <span className="text-xs font-normal text-zinc-500"> / 10</span>
            </span>
          </div>
          <div
            role="meter"
            aria-label={competency.name}
            aria-valuemin={0}
            aria-valuemax={10}
            aria-valuenow={competency.score}
            className="mt-2 h-2 overflow-hidden rounded bg-white/[0.07]"
          >
            <div
              className="h-full origin-left animate-bar-grow rounded bg-violet-400"
              style={{ width: `${Math.max(competency.score * 10, 1.5)}%`, animationDelay: `${index * 80}ms` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
