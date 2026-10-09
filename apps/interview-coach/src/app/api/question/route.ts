import { QuestionRequestSchema } from "@/lib/schemas";
import { aiErrorResponse, isLiveMode } from "@/lib/server/anthropic";
import { demoQuestionText, demoTextStream } from "@/lib/server/demo/engine";
import { jsonError, modeHeaders, parseJsonBody } from "@/lib/server/http";
import { streamLiveQuestion } from "@/lib/server/live";
import { rateLimit } from "@/lib/server/rate-limit";

// Runs on the default Node.js runtime; allow up to 60s for Claude responses.
export const maxDuration = 60;

/** Streams the next interview question as text/plain. */
export async function POST(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const body = await parseJsonBody(request, QuestionRequestSchema);
  if (!body.ok) return body.response;
  const { config, history } = body.data;

  if (history.length >= config.questionCount) {
    return jsonError(400, "interview_complete", "This interview already has all of its questions.");
  }

  if (!isLiveMode()) {
    return new Response(demoTextStream(demoQuestionText(config, history)), {
      headers: { ...modeHeaders("demo"), "Content-Type": "text/plain; charset=utf-8", "X-Content-Type-Options": "nosniff" },
    });
  }

  try {
    return await streamLiveQuestion(config, history, request.signal);
  } catch (error) {
    return aiErrorResponse(error);
  }
}
