import "server-only";
import { COMPETENCIES, type Competency } from "@/lib/constants";
import { clamp, readinessForScore, verdictForScore } from "@/lib/interview";
import type { Evaluation, Report } from "@/lib/schemas";

function cleanList(items: string[], max: number): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const text = item.replace(/\s+/g, " ").trim();
    const key = text.toLowerCase();
    if (!text || seen.has(key)) continue;
    seen.add(key);
    result.push(text);
    if (result.length === max) break;
  }
  return result;
}

const competencyKey = (text: string) => text.toLowerCase().replace(/[^a-z]/g, "");

/**
 * Maps a model-written competency name onto our fixed list ("technical depth",
 * "Structure/STAR" …). Structured outputs don't enforce enums in this SDK, so
 * names are matched leniently instead of failing the whole request.
 */
export function matchCompetency(name: string): Competency | undefined {
  const key = competencyKey(name);
  if (!key) return undefined;
  return (
    COMPETENCIES.find((competency) => competencyKey(competency) === key) ??
    COMPETENCIES.find((competency) => competencyKey(competency).startsWith(key) || key.startsWith(competencyKey(competency)))
  );
}

export interface EvaluationDraft {
  score: number;
  strengths: string[];
  improvements: string[];
  idealAnswer: string;
  competency: Competency;
}

/** Clamps scores, enforces list sizes and derives the verdict from the score. */
export function normalizeEvaluation(draft: EvaluationDraft): Evaluation {
  const score = clamp(Math.round(draft.score), 0, 10);
  const strengths = cleanList(draft.strengths, 3);
  const improvements = cleanList(draft.improvements, 3);
  return {
    score,
    verdict: verdictForScore(score),
    strengths: strengths.length ? strengths : ["You engaged with the question and gave it a try."],
    improvements: improvements.length
      ? improvements
      : ["Add one more concrete example or detail to make the answer memorable."],
    idealAnswer: draft.idealAnswer.trim(),
    competency: draft.competency,
  };
}

export interface ReportDraft {
  overallScore: number;
  summary: string;
  topStrengths: string[];
  focusAreas: string[];
  nextSteps: string[];
  competencies: { name: string; score: number }[];
}

/** Ensures every competency appears once (in a fixed order) and readiness matches the score. */
export function normalizeReport(draft: ReportDraft): Report {
  const overallScore = clamp(Math.round(draft.overallScore), 0, 100);
  const competencies = COMPETENCIES.map((name) => {
    const match = draft.competencies.find((item) => matchCompetency(item.name) === name);
    const score = match ? match.score : overallScore / 10;
    return { name, score: Math.round(clamp(score, 0, 10) * 10) / 10 };
  });
  return {
    overallScore,
    readiness: readinessForScore(overallScore),
    summary: draft.summary.trim(),
    topStrengths: cleanList(draft.topStrengths, 5),
    focusAreas: cleanList(draft.focusAreas, 5),
    nextSteps: cleanList(draft.nextSteps, 6),
    competencies,
  };
}
