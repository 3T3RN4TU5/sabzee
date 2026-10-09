"use client";

import { useId, useLayoutEffect, useRef, type ReactNode } from "react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** Optional extra action rendered between cancel and confirm. */
  secondary?: { label: string; onClick: () => void };
}

/** Accessible modal built on the native <dialog> element (focus trap and Esc handling for free). */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onCancel,
  secondary,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();

  // The cleanup also runs when Next.js hides this route on navigation (e.g. the
  // browser's Back button): closing fires `close`, which reports a cancel.
  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog || !open) return;
    if (!dialog.open) dialog.showModal();
    return () => dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-description`}
      onClose={() => {
        if (open) onCancel();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-white/10 bg-ink-800 p-0 text-zinc-100 shadow-2xl shadow-black/60"
    >
      <div className="p-6">
        <h2 id={`${id}-title`} className="text-lg font-semibold text-white">
          {title}
        </h2>
        <div id={`${id}-description`} className="mt-2 text-sm leading-relaxed text-zinc-400">
          {description}
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-300 ring-1 ring-inset ring-white/10 transition hover:bg-white/5"
          >
            {cancelLabel}
          </button>
          {secondary && (
            <button
              type="button"
              onClick={secondary.onClick}
              className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15"
            >
              {secondary.label}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            autoFocus
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition ${
              destructive ? "bg-rose-500 hover:bg-rose-400" : "bg-violet-500 hover:bg-violet-400"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
