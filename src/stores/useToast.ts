"use client";

import { create } from "zustand";

export type ToastTone = "success" | "error";

export interface ToastItem {
  id: string;
  message: string;
  tone: ToastTone;
}

interface ToastState {
  toasts: ToastItem[];
  push: (message: string, tone?: ToastTone) => void;
  dismiss: (id: string) => void;
}

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export const useToast = create<ToastState>((set) => ({
  toasts: [],
  push: (message, tone = "success") =>
    set((state) => ({
      toasts: [...state.toasts, { id: makeId(), message, tone }],
    })),
  dismiss: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

/**
 * Fire-and-forget toast helper usable from any client event handler without a
 * provider/prop-drill. Reads the store imperatively via `getState`.
 */
export const toast = {
  success: (message: string) => useToast.getState().push(message, "success"),
  error: (message: string) => useToast.getState().push(message, "error"),
};
