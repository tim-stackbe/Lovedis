"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { PoCStatus } from "@/generated/prisma/enums";
import { firstZodError, type ActionState } from "@/lib/action-state";
import { requireRole } from "@/lib/auth-guards";
import { POC_STATUSES } from "@/lib/constants";
import { kpisSchema, milestonesSchema } from "@/lib/pocs";
import { prisma } from "@/lib/prisma";
import { isRecordNotFoundError } from "@/lib/prisma-errors";

const POC_MANAGER_ROLES = ["ADMIN", "BUSINESS_PARTNER", "INVESTOR"] as const;

/** Asserts the session user may edit the given PoC. */
async function getManagedPoC(pocId: string) {
  const session = await requireRole([...POC_MANAGER_ROLES]);
  const poc = await prisma.poCPerformance.findUnique({
    where: { id: pocId },
    select: {
      id: true,
      trackedById: true,
      application: {
        select: { challenge: { select: { createdById: true } } },
      },
    },
  });
  if (!poc) return null;
  const isOwner =
    poc.trackedById === session.user.id ||
    poc.application.challenge.createdById === session.user.id;
  if (session.user.role !== "ADMIN" && !isOwner) return null;
  return poc;
}

const pocUpdateSchema = z.object({
  title: z.string().min(3).max(200),
  status: z.enum(POC_STATUSES as [PoCStatus, ...PoCStatus[]]),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  notes: z.string().max(8000).optional(),
  kpis: z.string(),
  milestones: z.string(),
});

export async function updatePoC(
  pocId: string,
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const poc = await getManagedPoC(pocId);
  if (!poc) return { error: "PoC nicht gefunden oder nicht deiner." };

  const parsed = pocUpdateSchema.safeParse({
    title: formData.get("title"),
    status: formData.get("status"),
    startDate: formData.get("startDate") || undefined,
    endDate: formData.get("endDate") || undefined,
    notes: formData.get("notes") || undefined,
    kpis: formData.get("kpis") ?? "[]",
    milestones: formData.get("milestones") ?? "[]",
  });
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  let kpisJson: unknown;
  let milestonesJson: unknown;
  try {
    kpisJson = JSON.parse(parsed.data.kpis);
    milestonesJson = JSON.parse(parsed.data.milestones);
  } catch {
    return { error: "Ungültige KPI- oder Meilenstein-Daten." };
  }

  const kpis = kpisSchema.safeParse(kpisJson);
  if (!kpis.success) return { error: "Ungültige KPI-Daten." };
  const milestones = milestonesSchema.safeParse(milestonesJson);
  if (!milestones.success) return { error: "Ungültige Meilenstein-Daten." };

  await prisma.poCPerformance.update({
    where: { id: pocId },
    data: {
      title: parsed.data.title,
      status: parsed.data.status,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
      notes: parsed.data.notes ?? null,
      kpis: kpis.data,
      milestones: milestones.data,
    },
  });

  revalidatePath("/pocs");
  revalidatePath(`/pocs/${pocId}`);
  revalidatePath("/dashboard/partner");
  revalidatePath("/dashboard/investor");
  return { success: "PoC aktualisiert." };
}

export async function assignPoCTracker(
  pocId: string,
  trackerId: string
): Promise<ActionState> {
  await requireRole(["ADMIN"]);
  const tracker = await prisma.user.findUnique({
    where: { id: trackerId },
    select: { role: true, isActive: true },
  });
  if (
    !tracker ||
    !tracker.isActive ||
    !["BUSINESS_PARTNER", "INVESTOR"].includes(tracker.role)
  ) {
    return { error: "Tracker muss ein aktiver Partner oder Investor sein." };
  }
  try {
    await prisma.poCPerformance.update({
      where: { id: pocId },
      data: { trackedById: trackerId },
    });
  } catch (err) {
    if (isRecordNotFoundError(err)) return { error: "PoC nicht gefunden." };
    throw err;
  }
  revalidatePath("/pocs");
  revalidatePath(`/pocs/${pocId}`);
  return {};
}
