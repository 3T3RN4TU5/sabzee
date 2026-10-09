import type { ReactNode } from "react";
import { READINESS_LABEL, VERDICT_LABEL, type Readiness, type Verdict } from "@/lib/constants";

const VERDICT_STYLE: Record<Verdict, string> = {
  strong: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/30",
  good: "bg-sky-400/10 text-sky-300 ring-sky-400/30",
  needs_work: "bg-amber-400/10 text-amber-300 ring-amber-400/30",
  weak: "bg-rose-400/10 text-rose-300 ring-rose-400/30",
};

const READINESS_STYLE: Record<Readiness, string> = {
  ready: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/30",
  almost: "bg-amber-400/10 text-amber-300 ring-amber-400/30",
  not_yet: "bg-rose-400/10 text-rose-300 ring-rose-400/30",
};

const base = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset";

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  return <span className={`${base} ${VERDICT_STYLE[verdict]}`}>{VERDICT_LABEL[verdict]}</span>;
}

export function ReadinessBadge({ readiness, large = false }: { readiness: Readiness; large?: boolean }) {
  return (
    <span className={`${base} ${READINESS_STYLE[readiness]} ${large ? "px-3.5 py-1.5 text-sm" : ""}`}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {READINESS_LABEL[readiness]}
    </span>
  );
}

export function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-xs text-zinc-300 ring-1 ring-inset ring-white/10">
      {children}
    </span>
  );
}
