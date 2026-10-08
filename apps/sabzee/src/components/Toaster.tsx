"use client";

import { useToasts } from "@/lib/toast";

export function Toaster() {
  const toasts = useToasts((s) => s.toasts);
  const dismiss = useToasts((s) => s.dismiss);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4" aria-live="polite">
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => dismiss(t.id)}
          className="animate-toast-in pointer-events-auto flex items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white shadow-xl"
        >
          {t.emoji && <span className="text-xl">{t.emoji}</span>}
          {t.message}
        </button>
      ))}
    </div>
  );
}
