"use server";

import { revalidatePath } from "next/cache";
import { firstZodError, type ActionState } from "@/lib/action-state";
import { requireAdmin } from "@/lib/auth-guards";
import {
  canEditComment,
  canEditEntry,
  canPinAnother,
  createCommentSchema,
  createEntrySchema,
  entryFormInput,
  getLogDrawerData,
  updateCommentSchema,
  updateEntrySchema,
  type LogDrawerData,
  type LogRefMetadata,
} from "@/lib/logbook";
import {
  BOOKING_STATUS_LABELS,
  LOG_MAX_PINNED,
  type LogRefType,
} from "@/lib/constants";
import { prisma } from "@/lib/prisma";

// All Logbuch writes are ADMIN-only (requireAdmin). Authors may edit only
// their own entries/comments; any admin may soft delete.

function revalidateLogbook(startupId: string) {
  revalidatePath(`/startups/${startupId}/logbuch`);
  revalidatePath(`/startups/${startupId}`);
}

/**
 * Drops participant/assignee ids that don't belong here: contacts must be of
 * this startup, team participants and the assignee must be active admins.
 */
async function sanitizeRefs(
  startupId: string,
  input: {
    contactIds: string[];
    teamParticipantIds: string[];
    followUpAssigneeId: string | null;
  }
) {
  const [contacts, admins] = await Promise.all([
    prisma.contact.findMany({
      where: { startupId, id: { in: input.contactIds } },
      select: { id: true },
    }),
    prisma.user.findMany({
      where: {
        role: "ADMIN",
        isActive: true,
        id: {
          in: [
            ...input.teamParticipantIds,
            ...(input.followUpAssigneeId ? [input.followUpAssigneeId] : []),
          ],
        },
      },
      select: { id: true },
    }),
  ]);
  const contactSet = new Set(contacts.map((c) => c.id));
  const adminSet = new Set(admins.map((a) => a.id));
  return {
    contactIds: input.contactIds.filter((id) => contactSet.has(id)),
    teamParticipantIds: input.teamParticipantIds.filter((id) =>
      adminSet.has(id)
    ),
    followUpAssigneeId:
      input.followUpAssigneeId && adminSet.has(input.followUpAssigneeId)
        ? input.followUpAssigneeId
        : null,
  };
}

type ResolvedRef =
  | { refType: LogRefType | null; refId: string | null; metadata: LogRefMetadata }
  | { error: string };

const orgName = (u: { name: string; company: string | null }) =>
  u.company ?? u.name;

/**
 * Verifies that the context object belongs to this startup and derives the
 * display metadata server-side (never trusted from the client). Only names
 * and ids are stored, never partner/startup-visible note text.
 */
async function resolveLogRef(
  startupId: string,
  input: {
    refType: LogRefType | null;
    refId: string | null;
    partnerCompanyId: string | null;
    batchId: string | null;
  }
): Promise<ResolvedRef> {
  const mismatch = { error: "Der Kontext passt nicht zu diesem Startup." };
  const { refType, refId } = input;
  if (!refType) return { refType: null, refId: null, metadata: {} };

  switch (refType) {
    case "PartnerStartupMatch": {
      if (refId) {
        const m = await prisma.partnerStartupMatch.findFirst({
          where: { id: refId, startupId },
          select: {
            partner: { select: { id: true, name: true } },
            batch: { select: { id: true, name: true } },
          },
        });
        if (!m) return mismatch;
        return {
          refType,
          refId,
          metadata: {
            contextLabel: m.partner.name,
            partnerCompanyId: m.partner.id,
            partnerName: m.partner.name,
            batchId: m.batch.id,
            batchName: m.batch.name,
          },
        };
      }
      // Empty matrix cell: no match row yet, so reference partner + batch.
      if (!input.partnerCompanyId || !input.batchId) return mismatch;
      const [partner, batch] = await Promise.all([
        prisma.partnerCompany.findUnique({
          where: { id: input.partnerCompanyId },
          select: { id: true, name: true },
        }),
        prisma.batchStartup.findFirst({
          where: { batchId: input.batchId, startupId },
          select: { batch: { select: { id: true, name: true } } },
        }),
      ]);
      if (!partner || !batch) return mismatch;
      return {
        refType,
        refId: null,
        metadata: {
          contextLabel: partner.name,
          partnerCompanyId: partner.id,
          partnerName: partner.name,
          batchId: batch.batch.id,
          batchName: batch.batch.name,
        },
      };
    }
    case "MarketplaceBooking": {
      const b = refId
        ? await prisma.marketplaceBooking.findFirst({
            where: { id: refId, startupId },
            select: {
              status: true,
              program: { select: { title: true } },
              mentor: { select: { name: true } },
              offering: { select: { title: true } },
            },
          })
        : null;
      if (!b) return mismatch;
      return {
        refType,
        refId,
        metadata: {
          contextLabel:
            b.mentor?.name ?? b.offering?.title ?? b.program?.title ?? "Anfrage",
          bookingStatus: b.status,
          bookingStatusLabel: BOOKING_STATUS_LABELS[b.status],
        },
      };
    }
    case "ChallengeApplication": {
      const a = refId
        ? await prisma.challengeApplication.findFirst({
            where: { id: refId, startupId },
            select: { challenge: { select: { id: true, title: true } } },
          })
        : null;
      if (!a) return mismatch;
      return {
        refType,
        refId,
        metadata: { contextLabel: a.challenge.title, challengeId: a.challenge.id },
      };
    }
    case "Engagement": {
      const e = refId
        ? await prisma.engagement.findFirst({
            where: { id: refId, startupId },
            select: {
              title: true,
              partner: { select: { name: true, company: true } },
            },
          })
        : null;
      if (!e) return mismatch;
      return {
        refType,
        refId,
        metadata: {
          contextLabel: `${e.title} (${orgName(e.partner)})`,
          partnerName: orgName(e.partner),
        },
      };
    }
  }
}

export async function createLogEntry(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const session = await requireAdmin();
  const parsed = createEntrySchema.safeParse(entryFormInput(formData));
  if (!parsed.success) return { error: firstZodError(parsed.error) };
  const {
    startupId,
    occurredAt,
    refType,
    refId,
    partnerCompanyId,
    batchId,
    assignSelf,
    ...data
  } = parsed.data;

  const startup = await prisma.startup.findUnique({
    where: { id: startupId },
    select: { id: true },
  });
  if (!startup) return { error: "Startup nicht gefunden." };

  const ref = await resolveLogRef(startupId, {
    refType,
    refId,
    partnerCompanyId,
    batchId,
  });
  if ("error" in ref) return { error: ref.error };

  // Quick add has no assignee picker: the author owns their own next step.
  if (assignSelf && data.nextStep && !data.followUpAssigneeId) {
    data.followUpAssigneeId = session.user.id;
  }
  const refs = await sanitizeRefs(startupId, data);
  await prisma.startupLogEntry.create({
    data: {
      ...data,
      ...refs,
      ...ref,
      startupId,
      source: "MANUAL",
      authorId: session.user.id,
      occurredAt: occurredAt ?? new Date(),
    },
  });

  revalidateLogbook(startupId);
  return { success: "Eintrag gespeichert." };
}

export async function updateLogEntry(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const session = await requireAdmin();
  const parsed = updateEntrySchema.safeParse(entryFormInput(formData));
  if (!parsed.success) return { error: firstZodError(parsed.error) };
  const { entryId, occurredAt, ...data } = parsed.data;

  const entry = await prisma.startupLogEntry.findUnique({
    where: { id: entryId },
    select: {
      startupId: true,
      authorId: true,
      source: true,
      type: true,
      deletedAt: true,
      occurredAt: true,
    },
  });
  if (!entry || entry.deletedAt) return { error: "Eintrag nicht gefunden." };
  if (!canEditEntry(entry, session.user.id)) {
    return { error: "Du kannst nur deine eigenen Einträge bearbeiten." };
  }

  const refs = await sanitizeRefs(entry.startupId, data);
  await prisma.startupLogEntry.update({
    where: { id: entryId },
    data: {
      ...data,
      ...refs,
      occurredAt: occurredAt ?? entry.occurredAt,
      editedAt: new Date(),
    },
  });

  revalidateLogbook(entry.startupId);
  return { success: "Eintrag aktualisiert." };
}

export async function deleteLogEntry(entryId: string): Promise<ActionState> {
  const session = await requireAdmin();
  const entry = await prisma.startupLogEntry.findUnique({
    where: { id: entryId },
    select: { startupId: true, deletedAt: true },
  });
  if (!entry || entry.deletedAt) return { error: "Eintrag nicht gefunden." };

  await prisma.startupLogEntry.update({
    where: { id: entryId },
    data: {
      deletedAt: new Date(),
      deletedById: session.user.id,
      pinnedAt: null,
      pinnedById: null,
    },
  });

  revalidateLogbook(entry.startupId);
  return { success: "Eintrag gelöscht." };
}

export async function toggleLogEntryPin(entryId: string): Promise<ActionState> {
  const session = await requireAdmin();
  const entry = await prisma.startupLogEntry.findUnique({
    where: { id: entryId },
    select: { startupId: true, deletedAt: true, pinnedAt: true },
  });
  if (!entry || entry.deletedAt) return { error: "Eintrag nicht gefunden." };

  if (entry.pinnedAt) {
    await prisma.startupLogEntry.update({
      where: { id: entryId },
      data: { pinnedAt: null, pinnedById: null },
    });
    revalidateLogbook(entry.startupId);
    return { success: "Nicht mehr angepinnt." };
  }

  const pinned = await prisma.startupLogEntry.count({
    where: {
      startupId: entry.startupId,
      deletedAt: null,
      pinnedAt: { not: null },
    },
  });
  if (!canPinAnother(pinned)) {
    return {
      error: `Es können höchstens ${LOG_MAX_PINNED} Einträge angepinnt sein.`,
    };
  }

  await prisma.startupLogEntry.update({
    where: { id: entryId },
    data: { pinnedAt: new Date(), pinnedById: session.user.id },
  });
  revalidateLogbook(entry.startupId);
  return { success: "Angepinnt." };
}

export async function toggleLogFollowUpDone(
  entryId: string
): Promise<ActionState> {
  await requireAdmin();
  const entry = await prisma.startupLogEntry.findUnique({
    where: { id: entryId },
    select: {
      startupId: true,
      deletedAt: true,
      nextStep: true,
      followUpDoneAt: true,
    },
  });
  if (!entry || entry.deletedAt) return { error: "Eintrag nicht gefunden." };
  if (!entry.nextStep) return { error: "Kein nächster Schritt hinterlegt." };

  const done = entry.followUpDoneAt === null;
  await prisma.startupLogEntry.update({
    where: { id: entryId },
    data: { followUpDoneAt: done ? new Date() : null },
  });
  revalidateLogbook(entry.startupId);
  return { success: done ? "Als erledigt markiert." : "Wieder offen." };
}

export async function createLogComment(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const session = await requireAdmin();
  const parsed = createCommentSchema.safeParse({
    entryId: formData.get("entryId"),
    body: formData.get("body") ?? "",
  });
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  const entry = await prisma.startupLogEntry.findUnique({
    where: { id: parsed.data.entryId },
    select: { startupId: true, deletedAt: true },
  });
  if (!entry || entry.deletedAt) return { error: "Eintrag nicht gefunden." };

  await prisma.startupLogComment.create({
    data: {
      entryId: parsed.data.entryId,
      body: parsed.data.body,
      authorId: session.user.id,
    },
  });
  revalidateLogbook(entry.startupId);
  return { success: "Antwort gespeichert." };
}

export async function updateLogComment(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const session = await requireAdmin();
  const parsed = updateCommentSchema.safeParse({
    commentId: formData.get("commentId"),
    body: formData.get("body") ?? "",
  });
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  const comment = await prisma.startupLogComment.findUnique({
    where: { id: parsed.data.commentId },
    select: {
      authorId: true,
      deletedAt: true,
      entry: { select: { startupId: true } },
    },
  });
  if (!comment || comment.deletedAt) {
    return { error: "Antwort nicht gefunden." };
  }
  if (!canEditComment(comment, session.user.id)) {
    return { error: "Du kannst nur deine eigenen Antworten bearbeiten." };
  }

  await prisma.startupLogComment.update({
    where: { id: parsed.data.commentId },
    data: { body: parsed.data.body, editedAt: new Date() },
  });
  revalidateLogbook(comment.entry.startupId);
  return { success: "Antwort aktualisiert." };
}

export async function deleteLogComment(commentId: string): Promise<ActionState> {
  const session = await requireAdmin();
  const comment = await prisma.startupLogComment.findUnique({
    where: { id: commentId },
    select: { deletedAt: true, entry: { select: { startupId: true } } },
  });
  if (!comment || comment.deletedAt) {
    return { error: "Antwort nicht gefunden." };
  }

  await prisma.startupLogComment.update({
    where: { id: commentId },
    data: { deletedAt: new Date(), deletedById: session.user.id },
  });
  revalidateLogbook(comment.entry.startupId);
  return { success: "Antwort gelöscht." };
}

/** Lazy loader for the Logbuch side drawer (ADMIN only). */
export async function loadLogDrawer(
  startupId: string
): Promise<LogDrawerData | null> {
  return getLogDrawerData(startupId);
}
