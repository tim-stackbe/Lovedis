import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Batch scoping for the public marketplace ("Entdecke").
 *
 * Discover advertises the startups of the *current* Industry Batch, but the
 * schema has no `isActive` flag on `ScoutingCampaign` — the only existing
 * signals are the optional `startDate`/`endDate` window and `createdAt`. So the
 * current batch is derived from those instead of introducing a new column:
 * the batch whose window contains "now" (a missing bound counts as open —
 * today's batches have none set), and among several the most recently started,
 * then the most recently created.
 */

/** The `ScoutingCampaign` fields needed to pick the current batch. */
export interface BatchWindow {
  id: string;
  startDate: Date | null;
  endDate: Date | null;
  createdAt: Date;
}

/** Most recently started, then most recently created; dateless batches last. */
function byRecency(a: BatchWindow, b: BatchWindow): number {
  if (a.startDate && b.startDate) {
    const diff = b.startDate.getTime() - a.startDate.getTime();
    if (diff !== 0) return diff;
  } else if (a.startDate) {
    return -1;
  } else if (b.startDate) {
    return 1;
  }
  return b.createdAt.getTime() - a.createdAt.getTime();
}

function isRunning(batch: BatchWindow, now: Date): boolean {
  if (batch.startDate && batch.startDate > now) return false;
  if (batch.endDate && batch.endDate < now) return false;
  return true;
}

/**
 * Picks the current batch out of all batches, or null when there are none.
 *
 * Batches that already ended (or have not started yet) are only considered when
 * *no* batch is currently running — a stale batch is still a far better answer
 * than showing nothing, because Discover would otherwise go blank the day a
 * batch's `endDate` passes.
 */
export function pickCurrentBatch<T extends BatchWindow>(
  batches: readonly T[],
  now: Date = new Date()
): T | null {
  if (batches.length === 0) return null;
  const running = batches.filter((b) => isRunning(b, now));
  const pool = running.length > 0 ? running : batches;
  return [...pool].sort(byRecency)[0] ?? null;
}

/** Reads all batches and resolves the current one's id (null if none exist). */
export async function resolveCurrentBatchId(): Promise<string | null> {
  const batches = await prisma.scoutingCampaign.findMany({
    select: { id: true, startDate: true, endDate: true, createdAt: true },
  });
  return pickCurrentBatch(batches)?.id ?? null;
}

/**
 * Visibility filter shared by the Discover list and the `/discover/[id]` detail
 * page, so a direct link can never open a profile the list does not offer.
 *
 * With no resolvable batch (empty DB, or every batch deleted) this degrades to
 * the pre-batch behaviour — all published storefronts — rather than rendering an
 * empty marketplace for everyone. Publishing stays an explicit, startup- or
 * admin-controlled act, so the fallback cannot leak anything unpublished.
 */
export function discoverStartupWhere(
  currentBatchId: string | null
): Prisma.StartupWhereInput {
  return currentBatchId
    ? {
        isPublished: true,
        batchStartups: { some: { batchId: currentBatchId } },
      }
    : { isPublished: true };
}
