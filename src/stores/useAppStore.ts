"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ScoreDimension } from "@/generated/prisma/enums";
import { DEFAULT_WEIGHTS } from "@/lib/constants";

interface AppState {
  /** Per-user scoring-weight overrides, applied client-side. */
  weights: Record<ScoreDimension, number>;
  setWeight: (dimension: ScoreDimension, value: number) => void;
  resetWeights: () => void;

  /** UI preferences */
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  /** Startup ids selected for the compare view. */
  compareSelection: string[];
  toggleCompare: (startupId: string) => void;
  clearCompare: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      weights: { ...DEFAULT_WEIGHTS },
      setWeight: (dimension, value) =>
        set((state) => ({
          weights: { ...state.weights, [dimension]: value },
        })),
      resetWeights: () => set({ weights: { ...DEFAULT_WEIGHTS } }),

      sidebarCollapsed: false,
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      compareSelection: [],
      toggleCompare: (startupId) =>
        set((state) => ({
          compareSelection: state.compareSelection.includes(startupId)
            ? state.compareSelection.filter((id) => id !== startupId)
            : [...state.compareSelection, startupId].slice(-4),
        })),
      clearCompare: () => set({ compareSelection: [] }),
    }),
    {
      name: "lovedis-app-store",
      // Rehydrate after mount (see AppShell) to avoid SSR hydration mismatches.
      skipHydration: true,
    }
  )
);
