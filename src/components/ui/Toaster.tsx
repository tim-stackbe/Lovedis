"use client";

import { CircleAlert, CircleCheck, X } from "lucide-react";
import { useEffect } from "react";
import { useToast, type ToastItem } from "@/stores/useToast";
import { cn } from "@/lib/utils";

const AUTO_DISMISS_MS = 4500;

function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const { id } = toast;
  // Depend on the stable `id` + `dismiss` reference (not a per-render closure),
  // so a newly pushed toast can't re-run this effect and restart existing
  // toasts' countdowns — each toast dismisses itself independently by id.
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(id), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [id, onDismiss]);

  const isError = toast.tone === "error";
  const Icon = isError ? CircleAlert : CircleCheck;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "lv-toast-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-card border p-3.5 shadow-card",
        isError
          ? "border-lv-orange-soft bg-lv-orange-soft text-lv-orange"
          : "border-lv-mint bg-lv-mint/60 text-lv-mint-deep"
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(id)}
        aria-label="Schließen"
        className="shrink-0 rounded-button p-0.5 opacity-60 transition-opacity hover:opacity-100"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/** Fixed, on-brand toast stack. Mounted once in the app shell. */
export function Toaster() {
  const toasts = useToast((s) => s.toasts);
  const dismiss = useToast((s) => s.dismiss);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[80] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={dismiss} />
      ))}
    </div>
  );
}
