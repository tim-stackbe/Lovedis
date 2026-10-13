"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/action-state";
import { requireAdmin, requireStartup } from "@/lib/auth-guards";
import {
  isSurveyOpen,
  parseEventForm,
  parseResponseForm,
  parseScopeForm,
  parseSurveyForm,
  surveyEligibleStartupIds,
} from "@/lib/insights/funding";
import { prisma } from "@/lib/prisma";

// Phase 3 writes go ONLY to FundingScopeItem, FundingEventCount, FeedbackSurvey
// and FeedbackResponse. Batches, programs, bookings and startups are read to
// validate references, never written.

function revalidateFunding() {
  revalidatePath("/insights/foerderung");
  revalidatePath("/insights/foerderung/setup");
  revalidatePath("/insights/foerderung/events");
  revalidatePath("/insights/foerderung/feedback");
}

async function refExists(kind: "BATCH" | "PROGRAM", refId: string): Promise<boolean> {
  const found =
    kind === "BATCH"
      ? await prisma.scoutingCampaign.findUnique({ where: { id: refId }, select: { id: true } })
      : await prisma.program.findUnique({ where: { id: refId }, select: { id: true } });
  return found !== null;
}

/** Assigns a batch or program to a funded format; an empty format removes it. */
export async function saveFundingScope(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const session = await requireAdmin();
  const parsed = parseScopeForm(formData);
  if (!parsed.data) return { error: parsed.error };
  const { kind, refId, format } = parsed.data;
  if (!(await refExists(kind, refId))) {
    return { error: kind === "BATCH" ? "Batch nicht gefunden." : "Programm nicht gefunden." };
  }

  if (format === null) {
    await prisma.fundingScopeItem.deleteMany({ where: { kind, refId } });
    revalidateFunding();
    return { success: "Zuordnung entfernt." };
  }
  await prisma.fundingScopeItem.upsert({
    where: { kind_refId: { kind, refId } },
    create: { kind, refId, format, createdById: session.user.id },
    update: { format },
  });
  revalidateFunding();
  return { success: "Format zugeordnet." };
}

/** Create (no id) or update the attendee count of one event. */
export async function saveFundingEvent(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const session = await requireAdmin();
  const id = String(formData.get("id") ?? "") || null;
  const parsed = parseEventForm(formData);
  if (!parsed.data) return { error: parsed.error };

  if (id) {
    const updated = await prisma.fundingEventCount.updateMany({
      where: { id },
      data: { ...parsed.data, updatedById: session.user.id },
    });
    if (updated.count === 0) return { error: "Veranstaltung nicht gefunden." };
  } else {
    await prisma.fundingEventCount.create({
      data: { ...parsed.data, createdById: session.user.id, updatedById: session.user.id },
    });
  }
  revalidateFunding();
  return { success: id ? "Veranstaltung gespeichert." : "Veranstaltung eingetragen." };
}

export async function deleteFundingEvent(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const deleted = await prisma.fundingEventCount.deleteMany({ where: { id } });
  if (deleted.count === 0) return { error: "Veranstaltung nicht gefunden." };
  revalidateFunding();
  return { success: "Veranstaltung gelöscht." };
}

export async function createFeedbackSurvey(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const session = await requireAdmin();
  const parsed = parseSurveyForm(formData);
  if (!parsed.data) return { error: parsed.error };
  const { scopeKind, refId, title, closesOn } = parsed.data;
  if (!(await refExists(scopeKind, refId))) {
    return { error: scopeKind === "BATCH" ? "Batch nicht gefunden." : "Programm nicht gefunden." };
  }
  await prisma.feedbackSurvey.create({
    data: { scopeKind, refId, title, closesOn, createdById: session.user.id },
  });
  revalidateFunding();
  revalidatePath("/dashboard/startup");
  return { success: "Umfrage geöffnet." };
}

/** Closes (or reopens) a survey; answers stay. */
export async function setFeedbackSurveyClosed(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const close = formData.get("close") === "true";
  const updated = await prisma.feedbackSurvey.updateMany({
    where: { id },
    data: { closedAt: close ? new Date() : null, ...(close ? {} : { closesOn: null }) },
  });
  if (updated.count === 0) return { error: "Umfrage nicht gefunden." };
  revalidateFunding();
  revalidatePath("/dashboard/startup");
  revalidatePath(`/feedback/${id}`);
  return { success: close ? "Umfrage geschlossen." : "Umfrage wieder geöffnet." };
}

/** A startup owner answers (or updates the answer) while the survey is open. */
export async function submitFeedback(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const session = await requireStartup();
  const parsed = parseResponseForm(formData);
  if (!parsed.data) return { error: parsed.error };
  const { surveyId, ...answer } = parsed.data;

  const [survey, startup] = await Promise.all([
    prisma.feedbackSurvey.findUnique({ where: { id: surveyId } }),
    prisma.startup.findUnique({ where: { ownerUserId: session.user.id }, select: { id: true } }),
  ]);
  if (!survey) return { error: "Umfrage nicht gefunden." };
  if (!startup) return { error: "Deinem Konto ist kein Startup zugeordnet." };
  if (!isSurveyOpen(survey, new Date())) return { error: "Die Umfrage ist bereits geschlossen." };

  const [batchStartups, programBookings] = await Promise.all([
    survey.scopeKind === "BATCH"
      ? prisma.batchStartup.findMany({
          where: { batchId: survey.refId, startupId: startup.id },
          select: { batchId: true, startupId: true },
        })
      : [],
    survey.scopeKind === "PROGRAM"
      ? prisma.marketplaceBooking.findMany({
          where: { programId: survey.refId, startupId: startup.id },
          select: { startupId: true, status: true },
        })
      : [],
  ]);
  const eligible = surveyEligibleStartupIds(
    survey,
    { batchStartups },
    { programBookings: programBookings.map((b) => ({ ...b, programId: survey.refId })) }
  );
  if (!eligible.has(startup.id)) return { error: "Dein Startup nimmt an diesem Programm nicht teil." };

  await prisma.feedbackResponse.upsert({
    where: { surveyId_startupId: { surveyId, startupId: startup.id } },
    create: { surveyId, startupId: startup.id, userId: session.user.id, ...answer },
    update: { userId: session.user.id, ...answer },
  });
  revalidatePath(`/feedback/${surveyId}`);
  revalidatePath("/dashboard/startup");
  revalidatePath("/insights/foerderung/feedback");
  return { success: "Danke für dein Feedback!" };
}
