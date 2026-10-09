"use client";

import { createContext, use, useEffect, useState, type ReactNode } from "react";
import { fetchStatus, isAbortError } from "@/lib/api";
import type { AiMode } from "@/lib/constants";

export type AiStatus =
  | { state: "loading" }
  | { state: "ready"; mode: AiMode; model: string | null }
  | { state: "error" };

const StatusContext = createContext<AiStatus>({ state: "loading" });

/** Fetches GET /api/status once and shares whether the app runs on Claude or in demo mode. */
export function StatusProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AiStatus>({ state: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    fetchStatus(controller.signal)
      .then(({ mode, model }) => setStatus({ state: "ready", mode, model }))
      .catch((error: unknown) => {
        if (!isAbortError(error)) setStatus({ state: "error" });
      });
    return () => controller.abort();
  }, []);

  return <StatusContext value={status}>{children}</StatusContext>;
}

export function useAiStatus(): AiStatus {
  return use(StatusContext);
}
