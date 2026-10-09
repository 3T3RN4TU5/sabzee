import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { jsonError } from "./http";

export const MODEL = "claude-opus-5-5";

/**
 * Server-side refusal fallbacks: if a safety classifier declines a request,
 * the API transparently re-runs it on Anthropic's recommended fallback model
 * (sent as `betas: [FALLBACK_BETA], fallbacks: "default"`).
 */
export const FALLBACK_BETA = "server-side-fallback-2026-07-01";

let client: Anthropic | null = null;

export function isLiveMode(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

/** Created lazily so demo deployments never construct a client. Reads ANTHROPIC_API_KEY. */
export function getClient(): Anthropic {
  client ??= new Anthropic({ maxRetries: 2 });
  return client;
}

export class RefusalError extends Error {
  constructor() {
    super("The AI declined to respond to this request.");
    this.name = "RefusalError";
  }
}

export class EmptyOutputError extends Error {
  constructor() {
    super("The AI returned no usable output.");
    this.name = "EmptyOutputError";
  }
}

/** Maps SDK and app errors to clean JSON responses (most specific first). */
export function aiErrorResponse(error: unknown): Response {
  if (error instanceof RefusalError) {
    return jsonError(
      422,
      "refusal",
      "The AI declined to respond to this one. Try rephrasing your answer or the job description, then retry.",
    );
  }
  if (error instanceof EmptyOutputError) {
    return jsonError(502, "empty_output", "The AI returned an incomplete response. Please retry.");
  }
  if (error instanceof Anthropic.AuthenticationError) {
    console.error("[ai] authentication failed — check ANTHROPIC_API_KEY");
    return jsonError(
      503,
      "ai_auth",
      "The AI service rejected this site's API key. The site owner needs to update ANTHROPIC_API_KEY.",
    );
  }
  if (error instanceof Anthropic.RateLimitError) {
    const retryAfter = error.headers?.get("retry-after");
    return jsonError(
      429,
      "ai_rate_limited",
      "Claude is handling a lot of requests right now. Wait a few seconds and retry.",
      retryAfter ? { "Retry-After": retryAfter } : undefined,
    );
  }
  if (error instanceof Anthropic.BadRequestError) {
    console.error("[ai] bad request:", error.message);
    return jsonError(
      400,
      "ai_bad_request",
      "The AI couldn't process this request. Try shortening your answer or job description.",
    );
  }
  if (error instanceof Anthropic.APIUserAbortError) {
    // The browser disconnected; nobody is waiting for this response.
    return jsonError(499, "aborted", "The request was cancelled.");
  }
  if (error instanceof Anthropic.APIError) {
    console.error(`[ai] API error ${error.status ?? "(no status)"}:`, error.message);
    const message =
      error.status === undefined
        ? "Couldn't reach the AI service. Check your connection and retry."
        : "Claude is temporarily unavailable. Please retry in a moment.";
    return jsonError(503, "ai_unavailable", message);
  }
  if (error instanceof Anthropic.AnthropicError) {
    // e.g. structured output that failed schema validation (truncated JSON).
    console.error("[ai] unusable output:", error.message);
    return jsonError(502, "bad_output", "The AI returned an incomplete response. Please retry.");
  }
  console.error("[ai] unexpected error:", error);
  return jsonError(500, "internal", "Something went wrong while talking to the AI. Please retry.");
}
