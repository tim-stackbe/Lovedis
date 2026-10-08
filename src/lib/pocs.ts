import { z } from "zod";

/** KPI entry stored in PoCPerformance.kpis (JSON column). */
export const kpiSchema = z.object({
  name: z.string().min(1).max(120),
  target: z.number(),
  current: z.number(),
  unit: z.string().max(20),
});

export type Kpi = z.infer<typeof kpiSchema>;

/**
 * Editable KPI used by the client editors. The numeric fields may be an empty
 * string while the user is typing (e.g. after deleting the last digit), which
 * lets the input show empty instead of snapping back to `0`. Coerce with
 * {@link normalizeKpi} before persisting.
 */
export type KpiDraft = Omit<Kpi, "current" | "target"> & {
  current: number | "";
  target: number | "";
};

/** Turns an empty numeric field into `0` so the draft is a valid {@link Kpi}. */
export function normalizeKpi(draft: KpiDraft): Kpi {
  return {
    ...draft,
    current: draft.current === "" ? 0 : draft.current,
    target: draft.target === "" ? 0 : draft.target,
  };
}

/** Parses a numeric `<input>` value, keeping empty as `""` (not `0`). */
export function parseNumberInput(raw: string): number | "" {
  if (raw === "") return "";
  const n = Number(raw);
  return Number.isNaN(n) ? "" : n;
}

/** Milestone entry stored in PoCPerformance.milestones (JSON column). */
export const milestoneSchema = z.object({
  title: z.string().min(1).max(200),
  dueDate: z.string().min(1),
  done: z.boolean(),
});

export type Milestone = z.infer<typeof milestoneSchema>;

export const kpisSchema = z.array(kpiSchema).max(20);
export const milestonesSchema = z.array(milestoneSchema).max(30);

/** Safely parses the JSON columns coming back from Prisma. */
export function parseKpis(value: unknown): Kpi[] {
  const result = kpisSchema.safeParse(value);
  return result.success ? result.data : [];
}

export function parseMilestones(value: unknown): Milestone[] {
  const result = milestonesSchema.safeParse(value);
  return result.success ? result.data : [];
}

export function kpiProgress(kpi: Kpi): number {
  if (kpi.target === 0) return 0;
  return Math.min(100, Math.round((kpi.current / kpi.target) * 100));
}

export function pocProgress(milestones: Milestone[]): number {
  if (milestones.length === 0) return 0;
  const done = milestones.filter((m) => m.done).length;
  return Math.round((done / milestones.length) * 100);
}
