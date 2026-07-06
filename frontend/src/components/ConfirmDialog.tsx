"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconAlertTriangle } from "@/components/icons";

const btnDanger =
  "rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors";

const btnNeutral =
  "rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 transition-colors dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  submitting = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  submitting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cancelRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onCancel]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      style={{ position: "fixed", inset: 0 }}
      className="z-[100] flex items-center justify-center overflow-y-auto bg-neutral-950/60 p-4 backdrop-blur-sm animate-[confirm-overlay-in_0.15s_ease-out]"
      onClick={onCancel}
    >
      <div
        style={{ maxWidth: "26rem" }}
        className="w-full rounded-xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 animate-[confirm-card-in_0.15s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400">
            <IconAlertTriangle className="h-5 w-5" />
          </span>
          <div className="min-w-0 pt-0.5">
            <h2 id="confirm-dialog-title" className="text-base font-semibold text-gray-900 dark:text-neutral-100">
              {title}
            </h2>
            {description && (
              <p className="mt-1.5 text-sm leading-relaxed text-gray-500 dark:text-neutral-400">{description}</p>
            )}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2.5">
          <button ref={cancelRef} type="button" onClick={onCancel} disabled={submitting} className={btnNeutral}>
            Cancel
          </button>
          <button type="button" onClick={onConfirm} disabled={submitting} className={btnDanger}>
            {submitting ? "Please wait..." : confirmLabel}
          </button>
        </div>
      </div>
      <style jsx global>{`
        @keyframes confirm-overlay-in {
          from {
            opacity: 0;
          }
        }
        @keyframes confirm-card-in {
          from {
            opacity: 0;
            transform: translateY(4px) scale(0.98);
          }
        }
      `}</style>
    </div>,
    document.body
  );
}
