import "server-only";
import { jsonError } from "./http";

/**
 * Best-effort, per-instance sliding-window rate limiter.
 *
 * State lives in this serverless instance's memory, so limits are not shared
 * across regions or cold starts — it slows down casual abuse of the API key
 * without needing an external store (Redis/KV). See README for details.
 */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 40;
const MAX_TRACKED_CLIENTS = 5_000;

const hits = new Map<string, number[]>();

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip")?.trim();
  return ip || "unknown";
}

function prune(now: number) {
  for (const [key, timestamps] of hits) {
    const recent = timestamps.filter((time) => now - time < WINDOW_MS);
    if (recent.length === 0) hits.delete(key);
    else hits.set(key, recent);
  }
}

/** Returns a 429 response when the caller is over the limit, otherwise `null`. */
export function rateLimit(request: Request): Response | null {
  const now = Date.now();
  if (hits.size > MAX_TRACKED_CLIENTS) prune(now);

  const key = clientKey(request);
  const recent = (hits.get(key) ?? []).filter((time) => now - time < WINDOW_MS);

  if (recent.length >= MAX_REQUESTS) {
    const retryAfter = Math.max(1, Math.ceil((recent[0] + WINDOW_MS - now) / 1000));
    hits.set(key, recent);
    const minutes = Math.ceil(retryAfter / 60);
    return jsonError(
      429,
      "rate_limited",
      `You're practicing fast! You've hit the limit of ${MAX_REQUESTS} AI requests per 10 minutes — try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`,
      { "Retry-After": String(retryAfter) },
    );
  }

  recent.push(now);
  hits.set(key, recent);
  return null;
}
