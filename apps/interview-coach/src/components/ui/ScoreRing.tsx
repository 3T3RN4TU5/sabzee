import type { CSSProperties } from "react";
import { scoreTone } from "@/lib/interview";

const TONE_STROKE = {
  great: "stroke-emerald-400",
  good: "stroke-sky-400",
  fair: "stroke-amber-400",
  poor: "stroke-rose-400",
} as const;

interface ScoreRingProps {
  score: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}

/** Circular score gauge; the fill animates in with CSS (disabled for reduced motion). */
export function ScoreRing({ score, max = 10, size = 112, strokeWidth = 9, label }: ScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = Math.min(1, Math.max(0, score / max));
  const offset = circumference * (1 - ratio);
  const tone = scoreTone(score, max);

  return (
    <div
      className="relative inline-grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label ? `${label}: ` : ""}${score} out of ${max}`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-white/10"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`${TONE_STROKE[tone]} animate-ring-fill`}
          style={{ "--ring-circumference": circumference } as CSSProperties}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center" aria-hidden>
        <div>
          <span className="block font-semibold tabular-nums leading-none text-white" style={{ fontSize: size * 0.3 }}>
            {score}
          </span>
          <span className="mt-1 block text-xs text-zinc-400">/ {max}</span>
        </div>
      </div>
    </div>
  );
}
