import { z } from "zod";
import {
  COMPETENCIES,
  INTERVIEW_TYPES,
  LEVELS,
  LIMITS,
  READINESS,
  ROLES,
  VERDICTS,
  type InterviewTypeId,
  type LevelId,
  type RoleId,
} from "./constants";

const roleIds = ROLES.map((role) => role.id) as [RoleId, ...RoleId[]];
const levelIds = LEVELS.map((level) => level.id) as [LevelId, ...LevelId[]];
const typeIds = INTERVIEW_TYPES.map((type) => type.id) as [InterviewTypeId, ...InterviewTypeId[]];

/* ----------------------------------------------------------------------------
 * Request schemas (validated on the server, built on the client)
 * ------------------------------------------------------------------------- */

export const InterviewConfigSchema = z.object({
  name: z
    .string()
    .trim()
    .max(LIMITS.name, "Please keep your name under 40 characters.")
    .default(""),
  role: z.enum(roleIds, { error: "Please choose a target role from the list." }),
  level: z.enum(levelIds, { error: "Please choose an experience level." }),
  type: z.enum(typeIds, { error: "Please choose an interview type." }),
  questionCount: z.union([z.literal(3), z.literal(5), z.literal(7)], {
    error: "An interview can have 3, 5 or 7 questions.",
  }),
  jobDescription: z
    .string()
    .trim()
    .max(LIMITS.jobDescription, "The job description is too long — paste up to 6,000 characters.")
    .default(""),
});

export const HistoryItemSchema = z.object({
  question: z
    .string()
    .trim()
    .min(1, "Each previous question must have text.")
    .max(LIMITS.question, "A previous question is unexpectedly long."),
  answer: z.string().max(LIMITS.answer, "Answers are limited to 4,000 characters."),
  score: z.number().int().min(0).max(10).optional(),
  skipped: z.boolean().optional(),
  competency: z.enum(COMPETENCIES).optional(),
});

const HistorySchema = z
  .array(HistoryItemSchema)
  .max(LIMITS.history, "An interview can include at most 10 previous questions.");

export const QuestionRequestSchema = z.object({
  config: InterviewConfigSchema,
  history: HistorySchema.default([]),
});

export const EvaluateRequestSchema = z.object({
  config: InterviewConfigSchema,
  question: z
    .string()
    .trim()
    .min(1, "The question is missing.")
    .max(LIMITS.question, "The question is unexpectedly long."),
  answer: z
    .string()
    .trim()
    .min(1, "Please write or dictate an answer before submitting.")
    .max(LIMITS.answer, "Your answer is too long — keep it under 4,000 characters."),
  questionIndex: z.number().int().min(0).max(LIMITS.history - 1),
  history: HistorySchema.default([]),
});

export const ReportRequestSchema = z.object({
  config: InterviewConfigSchema,
  history: HistorySchema.min(1, "Answer at least one question before generating a report."),
});

/* ----------------------------------------------------------------------------
 * Response schemas (what the API guarantees, re-validated on the client)
 * ------------------------------------------------------------------------- */

export const EvaluationSchema = z.object({
  score: z.number().int().min(0).max(10),
  verdict: z.enum(VERDICTS),
  strengths: z.array(z.string().min(1)).min(1).max(3),
  improvements: z.array(z.string().min(1)).min(1).max(3),
  idealAnswer: z.string().min(1),
  competency: z.enum(COMPETENCIES),
});

export const CompetencyScoreSchema = z.object({
  name: z.enum(COMPETENCIES),
  score: z.number().min(0).max(10),
});

export const ReportSchema = z.object({
  overallScore: z.number().int().min(0).max(100),
  readiness: z.enum(READINESS),
  summary: z.string().min(1),
  topStrengths: z.array(z.string().min(1)).max(5),
  focusAreas: z.array(z.string().min(1)).max(5),
  nextSteps: z.array(z.string().min(1)).max(6),
  competencies: z.array(CompetencyScoreSchema).length(COMPETENCIES.length),
});

export const StatusSchema = z.object({
  mode: z.enum(["live", "demo"]),
  model: z.string().nullable(),
});

/* ----------------------------------------------------------------------------
 * Client-side persistence
 * ------------------------------------------------------------------------- */

export const TurnSchema = z.object({
  question: z.string(),
  kind: z.enum(["technical", "behavioral"]),
  answer: z.string(),
  skipped: z.boolean(),
  durationSec: z.number().int().nonnegative(),
  evaluation: EvaluationSchema.nullable(),
});

export const SessionStageSchema = z.enum(["question", "answer", "evaluate", "feedback", "complete"]);

const SessionShape = z.object({
  id: z.string().min(1),
  createdAt: z.number(),
  completedAt: z.number().nullable(),
  config: InterviewConfigSchema,
  stage: SessionStageSchema,
  turns: z.array(TurnSchema).max(LIMITS.history),
  report: ReportSchema.nullable(),
  reportMode: z.enum(["live", "demo"]).nullable(),
});

/** Rejects stored sessions the interview flow could never produce (e.g. hand-edited storage). */
function isConsistentSession({ stage, turns, config }: z.infer<typeof SessionShape>): boolean {
  const done = (turn: z.infer<typeof TurnSchema>) => turn.skipped || turn.evaluation !== null;
  const last = turns.at(-1);
  if (turns.length > config.questionCount || !turns.slice(0, -1).every(done)) return false;
  switch (stage) {
    case "question":
      return turns.length < config.questionCount && (!last || done(last));
    case "answer":
    case "evaluate":
      return last !== undefined && !done(last);
    case "feedback":
      return last !== undefined && !last.skipped && last.evaluation !== null;
    case "complete":
      return turns.length === config.questionCount && turns.every(done);
  }
}

export const SessionSchema = SessionShape.refine(isConsistentSession, "This interview session is inconsistent.");

export type InterviewConfig = z.infer<typeof InterviewConfigSchema>;
export type HistoryItem = z.infer<typeof HistoryItemSchema>;
export type QuestionRequest = z.infer<typeof QuestionRequestSchema>;
export type EvaluateRequest = z.infer<typeof EvaluateRequestSchema>;
export type ReportRequest = z.infer<typeof ReportRequestSchema>;
export type Evaluation = z.infer<typeof EvaluationSchema>;
export type CompetencyScore = z.infer<typeof CompetencyScoreSchema>;
export type Report = z.infer<typeof ReportSchema>;
export type Status = z.infer<typeof StatusSchema>;
export type Turn = z.infer<typeof TurnSchema>;
export type SessionStage = z.infer<typeof SessionStageSchema>;
export type Session = z.infer<typeof SessionSchema>;
