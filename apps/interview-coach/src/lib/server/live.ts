import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { COMPETENCIES } from "@/lib/constants";
import { questionKind } from "@/lib/interview";
import type { EvaluateRequest, Evaluation, HistoryItem, InterviewConfig, Report, ReportRequest } from "@/lib/schemas";
import { EmptyOutputError, FALLBACK_BETA, getClient, MODEL, RefusalError } from "./anthropic";
import { modeHeaders } from "./http";
import { matchCompetency, normalizeEvaluation, normalizeReport } from "./normalize";
import {
  buildEvaluateMessages,
  buildQuestionMessages,
  buildReportMessages,
  EVALUATOR_SYSTEM,
  INTERVIEWER_SYSTEM,
  REPORT_SYSTEM,
} from "./prompts";

/*
 * Model-facing schemas are intentionally loose (no numeric bounds, array
 * lengths or enums — the SDK's schema transform only passes enums through as
 * descriptions, so they aren't enforced anyway). normalize.ts clamps scores,
 * trims lists, matches competency names and derives the verdict and readiness
 * from the score, so a slightly off value never fails a request.
 */
const competencyHint = `One of: ${COMPETENCIES.join(", ")}`;

const EvaluationOutput = z.object({
  score: z.number().describe("Integer score from 0 to 10"),
  strengths: z.array(z.string()).describe("1 to 3 specific strengths"),
  improvements: z.array(z.string()).describe("1 to 3 specific, actionable improvements"),
  idealAnswer: z.string().describe("Concise first-person model answer, roughly 120-200 words"),
  competency: z.string().describe(competencyHint),
});

const ReportOutput = z.object({
  overallScore: z.number().describe("Integer score from 0 to 100"),
  summary: z.string(),
  topStrengths: z.array(z.string()).describe("2 to 4 items"),
  focusAreas: z.array(z.string()).describe("2 to 4 items"),
  nextSteps: z.array(z.string()).describe("3 to 5 items"),
  competencies: z
    .array(z.object({ name: z.string().describe(competencyHint), score: z.number().describe("0 to 10") }))
    .describe("One entry for every competency"),
});

type StreamEvent = Anthropic.Beta.Messages.BetaRawMessageStreamEvent;

async function* textDeltas(stream: AsyncIterable<StreamEvent>): AsyncGenerator<string> {
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      yield event.delta.text;
    }
  }
}

/**
 * Streams the next question as text/plain. We wait for the first text token
 * before answering so that auth/rate-limit/refusal failures still become
 * proper JSON error responses with the right status code.
 */
export async function streamLiveQuestion(
  config: InterviewConfig,
  history: HistoryItem[],
  signal: AbortSignal,
): Promise<Response> {
  const stream = getClient().beta.messages.stream(
    {
      model: MODEL,
      max_tokens: 8000,
      system: INTERVIEWER_SYSTEM,
      messages: buildQuestionMessages(config, history),
      output_config: { effort: "low" },
      betas: [FALLBACK_BETA],
      fallbacks: "default",
    },
    { signal },
  );
  const deltas = textDeltas(stream);

  const first = await deltas.next();
  if (first.done) {
    const final = await stream.finalMessage();
    if (final.stop_reason === "refusal") throw new RefusalError();
    throw new EmptyOutputError();
  }

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(first.value));
    },
    async pull(controller) {
      try {
        const next = await deltas.next();
        if (!next.done) {
          controller.enqueue(encoder.encode(next.value));
          return;
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") controller.error(new RefusalError());
        else controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
    cancel() {
      // The browser went away (navigation, abort): stop paying for tokens.
      stream.abort();
    },
  });

  return new Response(body, {
    headers: {
      ...modeHeaders("live"),
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function evaluateLive(request: EvaluateRequest, signal: AbortSignal): Promise<Evaluation> {
  const response = await getClient().beta.messages.parse(
    {
      model: MODEL,
      max_tokens: 16000,
      system: EVALUATOR_SYSTEM,
      messages: buildEvaluateMessages(request),
      output_config: { effort: "medium", format: betaZodOutputFormat(EvaluationOutput) },
      betas: [FALLBACK_BETA],
      fallbacks: "default",
    },
    { signal },
  );
  if (response.stop_reason === "refusal") throw new RefusalError();
  const output = response.parsed_output;
  if (!output || !output.idealAnswer.trim()) throw new EmptyOutputError();
  const fallback = questionKind(request.config, request.questionIndex) === "technical" ? "Technical depth" : "Structure / STAR";
  return normalizeEvaluation({ ...output, competency: matchCompetency(output.competency) ?? fallback });
}

export async function reportLive(request: ReportRequest, signal: AbortSignal): Promise<Report> {
  const response = await getClient().beta.messages.parse(
    {
      model: MODEL,
      max_tokens: 16000,
      system: REPORT_SYSTEM,
      messages: buildReportMessages(request),
      output_config: { effort: "medium", format: betaZodOutputFormat(ReportOutput) },
      betas: [FALLBACK_BETA],
      fallbacks: "default",
    },
    { signal },
  );
  if (response.stop_reason === "refusal") throw new RefusalError();
  const output = response.parsed_output;
  if (!output || !output.summary.trim()) throw new EmptyOutputError();
  return normalizeReport(output);
}
