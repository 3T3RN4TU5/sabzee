import "server-only";
import type { z } from "zod";
import type { AiMode } from "@/lib/constants";

const MAX_BODY_BYTES = 128 * 1024;
const GENERIC_ISSUE = "generic_issue";

export function modeHeaders(mode: AiMode): HeadersInit {
  return { "Cache-Control": "no-store", "X-Coach-Mode": mode };
}

export function jsonError(
  status: number,
  code: string,
  message: string,
  headers?: HeadersInit,
): Response {
  return Response.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store", ...headers } },
  );
}

type ParsedBody<T> = { ok: true; data: T } | { ok: false; response: Response };

/** Reads, size-checks and validates a JSON request body with a friendly 400 on failure. */
export async function parseJsonBody<Schema extends z.ZodType>(
  request: Request,
  schema: Schema,
): Promise<ParsedBody<z.output<Schema>>> {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES) {
    return { ok: false, response: jsonError(413, "too_large", "That request is too large. Try a shorter answer or job description.") };
  }

  let text: string;
  try {
    text = await request.text();
  } catch {
    return { ok: false, response: jsonError(400, "bad_body", "We couldn't read your request. Please try again.") };
  }
  if (text.length > MAX_BODY_BYTES) {
    return { ok: false, response: jsonError(413, "too_large", "That request is too large. Try a shorter answer or job description.") };
  }

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, response: jsonError(400, "invalid_json", "The request body must be valid JSON.") };
  }

  // Schema-level messages win over this per-parse map, so only zod's generic
  // defaults ("Too big: expected number to be <=10") are replaced.
  const result = schema.safeParse(json, { error: () => GENERIC_ISSUE });
  if (!result.success) {
    const issue = result.error.issues[0];
    const message =
      issue && issue.message !== GENERIC_ISSUE
        ? issue.message
        : `Invalid value for "${issue?.path.join(".") || "request"}". Please check your input and try again.`;
    return { ok: false, response: jsonError(400, "invalid_input", message) };
  }
  return { ok: true, data: result.data };
}
