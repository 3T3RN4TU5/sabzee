import { ReportRequestSchema } from "@/lib/schemas";
import { aiErrorResponse, isLiveMode } from "@/lib/server/anthropic";
import { demoReport } from "@/lib/server/demo/engine";
import { modeHeaders, parseJsonBody } from "@/lib/server/http";
import { reportLive } from "@/lib/server/live";
import { rateLimit } from "@/lib/server/rate-limit";

// Runs on the default Node.js runtime; allow up to 60s for Claude responses.
export const maxDuration = 60;

/** Builds the final interview report from the full transcript. */
export async function POST(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const body = await parseJsonBody(request, ReportRequestSchema);
  if (!body.ok) return body.response;
  const { config, history } = body.data;

  if (!isLiveMode()) {
    await new Promise((resolve) => setTimeout(resolve, 900));
    return Response.json(demoReport(config, history), { headers: modeHeaders("demo") });
  }

  try {
    const report = await reportLive(body.data, request.signal);
    return Response.json(report, { headers: modeHeaders("live") });
  } catch (error) {
    return aiErrorResponse(error);
  }
}
