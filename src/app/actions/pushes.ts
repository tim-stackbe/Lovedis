"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { firstZodError, type ActionState } from "@/lib/action-state";
import { requireRole, requireTeam } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { processDueReminders } from "@/lib/reminders";

// ---------------------------------------------------------------------------
// Accelerator-independent push: the team assigns a startup to a partner
// (context note, no deep evaluation) and optionally schedules an automated
// check-in reminder.
// ---------------------------------------------------------------------------

const pushSchema = z.object({
  partnerId: z.string().min(1, "Partner ist erforderlich"),
  startupId: z.string().min(1, "Startup ist erforderlich"),
  context: z.string().max(2000).optional(),
  reminderInDays: z.coerce.number().int().min(0).max(365).optional(),
});

export async function createPush(
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const session = await requireTeam();
  const parsed = pushSchema.safeParse({
    partnerId: formData.get("partnerId"),
    startupId: formData.get("startupId"),
    context: formData.get("context") || undefined,
    reminderInDays: formData.get("reminderInDays") || undefined,
  });
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  const [partner, startup] = await Promise.all([
    prisma.user.findFirst({
      where: { id: parsed.data.partnerId, role: "BUSINESS_PARTNER" },
      select: { id: true },
    }),
    prisma.startup.findUnique({
      where: { id: parsed.data.startupId },
      select: { id: true },
    }),
  ]);
  if (!partner) return { error: "Partner nicht gefunden." };
  if (!startup) return { error: "Startup nicht gefunden." };

  const existing = await prisma.startupPush.findUnique({
    where: {
      partnerId_startupId: {
        partnerId: parsed.data.partnerId,
        startupId: parsed.data.startupId,
      },
    },
    select: { id: true },
  });
  if (existing) {
    return { error: "Dieses Startup wurde diesem Partner bereits zugewiesen." };
  }

  const push = await prisma.startupPush.create({
    data: {
      partnerId: parsed.data.partnerId,
      startupId: parsed.data.startupId,
      pushedById: session.user.id,
      context: parsed.data.context ?? null,
    },
  });

  if (
    parsed.data.reminderInDays !== undefined &&
    parsed.data.reminderInDays >= 0
  ) {
    const dueAt = new Date(
      Date.now() + parsed.data.reminderInDays * 24 * 60 * 60 * 1000
    );
    await prisma.checkInReminder.create({
      data: {
        partnerId: parsed.data.partnerId,
        startupId: parsed.data.startupId,
        pushId: push.id,
        dueAt,
        status: "SCHEDULED",
      },
    });
  }

  revalidatePath("/pushes");
  revalidatePath("/check-ins");
  return { success: "Startup an Partner gepusht." };
}

/** Schedules a follow-up reminder for an existing push. */
export async function scheduleReminder(
  pushId: string,
  inDays: number
): Promise<ActionState> {
  await requireTeam();
  const push = await prisma.startupPush.findUnique({
    where: { id: pushId },
    select: { id: true, partnerId: true, startupId: true },
  });
  if (!push) return { error: "Push nicht gefunden." };

  await prisma.checkInReminder.create({
    data: {
      partnerId: push.partnerId,
      startupId: push.startupId,
      pushId: push.id,
      dueAt: new Date(Date.now() + inDays * 24 * 60 * 60 * 1000),
      status: "SCHEDULED",
    },
  });
  revalidatePath("/pushes");
  revalidatePath("/check-ins");
  return { success: "Erinnerung geplant." };
}

/** Asserts the caller may act on a reminder (team or the owning partner). */
async function getActionableReminder(reminderId: string) {
  const session = await requireRole(["ADMIN", "MEMBER", "BUSINESS_PARTNER"]);
  const reminder = await prisma.checkInReminder.findUnique({
    where: { id: reminderId },
    select: { id: true, partnerId: true },
  });
  if (!reminder) return null;
  const isTeam =
    session.user.role === "ADMIN" || session.user.role === "MEMBER";
  if (!isTeam && reminder.partnerId !== session.user.id) return null;
  return reminder;
}

export async function markReminderDone(
  reminderId: string
): Promise<ActionState> {
  const reminder = await getActionableReminder(reminderId);
  if (!reminder) return { error: "Erinnerung nicht gefunden." };
  await prisma.checkInReminder.update({
    where: { id: reminderId },
    data: { status: "DONE" },
  });
  revalidatePath("/pushes");
  revalidatePath("/check-ins");
  return { success: "Check-in erledigt." };
}

export async function cancelReminder(
  reminderId: string
): Promise<ActionState> {
  const reminder = await getActionableReminder(reminderId);
  if (!reminder) return { error: "Erinnerung nicht gefunden." };
  await prisma.checkInReminder.update({
    where: { id: reminderId },
    data: { status: "CANCELLED" },
  });
  revalidatePath("/pushes");
  revalidatePath("/check-ins");
  return { success: "Erinnerung abgebrochen." };
}

/** Void-returning wrappers so these can be used directly as `<form action>`. */
export async function markReminderDoneForm(reminderId: string): Promise<void> {
  await markReminderDone(reminderId);
}

export async function cancelReminderForm(reminderId: string): Promise<void> {
  await cancelReminder(reminderId);
}

/** Manual "jetzt fällige Erinnerungen verarbeiten" trigger (team). */
export async function runDueReminders(): Promise<ActionState> {
  await requireTeam();
  const result = await processDueReminders();
  revalidatePath("/pushes");
  revalidatePath("/check-ins");
  if (result.processed === 0) {
    return { success: "Keine fälligen Erinnerungen." };
  }
  return {
    success: `${result.sent} Erinnerung(en) versendet${
      result.failed > 0 ? `, ${result.failed} fehlgeschlagen` : ""
    }.`,
  };
}
