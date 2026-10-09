import type { z } from "zod";
import type { AiMode } from "./constants";
import {
  EvaluationSchema,
  ReportSchema,
  StatusSchema,
  type EvaluateRequest,
  type Evaluation,
  type QuestionRequest,
  type Report,
  type ReportRequest,
  type Status,
} from "./schemas";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof TypeError) return "Network error — check your connection and try again.";
  return "Something unexpected went wrong. Please try again.";
}

async function errorFromResponse(response: Response): Promise<ApiError> {
  let message = `Request failed (${response.status}). Please try again.`;
  let code = "http_error";
  try {
    const body: unknown = await response.json();
    if (body && typeof body === "object" && "error" in body) {
      const error = (body as { error: { message?: unknown; code?: unknown } }).error;
      if (typeof error.message === "string") message = error.message;
      if (typeof error.code === "string") code = error.code;
    }
  } catch {
    // Non-JSON error body (e.g. a proxy page) — keep the generic message.
  }
  return new ApiError(message, response.status, code);
}

async function postJson<T>(
  url: string,
  body: unknown,
  schema: z.ZodType<T>,
  signal?: AbortSignal,
): Promise<{ data: T; mode: AiMode }> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok) throw await errorFromResponse(response);
  const parsed = schema.safeParse(await response.json());
  if (!parsed.success) {
    throw new ApiError("The server sent an unexpected response. Please try again.", 502, "bad_shape");
  }
  return { data: parsed.data, mode: modeFrom(response) };
}

function modeFrom(response: Response): AiMode {
  return response.headers.get("x-coach-mode") === "live" ? "live" : "demo";
}

export async function fetchStatus(signal?: AbortSignal): Promise<Status> {
  const response = await fetch("/api/status", { signal, cache: "no-store" });
  if (!response.ok) throw await errorFromResponse(response);
  return StatusSchema.parse(await response.json());
}

/**
 * Streams the next interview question. `onText` receives the full text so far
 * after every chunk, so callers can render it directly.
 */
export async function streamQuestion(
  body: QuestionRequest,
  { signal, onText }: { signal: AbortSignal; onText: (text: string) => void },
): Promise<string> {
  const response = await fetch("/api/question", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok) throw await errorFromResponse(response);
  if (!response.body) throw new ApiError("Streaming isn't supported by this browser.", 500, "no_stream");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
      onText(text);
    }
    text += decoder.decode();
  } catch (error) {
    if (signal.aborted) throw error;
    throw new ApiError(
      "The connection dropped while the question was streaming. Please retry.",
      502,
      "stream_interrupted",
    );
  }

  const question = text.trim();
  if (!question) throw new ApiError("The interviewer returned an empty question. Please retry.", 502, "empty");
  onText(question);
  return question;
}

export async function evaluateAnswer(body: EvaluateRequest, signal?: AbortSignal): Promise<Evaluation> {
  const { data } = await postJson("/api/evaluate", body, EvaluationSchema, signal);
  return data;
}

export async function generateReport(
  body: ReportRequest,
  signal?: AbortSignal,
): Promise<{ report: Report; mode: AiMode }> {
  const { data, mode } = await postJson("/api/report", body, ReportSchema, signal);
  return { report: data, mode };
}
