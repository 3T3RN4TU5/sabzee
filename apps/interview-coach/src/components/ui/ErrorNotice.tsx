import type { ReactNode } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";

interface ErrorNoticeProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  children?: ReactNode;
}

export function ErrorNotice({ title = "Something went wrong", message, onRetry, retryLabel = "Try again", children }: ErrorNoticeProps) {
  return (
    <div role="alert" className="rounded-2xl border border-rose-400/25 bg-rose-500/[0.07] p-4 sm:p-5">
      <div className="flex gap-3">
        <TriangleAlert className="mt-0.5 size-5 shrink-0 text-rose-300" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-rose-100">{title}</p>
          <p className="mt-1 text-sm text-rose-200/80">{message}</p>
          {(onRetry || children) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="inline-flex items-center gap-2 rounded-lg bg-rose-400/15 px-3.5 py-2 text-sm font-medium text-rose-100 ring-1 ring-inset ring-rose-400/30 transition hover:bg-rose-400/25"
                >
                  <RotateCcw className="size-4" aria-hidden />
                  {retryLabel}
                </button>
              )}
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
