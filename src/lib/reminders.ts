import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Check-in reminder processing.
//
// `processDueReminders` is the unit a scheduler triggers: it finds SCHEDULED
// reminders that are due, sends the email (via the abstracted adapter) and
// marks them SENT. It is deliberately self-contained so it can be called from
// an API route (cron trigger), a server action (manual "jetzt verarbeiten")
// or a test. The actual scheduling (cron) is NOT wired — see the API route and
// docs/mara-implementation-notes.md.
// ---------------------------------------------------------------------------

export interface ReminderRunResult {
  processed: number;
  sent: number;
  failed: number;
}

export async function processDueReminders(
  now: Date = new Date()
): Promise<ReminderRunResult> {
  const due = await prisma.checkInReminder.findMany({
    where: { status: "SCHEDULED", dueAt: { lte: now } },
    include: {
      partner: { select: { name: true, email: true } },
      startup: { select: { name: true } },
      push: { select: { context: true } },
    },
  });

  let sent = 0;
  let failed = 0;

  for (const reminder of due) {
    const startupName = reminder.startup?.name ?? "ein Startup";
    const context = reminder.push?.context
      ? `\n\nKontext: ${reminder.push.context}`
      : "";
    const result = await sendEmail({
      to: reminder.partner.email,
      subject: `Check-in fällig: ${startupName}`,
      text:
        `Hallo ${reminder.partner.name},\n\n` +
        `dies ist eine Erinnerung für deinen Check-in zu ${startupName}.` +
        `${context}\n\n` +
        `Bitte gib in der Lovedis-Plattform unter „Check-ins" ein kurzes Update ab.\n\n` +
        `Viele Grüße\nDein Lovedis-Team`,
    });

    if (result.ok) {
      await prisma.checkInReminder.update({
        where: { id: reminder.id },
        data: { status: "SENT", sentAt: now },
      });
      sent += 1;
    } else {
      failed += 1;
    }
  }

  return { processed: due.length, sent, failed };
}

/**
 * Fetches a partner's open (SCHEDULED/SENT) check-in reminders with the startup
 * context, annotating each with an `isOverdue` flag. Computing "now" here keeps
 * the calling Server Component pure (no impure `Date.now()` in render).
 */
export async function getOpenPartnerCheckIns(partnerId: string) {
  const reminders = await prisma.checkInReminder.findMany({
    where: { partnerId, status: { in: ["SCHEDULED", "SENT"] } },
    orderBy: { dueAt: "asc" },
    include: {
      startup: { select: { id: true, name: true, tagline: true } },
      push: { select: { context: true } },
    },
  });

  const now = Date.now();
  const items = reminders.map((r) => ({
    ...r,
    isOverdue: r.dueAt.getTime() < now,
  }));
  return { items, overdue: items.filter((r) => r.isOverdue).length };
}

/**
 * Team-preview variant of {@link getOpenPartnerCheckIns}: every partner's open
 * check-ins (not scoped to one partner), annotated with the owning partner so
 * the internal "Partner-Sicht – Vorschau" isn't empty. Read-only for the team.
 */
export async function getAllOpenCheckIns() {
  const reminders = await prisma.checkInReminder.findMany({
    where: { status: { in: ["SCHEDULED", "SENT"] } },
    orderBy: { dueAt: "asc" },
    include: {
      startup: { select: { id: true, name: true, tagline: true } },
      push: { select: { context: true } },
      partner: { select: { name: true } },
    },
  });

  const now = Date.now();
  const items = reminders.map((r) => ({
    ...r,
    isOverdue: r.dueAt.getTime() < now,
  }));
  return { items, overdue: items.filter((r) => r.isOverdue).length };
}
