"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/action-state";
import { requireTeam } from "@/lib/auth-guards";
import { takeInsightsSnapshot } from "@/lib/insights/snapshot";

/** Manual trigger for the KPI-Insights snapshot (same job the cron runs). */
export async function runInsightsSnapshot(): Promise<ActionState> {
  await requireTeam();
  const result = await takeInsightsSnapshot();
  revalidatePath("/insights");
  return {
    success: `Snapshot ${result.takenOn}: ${result.written} von ${result.checked} Datensätzen geändert und gespeichert.`,
  };
}
