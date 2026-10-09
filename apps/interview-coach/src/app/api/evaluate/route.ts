import { EvaluateRequestSchema } from "@/lib/schemas";
import { aiErrorResponse, isLiveMode } from "@/lib/server/anthropic";
import { demoEvaluate } from "@/lib/server/demo/engine";
import { modeHeaders, parseJsonBody } from "@/lib/server/http";
import { evaluateLive } from "@/lib/server/live";
import { rateLimit } from "@/lib/server/rate-limit";

// Runs on the default Node.js runtime; allow up to 60s for Claude responses.
export const maxDuration = 60;

/** Scores a single answer and returns structured feedback. */
export async function POST(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const body = await parseJsonBody(request, EvaluateRequestSchema);
  if (!body.ok) return body.response;
  const data = body.data;

  if (!isLiveMode()) {
    // A short pause keeps the demo feeling like the live experience.
    await new Promise((resolve) => setTimeout(resolve, 700));
    const evaluation = demoEvaluate(data.config, data.question, data.answer, data.questionIndex);
    return Response.json(evaluation, { headers: modeHeaders("demo") });
  }

  try {
    const evaluation = await evaluateLive(data, request.signal);
    return Response.json(evaluation, { headers: modeHeaders("live") });
  } catch (error) {
    return aiErrorResponse(error);
  }
}
