"use client";

import { Timer } from "lucide-react";
import { useEffect, useState } from "react";
import { formatDuration } from "@/lib/interview";

const SOFT_LIMIT_SECONDS = 180;

/**
 * Per-question stopwatch. `initialSeconds` is the time already spent on the
 * question (before a refresh or an "Edit answer"); remount it via `key` for a new question.
 */
export function QuestionTimer({ initialSeconds = 0 }: { initialSeconds?: number }) {
  const [elapsed, setElapsed] = useState(initialSeconds);

  useEffect(() => {
    const startedAt = Date.now();
    const id = window.setInterval(() => setElapsed(initialSeconds + Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => window.clearInterval(id);
  }, [initialSeconds]);

  const over = elapsed >= SOFT_LIMIT_SECONDS;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium tabular-nums ring-1 ring-inset ${
        over ? "bg-amber-400/10 text-amber-200 ring-amber-400/30" : "bg-white/5 text-zinc-300 ring-white/10"
      }`}
      title={over ? "Most answers should take 1–3 minutes" : "Time on this question"}
    >
      <Timer className="size-3.5" aria-hidden />
      <span className="sr-only">Time on this question: </span>
      {formatDuration(elapsed)}
    </span>
  );
}
