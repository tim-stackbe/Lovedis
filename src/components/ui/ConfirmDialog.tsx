"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "primary" | "danger";
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Lightweight, on-brand confirmation modal for consequential/irreversible
 * actions. Renders nothing when closed. Confirm defaults to the primary tone;
 * pass `tone="danger"` for destructive actions.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Bestätigen",
  cancelLabel = "Abbrechen",
  tone = "primary",
  pending = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    // Remember the opener so focus can be restored on close, and lock the
    // background scroll while the modal is up.
    const opener = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusables = () =>
      Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) ?? []
      );

    // Initial focus on the confirm (primary/danger) button — the last button
    // in the footer.
    const buttons =
      dialogRef.current?.querySelectorAll<HTMLButtonElement>("button");
    (buttons?.[buttons.length - 1] ?? dialogRef.current)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (!pending) onCancel();
        return;
      }
      if (e.key !== "Tab") return;
      // Trap Tab within the dialog.
      const items = focusables();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      opener?.focus?.();
    };
  }, [open, pending, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-lv-text/40"
        onClick={() => !pending && onCancel()}
        aria-hidden
      />
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        tabIndex={-1}
        className="relative w-full max-w-sm rounded-card border border-lv-border bg-white p-6 shadow-card focus:outline-none"
      >
        <h2 className="text-base font-bold text-lv-text">{title}</h2>
        {description && (
          <div className="mt-2 text-sm text-lv-secondary">{description}</div>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onCancel}
            disabled={pending}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={tone}
            size="sm"
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? "…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
