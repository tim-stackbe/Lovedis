"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type {
  BatchType,
  MatchUseCaseType,
  RelevanceLevel,
} from "@/generated/prisma/enums";
import { firstZodError, type ActionState } from "@/lib/action-state";
import { requireRole } from "@/lib/auth-guards";
import {
  BATCH_TYPES,
  MATCH_USE_CASE_TYPES,
  RELEVANCE_LEVELS,
} from "@/lib/constants";
import {
  authorizeMatrixPartner,
  authorizeMatrixStartup,
  batchHasPartner,
  batchHasStartup,
} from "@/lib/matrix-guards";
import { prisma } from "@/lib/prisma";
import { isRecordNotFoundError } from "@/lib/prisma-errors";

// ---------------------------------------------------------------------------
// Two-sided Match-Matrix self-service actions.
//
// A partner edits ONLY their own column (partner side); a startup edits ONLY
// its own row (startup side). The edited party id is resolved from the SESSION
// via the matrix guards — never trusted from the form — so one party can never
// write another's data. Team-side maintenance stays in actions/match-matrix.ts.
// ---------------------------------------------------------------------------

const relevanceEnum = z.enum(
  RELEVANCE_LEVELS as [RelevanceLevel, ...RelevanceLevel[]]
);

/** Shared shape of one self-service side (partner OR startup). */
const sideSchema = z.object({
  relevance: relevanceEnum.nullable(),
  useCaseTypes: z.array(
    z.enum(MATCH_USE_CASE_TYPES as [MatchUseCaseType, ...MatchUseCaseType[]])
  ),
  useCaseNote: z.string().trim().max(2000).optional(),
  openQuestions: z.string().trim().max(2000).optional(),
  notes: z.string().trim().max(2000).optional(),
  // Tri-state Ja/Nein/— booleans.
  followUp: z.boolean().nullable(),
  contacted: z.boolean().nullable(),
});

function optionalRelevance(value: FormDataEntryValue | null): RelevanceLevel | null {
  const raw = typeof value === "string" ? value.trim() : "";
  return raw ? (raw as RelevanceLevel) : null;
}

/** "" → null, "true" → true, "false" → false. */
function triBool(value: FormDataEntryValue | null): boolean | null {
  const raw = typeof value === "string" ? value.trim() : "";
  if (raw === "true") return true;
  if (raw === "false") return false;
  return null;
}

function parseSide(formData: FormData) {
  return sideSchema.safeParse({
    relevance: optionalRelevance(formData.get("relevance")),
    useCaseTypes: formData.getAll("useCaseTypes"),
    useCaseNote: formData.get("useCaseNote") || undefined,
    openQuestions: formData.get("openQuestions") || undefined,
    notes: formData.get("notes") || undefined,
    followUp: triBool(formData.get("followUp")),
    contacted: triBool(formData.get("contacted")),
  });
}

// --- Partner side -----------------------------------------------------------

/**
 * Partner fills their side for one startup within a specific batch. The partner
 * (PartnerCompany) id is resolved from the session; the batch + startup come
 * from the form and BOTH the partner and the startup must be members of that
 * batch — a partner can only rate startups in a batch they participate in.
 */
export async function upsertPartnerSideCell(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const authz = await authorizeMatrixPartner();
  if (!authz.ok) return { error: authz.error };
  const partnerId = authz.ctx.partnerCompany.id;

  const batchId = String(formData.get("batchId") ?? "");
  const startupId = String(formData.get("startupId") ?? "");
  if (!batchId) return { error: "Batch ist erforderlich." };
  if (!startupId) return { error: "Startup ist erforderlich." };

  const parsed = parseSide(formData);
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  // Authorize: this partner must be a column of the batch AND the startup a row.
  const [partnerIn, startupIn] = await Promise.all([
    batchHasPartner(batchId, partnerId),
    batchHasStartup(batchId, startupId),
  ]);
  if (!partnerIn) return { error: "Du nimmst an diesem Batch nicht teil." };
  if (!startupIn) {
    return { error: "Dieses Startup gehört nicht zu diesem Batch." };
  }

  const s = parsed.data;
  const data = {
    partnerRelevance: s.relevance,
    partnerUseCaseTypes: s.useCaseTypes,
    partnerUseCaseNote: s.useCaseNote ?? null,
    partnerOpenQuestions: s.openQuestions ?? null,
    partnerNotes: s.notes ?? null,
    partnerFollowUp: s.followUp,
    partnerContacted: s.contacted,
    partnerUpdatedAt: new Date(),
    partnerUpdatedById: authz.ctx.session.user.id,
  };

  try {
    await prisma.partnerStartupMatch.upsert({
      where: {
        batchId_partnerId_startupId: { batchId, partnerId, startupId },
      },
      update: data,
      create: { batchId, partnerId, startupId, ...data },
    });
  } catch (err) {
    if (isRecordNotFoundError(err)) return { error: "Eintrag nicht gefunden." };
    throw err;
  }

  revalidatePath("/matrix");
  revalidatePath("/match-matrix");
  return { success: "Deine Einschätzung wurde gespeichert." };
}

// --- Startup side -----------------------------------------------------------

/**
 * Startup fills their side for one partner within a specific batch. The startup
 * id is resolved from the session; the batch + partner come from the form and
 * both must be members of that batch.
 */
export async function upsertStartupSideCell(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const authz = await authorizeMatrixStartup();
  if (!authz.ok) return { error: authz.error };
  const startupId = authz.ctx.startup.id;

  const batchId = String(formData.get("batchId") ?? "");
  const partnerId = String(formData.get("partnerId") ?? "");
  if (!batchId) return { error: "Batch ist erforderlich." };
  if (!partnerId) return { error: "Partner ist erforderlich." };

  const parsed = parseSide(formData);
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  const [startupIn, partnerIn] = await Promise.all([
    batchHasStartup(batchId, startupId),
    batchHasPartner(batchId, partnerId),
  ]);
  if (!startupIn) return { error: "Du nimmst an diesem Batch nicht teil." };
  if (!partnerIn) {
    return { error: "Dieser Partner gehört nicht zu diesem Batch." };
  }

  const s = parsed.data;
  const data = {
    startupRelevance: s.relevance,
    startupUseCaseTypes: s.useCaseTypes,
    startupUseCaseNote: s.useCaseNote ?? null,
    startupOpenQuestions: s.openQuestions ?? null,
    startupNotes: s.notes ?? null,
    startupFollowUp: s.followUp,
    startupContacted: s.contacted,
    startupUpdatedAt: new Date(),
    startupUpdatedById: authz.ctx.session.user.id,
  };

  try {
    await prisma.partnerStartupMatch.upsert({
      where: {
        batchId_partnerId_startupId: { batchId, partnerId, startupId },
      },
      update: data,
      create: { batchId, partnerId, startupId, ...data },
    });
  } catch (err) {
    if (isRecordNotFoundError(err)) return { error: "Eintrag nicht gefunden." };
    throw err;
  }

  revalidatePath("/matrix");
  revalidatePath("/match-matrix");
  return { success: "Deine Einschätzung wurde gespeichert." };
}

// --- Admin: batch (program) management --------------------------------------
//
// Admins create batches and assign the startups + partner companies that make
// up each batch's matrix. Membership is what every self-service edit is
// authorized against, so these are ADMIN-only.

const batchTypeEnum = z.enum(BATCH_TYPES as [BatchType, ...BatchType[]]);

const batchSchema = z.object({
  name: z.string().trim().min(2, "Name ist erforderlich.").max(120),
  type: batchTypeEnum,
  description: z.string().trim().max(2000).optional(),
});

/** Create a new batch/program. Returns the new id in `success` context. */
export async function createBatch(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  await requireRole(["ADMIN"]);

  const parsed = batchSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  const batch = await prisma.scoutingCampaign.create({
    data: {
      name: parsed.data.name,
      type: parsed.data.type,
      description: parsed.data.description ?? null,
    },
    select: { id: true },
  });

  revalidatePath("/batches");
  revalidatePath("/match-matrix");
  return { success: `Batch angelegt.`, redirectTo: `/batches/${batch.id}` };
}

/** Update a batch's name/type/description. */
export async function updateBatch(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  await requireRole(["ADMIN"]);

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Batch ist erforderlich." };

  const parsed = batchSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  try {
    await prisma.scoutingCampaign.update({
      where: { id },
      data: {
        name: parsed.data.name,
        type: parsed.data.type,
        description: parsed.data.description ?? null,
      },
    });
  } catch (err) {
    if (isRecordNotFoundError(err)) return { error: "Batch nicht gefunden." };
    throw err;
  }

  revalidatePath("/batches");
  revalidatePath(`/batches/${id}`);
  revalidatePath("/match-matrix");
  return { success: "Batch aktualisiert." };
}

/** Delete a batch (cascades its memberships + matrix cells). */
export async function deleteBatch(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  await requireRole(["ADMIN"]);

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Batch ist erforderlich." };

  try {
    await prisma.scoutingCampaign.delete({ where: { id } });
  } catch (err) {
    if (isRecordNotFoundError(err)) return { error: "Batch nicht gefunden." };
    throw err;
  }

  revalidatePath("/batches");
  revalidatePath("/match-matrix");
  return { success: "Batch gelöscht.", redirectTo: "/batches" };
}

/** Add or remove a startup from a batch's matrix. `mode` = add | remove. */
export async function setBatchStartup(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const session = await requireRole(["ADMIN"]);

  const batchId = String(formData.get("batchId") ?? "");
  const startupId = String(formData.get("startupId") ?? "");
  const mode = String(formData.get("mode") ?? "add");
  if (!batchId || !startupId) {
    return { error: "Batch und Startup sind erforderlich." };
  }

  if (mode === "remove") {
    try {
      await prisma.batchStartup.delete({
        where: { batchId_startupId: { batchId, startupId } },
      });
    } catch (err) {
      if (!isRecordNotFoundError(err)) throw err;
    }
  } else {
    const startup = await prisma.startup.findUnique({
      where: { id: startupId },
      select: { id: true },
    });
    if (!startup) return { error: "Startup nicht gefunden." };
    await prisma.batchStartup.upsert({
      where: { batchId_startupId: { batchId, startupId } },
      update: {},
      create: { batchId, startupId, addedById: session.user.id },
    });
  }

  revalidatePath(`/batches/${batchId}`);
  revalidatePath("/match-matrix");
  revalidatePath("/matrix");
  return {
    success: mode === "remove" ? "Startup entfernt." : "Startup hinzugefügt.",
  };
}

/** Add or remove a partner company from a batch's matrix. */
export async function setBatchPartner(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  await requireRole(["ADMIN"]);

  const batchId = String(formData.get("batchId") ?? "");
  const partnerCompanyId = String(formData.get("partnerCompanyId") ?? "");
  const mode = String(formData.get("mode") ?? "add");
  if (!batchId || !partnerCompanyId) {
    return { error: "Batch und Partner sind erforderlich." };
  }

  if (mode === "remove") {
    try {
      await prisma.batchPartner.delete({
        where: { batchId_partnerCompanyId: { batchId, partnerCompanyId } },
      });
    } catch (err) {
      if (!isRecordNotFoundError(err)) throw err;
    }
  } else {
    const partner = await prisma.partnerCompany.findUnique({
      where: { id: partnerCompanyId },
      select: { id: true, sortOrder: true },
    });
    if (!partner) return { error: "Partner-Unternehmen nicht gefunden." };
    await prisma.batchPartner.upsert({
      where: { batchId_partnerCompanyId: { batchId, partnerCompanyId } },
      update: {},
      create: { batchId, partnerCompanyId, sortOrder: partner.sortOrder },
    });
  }

  revalidatePath(`/batches/${batchId}`);
  revalidatePath("/match-matrix");
  revalidatePath("/matrix");
  return {
    success: mode === "remove" ? "Partner entfernt." : "Partner hinzugefügt.",
  };
}
