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

/** Roles that may be assigned as a PoC tracker (mirrors `assignPoCTracker`). */
const POC_TRACKER_ROLES = ["BUSINESS_PARTNER", "INVESTOR"] as const;

/** Prisma raises `P2002` on a unique-constraint violation. Duck-typed on
 * `code` so it stays robust across bundler/module boundaries (same pattern as
 * `isRecordNotFoundError`). Guards the `PoCPerformance.applicationId @unique`
 * one-to-one against a lost race between the eligibility check and the write. */
function isUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === "P2002"
  );
}

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

const createPoCSchema = z.object({
  applicationId: z.string().min(1, "Bitte eine Bewerbung auswählen."),
  trackerId: z.string().min(1, "Bitte eine:n Tracker:in auswählen."),
  // Optional — a sensible default is derived server-side when left blank.
  title: z.string().min(3).max(200).optional(),
});

/**
 * Creates a `PoCPerformance` for an ACCEPTED challenge application — a
 * DELIBERATE, ADMIN-only step. A PoC is intentionally NOT spawned when an
 * application is accepted (see `decideApplication`): per the business process
 * the partner and startup first inform the team, and only then does an admin
 * open the PoC here.
 *
 * Guards, in order, so the authorization bites before any read/write:
 *  1. `requireRole(["ADMIN"])` — no other role may create a PoC.
 *  2. The application must exist and be ACCEPTED.
 *  3. The application must not already have a PoC (`applicationId @unique`), so
 *     the one-to-one is never violated; a lost race surfaces as a clean error.
 *  4. The tracker must be an active Business Partner or Investor.
 */
export async function createPoC(
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  await requireRole(["ADMIN"]);

  const parsed = createPoCSchema.safeParse({
    applicationId: formData.get("applicationId"),
    trackerId: formData.get("trackerId"),
    title: formData.get("title") || undefined,
  });
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  const application = await prisma.challengeApplication.findUnique({
    where: { id: parsed.data.applicationId },
    select: {
      id: true,
      status: true,
      poc: { select: { id: true } },
      startup: { select: { name: true } },
      challenge: { select: { title: true } },
    },
  });
  if (!application) return { error: "Bewerbung nicht gefunden." };
  if (application.status !== "ACCEPTED") {
    return {
      error: "Ein PoC kann nur für eine angenommene Bewerbung angelegt werden.",
    };
  }
  if (application.poc) {
    return { error: "Für diese Bewerbung existiert bereits ein PoC." };
  }

  const tracker = await prisma.user.findUnique({
    where: { id: parsed.data.trackerId },
    select: { role: true, isActive: true },
  });
  if (
    !tracker ||
    !tracker.isActive ||
    !POC_TRACKER_ROLES.includes(tracker.role as (typeof POC_TRACKER_ROLES)[number])
  ) {
    return { error: "Tracker muss ein aktiver Partner oder Investor sein." };
  }

  const title =
    parsed.data.title ??
    `PoC — ${application.startup.name} × ${application.challenge.title}`;

  try {
    await prisma.poCPerformance.create({
      data: {
        applicationId: parsed.data.applicationId,
        title,
        trackedById: parsed.data.trackerId,
      },
    });
  } catch (err) {
    // A concurrent create won the race for this application's unique PoC slot.
    if (isUniqueConstraintError(err)) {
      return { error: "Für diese Bewerbung existiert bereits ein PoC." };
    }
    throw err;
  }

  revalidatePath("/pocs");
  revalidatePath("/challenge-applications");
  revalidatePath("/dashboard/partner");
  revalidatePath("/dashboard/investor");
  return { success: "PoC angelegt." };
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
