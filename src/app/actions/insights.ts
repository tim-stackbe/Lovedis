"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/action-state";
import { requireAdmin, requireTeam } from "@/lib/auth-guards";
import { takeInsightsSnapshot } from "@/lib/insights/snapshot";
import { parseReportingMetaForm, parseTrackingForm, type TrackingInput } from "@/lib/insights/tracking";
import { prisma } from "@/lib/prisma";

// Phase 2 writes go ONLY to StartupReportingMeta, PipelineTracking and
// BatchChallengeLink. Existing tables are read to validate references, never
// written.

/** Manual trigger for the KPI-Insights snapshot (same job the cron runs). */
export async function runInsightsSnapshot(): Promise<ActionState> {
  await requireTeam();
  const result = await takeInsightsSnapshot();
  revalidatePath("/insights");
  return {
    success: `Snapshot ${result.takenOn}: ${result.written} von ${result.checked} Datensätzen geändert und gespeichert.`,
  };
}

/** Förder facts of one startup (Hessen, founders, team, FTE baseline). */
export async function saveReportingMeta(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const session = await requireAdmin();
  const parsed = parseReportingMetaForm(formData);
  if (!parsed.data) return { error: parsed.error };
  const { startupId, ...data } = parsed.data;

  const startup = await prisma.startup.findUnique({ where: { id: startupId }, select: { id: true } });
  if (!startup) return { error: "Startup nicht gefunden." };

  await prisma.startupReportingMeta.upsert({
    where: { startupId },
    create: { startupId, ...data, updatedById: session.user.id },
    update: { ...data, updatedById: session.user.id },
  });

  revalidatePath("/insights");
  revalidatePath(`/insights/startup/${startupId}`);
  return { success: "Förder-Merkmale gespeichert." };
}

async function validateTrackingRefs(input: TrackingInput, id: string | null): Promise<string | null> {
  const [startup, partner, batch, challenge, engagement, engagementTaken] = await Promise.all([
    prisma.startup.findUnique({ where: { id: input.startupId }, select: { id: true } }),
    input.partnerCompanyId
      ? prisma.partnerCompany.findUnique({ where: { id: input.partnerCompanyId }, select: { id: true } })
      : null,
    input.batchId
      ? prisma.scoutingCampaign.findUnique({ where: { id: input.batchId }, select: { id: true } })
      : null,
    input.challengeId
      ? prisma.challenge.findUnique({ where: { id: input.challengeId }, select: { id: true } })
      : null,
    input.engagementId
      ? prisma.engagement.findUnique({ where: { id: input.engagementId }, select: { startupId: true } })
      : null,
    input.engagementId
      ? prisma.pipelineTracking.findFirst({
          where: { engagementId: input.engagementId, ...(id ? { NOT: { id } } : {}) },
          select: { id: true },
        })
      : null,
  ]);
  if (!startup) return "Startup nicht gefunden.";
  if (input.partnerCompanyId && !partner) return "Partner nicht gefunden.";
  if (input.batchId && !batch) return "Batch nicht gefunden.";
  if (input.challengeId && !challenge) return "Challenge nicht gefunden.";
  if (input.engagementId && !engagement) return "Engagement nicht gefunden.";
  if (engagement && engagement.startupId !== input.startupId) {
    return "Das Engagement gehört zu einem anderen Startup.";
  }
  if (engagementTaken) return "Dieses Engagement ist bereits mit einem anderen Tracking-Eintrag verknüpft.";
  return null;
}

/** Create (no id) or update a pipeline-tracking entry. */
export async function saveTracking(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const session = await requireAdmin();
  const id = String(formData.get("id") ?? "") || null;
  const parsed = parseTrackingForm(formData);
  if (!parsed.data) return { error: parsed.error };
  const input = parsed.data;

  if (id) {
    const existing = await prisma.pipelineTracking.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return { error: "Tracking-Eintrag nicht gefunden." };
  }
  const refError = await validateTrackingRefs(input, id);
  if (refError) return { error: refError };

  const saved = id
    ? await prisma.pipelineTracking.update({
        where: { id },
        data: { ...input, updatedById: session.user.id },
        select: { id: true },
      })
    : await prisma.pipelineTracking.create({
        data: { ...input, createdById: session.user.id, updatedById: session.user.id },
        select: { id: true },
      });

  revalidatePath("/insights");
  revalidatePath("/insights/tracking");
  revalidatePath(`/insights/startup/${input.startupId}`);
  return id
    ? { success: "Tracking-Eintrag gespeichert." }
    : { success: "Tracking-Eintrag angelegt.", redirectTo: `/insights/tracking/${saved.id}` };
}

export async function deleteTracking(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const deleted = await prisma.pipelineTracking.deleteMany({ where: { id } });
  if (deleted.count === 0) return { error: "Tracking-Eintrag nicht gefunden." };
  revalidatePath("/insights");
  revalidatePath("/insights/tracking");
  return { success: "Tracking-Eintrag gelöscht.", redirectTo: "/insights/tracking" };
}

/** Replaces the set of challenges assigned to one batch. */
export async function saveBatchChallenges(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const session = await requireAdmin();
  const batchId = String(formData.get("batchId") ?? "");
  const challengeIds = [...new Set(formData.getAll("challengeId").map(String).filter(Boolean))];

  const batch = await prisma.scoutingCampaign.findUnique({ where: { id: batchId }, select: { id: true } });
  if (!batch) return { error: "Batch nicht gefunden." };
  const known = await prisma.challenge.count({ where: { id: { in: challengeIds } } });
  if (known !== challengeIds.length) return { error: "Mindestens eine Challenge wurde nicht gefunden." };

  await prisma.$transaction([
    prisma.batchChallengeLink.deleteMany({
      where: { batchId, challengeId: { notIn: challengeIds } },
    }),
    prisma.batchChallengeLink.createMany({
      data: challengeIds.map((challengeId) => ({ batchId, challengeId, createdById: session.user.id })),
      skipDuplicates: true,
    }),
  ]);

  revalidatePath("/insights");
  revalidatePath("/insights/setup");
  return { success: `${challengeIds.length} Challenges dem Batch zugeordnet.` };
}
