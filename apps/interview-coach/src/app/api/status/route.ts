import { connection } from "next/server";
import { isLiveMode, MODEL } from "@/lib/server/anthropic";

/** Reports whether the AI runs live (ANTHROPIC_API_KEY set) or in demo mode. */
export async function GET() {
  // Evaluate at request time so adding the key in Vercel takes effect without relying on build-time output.
  await connection();
  const live = isLiveMode();
  return Response.json(
    { mode: live ? "live" : "demo", model: live ? MODEL : null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
