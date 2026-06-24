"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { EngagementStatus } from "@/generated/prisma/enums";
import { firstZodError, type ActionState } from "@/lib/action-state";
import { requireRole, requireTeam } from "@/lib/auth-guards";
import { ENGAGEMENT_STATUSES } from "@/lib/constants";
import { kpisSchema, milestonesSchema } from "@/lib/pocs";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Engagement = accelerator-independent collaboration ("Oberbegriff" for the
// challenge-bound PoCPerformance). Reuses the KPI/milestone JSON shapes.
// ---------------------------------------------------------------------------

const ENGAGEMENT_MANAGER_ROLES = ["ADMIN", "MEMBER", "BUSINESS_PARTNER"] as const;

const createSchema = z.object({
  partnerId: z.string().min(1, "Partner ist erforderlich"),
  startupId: z.string().min(1, "Startup ist erforderlich"),
  title: z.string().min(3).max(200),
  status: z.enum(ENGAGEMENT_STATUSES as [EngagementStatus, ...EngagementStatus[]]),
  startDate: z.string().optional(),
  notes: z.string().max(8000).optional(),
});

export async function createEngagement(
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const session = await requireTeam();
  const parsed = createSchema.safeParse({
    partnerId: formData.get("partnerId"),
    startupId: formData.get("startupId"),
    title: formData.get("title"),
    status: formData.get("status") ?? "ACTIVE",
    startDate: formData.get("startDate") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  const partner = await prisma.user.findFirst({
    where: { id: parsed.data.partnerId, role: "BUSINESS_PARTNER" },
    select: { id: true },
  });
  if (!partner) return { error: "Partner nicht gefunden." };
  const startup = await prisma.startup.findUnique({
    where: { id: parsed.data.startupId },
    select: { id: true },
  });
  if (!startup) return { error: "Startup nicht gefunden." };

  const engagement = await prisma.engagement.create({
    data: {
      partnerId: parsed.data.partnerId,
      startupId: parsed.data.startupId,
      title: parsed.data.title,
      status: parsed.data.status,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
      notes: parsed.data.notes ?? null,
      createdById: session.user.id,
    },
  });

  revalidatePath("/engagements");
  revalidatePath("/partners");
  redirect(`/engagements/${engagement.id}`);
}

/** Asserts the session user may edit the given engagement. */
async function getManagedEngagement(id: string) {
  const session = await requireRole([...ENGAGEMENT_MANAGER_ROLES]);
  const engagement = await prisma.engagement.findUnique({
    where: { id },
    select: { id: true, partnerId: true },
  });
  if (!engagement) return null;
  const isTeam =
    session.user.role === "ADMIN" || session.user.role === "MEMBER";
  if (!isTeam && engagement.partnerId !== session.user.id) return null;
  return engagement;
}

const updateSchema = z.object({
  title: z.string().min(3).max(200),
  status: z.enum(ENGAGEMENT_STATUSES as [EngagementStatus, ...EngagementStatus[]]),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  notes: z.string().max(8000).optional(),
  kpis: z.string(),
  milestones: z.string(),
});

export async function updateEngagement(
  engagementId: string,
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const engagement = await getManagedEngagement(engagementId);
  if (!engagement) {
    return { error: "Engagement nicht gefunden oder nicht deins." };
  }

  const parsed = updateSchema.safeParse({
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

  await prisma.engagement.update({
    where: { id: engagementId },
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

  revalidatePath("/engagements");
  revalidatePath(`/engagements/${engagementId}`);
  revalidatePath("/partners");
  return { success: "Engagement aktualisiert." };
}
