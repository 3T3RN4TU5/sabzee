import type { QuestionKind, Readiness, Verdict } from "./constants";
import type { HistoryItem, InterviewConfig, Turn } from "./schemas";

/**
 * Decides whether question `index` (0-based) should be technical or behavioral.
 * Shared by the client (labels, tips) and the server (prompting, demo bank),
 * so the interview mix is predictable for a given setup.
 */
export function questionKind(
  config: Pick<InterviewConfig, "role" | "type">,
  index: number,
): QuestionKind {
  if (config.role === "hr" || config.type === "behavioral") return "behavioral";
  if (config.type === "technical") return "technical";
  return index % 2 === 1 ? "behavioral" : "technical";
}

/** Verdicts are always derived from the score so badges and numbers never disagree. */
export function verdictForScore(score: number): Verdict {
  if (score >= 8) return "strong";
  if (score >= 6) return "good";
  if (score >= 4) return "needs_work";
  return "weak";
}

export function readinessForScore(overall: number): Readiness {
  if (overall >= 75) return "ready";
  if (overall >= 55) return "almost";
  return "not_yet";
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Average of per-question scores (skipped = 0) on a 0–100 scale. */
export function averageScore(scores: number[]): number {
  if (scores.length === 0) return 0;
  return Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10);
}

/** Completed turns in the shape the API expects as `history`. */
export function historyFromTurns(turns: Turn[]): HistoryItem[] {
  return turns
    .filter((turn) => turn.skipped || turn.evaluation)
    .map((turn) => ({
      question: turn.question,
      answer: turn.skipped ? "" : turn.answer,
      skipped: turn.skipped || undefined,
      score: turn.skipped ? 0 : turn.evaluation?.score,
      competency: turn.evaluation?.competency,
    }));
}

/**
 * Splits an interviewer turn into an optional short lead-in (acknowledging the
 * previous answer, on its own line) and the question itself.
 */
export function splitInterviewerTurn(text: string): { lead: string; question: string } {
  const parts = text
    .trim()
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length < 2 || parts[0].length > 160) return { lead: "", question: parts.join("\n") };
  return { lead: parts[0], question: parts.slice(1).join("\n") };
}

export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function scoreTone(score: number, max = 10): "great" | "good" | "fair" | "poor" {
  const ratio = score / max;
  if (ratio >= 0.8) return "great";
  if (ratio >= 0.6) return "good";
  if (ratio >= 0.4) return "fair";
  return "poor";
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}
