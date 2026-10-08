"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** True only after hydration, so persisted (localStorage) state never causes a server/client mismatch. */
export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
