"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { card } from "@/lib/ui";

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  maxWidth = "32rem",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      style={{ position: "fixed", inset: 0 }}
      className="z-[100] flex items-start justify-center overflow-y-auto bg-neutral-950/60 p-4 py-10 backdrop-blur-sm animate-[confirm-overlay-in_0.15s_ease-out]"
      onClick={onClose}
    >
      <div
        style={{ maxWidth }}
        className={`w-full p-6 shadow-2xl animate-[confirm-card-in_0.15s_ease-out] ${card}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 id="modal-title" className="text-base font-semibold text-gray-900 dark:text-neutral-100">
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-sm leading-relaxed text-gray-500 dark:text-neutral-400">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="mt-4">{children}</div>
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
