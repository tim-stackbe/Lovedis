"use client";

import { useCallback, useEffect, useState } from "react";

interface OdieOverlayProps {
  title: string;
  subtitle: string;
  /** Small label shown above the title (e.g. the trigger name). */
  badge?: string;
  onClose: () => void;
}

/**
 * Tasteful, dismissible Odie cameo. Fades + slides in on mount and fades out
 * before unmounting. Closeable via the button, the backdrop, or Escape.
 */
export function OdieOverlay({ title, subtitle, badge, onClose }: OdieOverlayProps) {
  const [visible, setVisible] = useState(false);

  const handleClose = useCallback(() => {
    setVisible(false);
    window.setTimeout(onClose, 260);
  }, [onClose]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
    };
  }, [handleClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Odie"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{
        background: "rgba(10, 10, 15, 0.45)",
        opacity: visible ? 1 : 0,
        transition: "opacity 250ms ease",
      }}
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm overflow-hidden rounded-card bg-white shadow-card"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible
            ? "translateY(0) scale(1)"
            : "translateY(16px) scale(0.96)",
          transition: "opacity 260ms ease, transform 260ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <button
          onClick={handleClose}
          aria-label="Schließen"
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-lv-secondary shadow-card transition-colors hover:bg-white hover:text-lv-text"
        >
          ✕
        </button>

        <div className="bg-lv-blue-soft">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/odie.png"
            alt="Odie, the Lovedis office dog"
            className="mx-auto block h-56 w-full object-contain"
            draggable={false}
          />
        </div>

        <div className="space-y-1.5 p-5 text-center">
          {badge && (
            <p className="lv-wordmark text-[10px] text-lv-orange">{badge}</p>
          )}
          <h2 className="text-lg font-semibold text-lv-text">{title}</h2>
          <p className="text-sm text-lv-secondary">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}
