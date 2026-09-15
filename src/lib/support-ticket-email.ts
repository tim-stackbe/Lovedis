import { sendEmail, type EmailSendResult } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import {
  SUPPORT_TICKET_CATEGORY_LABELS,
  SUPPORT_TICKET_STATUS_LABELS,
} from "@/lib/constants";
import type {
  SupportTicketCategory,
  SupportTicketStatus,
} from "@/generated/prisma/enums";

function appBaseUrl(): string {
  return (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export async function resolveSupportAdminEmail(): Promise<string | null> {
  const configured = process.env.SUPPORT_ADMIN_EMAIL?.trim();
  if (configured) return configured;

  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN", isActive: true },
    select: { email: true },
    orderBy: { createdAt: "asc" },
  });
  return admin?.email ?? null;
}

export async function sendNewSupportTicketEmail(opts: {
  ticketNumber: number;
  subject: string;
  category: SupportTicketCategory;
  creatorName: string;
  creatorEmail: string;
  ticketId: string;
}): Promise<EmailSendResult | null> {
  const to = await resolveSupportAdminEmail();
  if (!to) return null;

  const url = `${appBaseUrl()}/support/admin/${opts.ticketId}`;

  return sendEmail({
    to,
    subject: `[LOVEDIS Support] Neues Ticket #${opts.ticketNumber}: ${opts.subject}`,
    text:
      `Neues Support-Ticket #${opts.ticketNumber}\n\n` +
      `Betreff: ${opts.subject}\n` +
      `Kategorie: ${SUPPORT_TICKET_CATEGORY_LABELS[opts.category]}\n` +
      `Von: ${opts.creatorName} (${opts.creatorEmail})\n\n` +
      `Ticket bearbeiten:\n${url}\n\n` +
      `— LOVEDIS Support`,
  });
}

export async function sendSupportStaffReplyEmail(opts: {
  to: string;
  creatorName: string;
  ticketNumber: number;
  subject: string;
  ticketId: string;
}): Promise<EmailSendResult> {
  const greeting = opts.creatorName.trim()
    ? `Hallo ${opts.creatorName},`
    : "Hallo,";
  const url = `${appBaseUrl()}/support/${opts.ticketId}`;

  return sendEmail({
    to: opts.to,
    subject: `LOVEDIS Support — Antwort zu Ticket #${opts.ticketNumber}`,
    text:
      `${greeting}\n\n` +
      `das LOVEDIS-Team hat auf dein Support-Ticket geantwortet.\n\n` +
      `Ticket #${opts.ticketNumber}: ${opts.subject}\n\n` +
      `Antwort ansehen:\n${url}\n\n` +
      `Viele Grüße\nDein LOVEDIS-Team`,
  });
}

export async function sendSupportUserReplyEmail(opts: {
  ticketNumber: number;
  subject: string;
  creatorName: string;
  ticketId: string;
}): Promise<EmailSendResult | null> {
  const to = await resolveSupportAdminEmail();
  if (!to) return null;

  const url = `${appBaseUrl()}/support/admin/${opts.ticketId}`;

  return sendEmail({
    to,
    subject: `[LOVEDIS Support] Neue Antwort auf Ticket #${opts.ticketNumber}`,
    text:
      `Neue Nutzer-Antwort auf Support-Ticket #${opts.ticketNumber}\n\n` +
      `Betreff: ${opts.subject}\n` +
      `Von: ${opts.creatorName}\n\n` +
      `Ticket bearbeiten:\n${url}\n\n` +
      `— LOVEDIS Support`,
  });
}

export function formatSupportStatusLabel(status: SupportTicketStatus): string {
  return SUPPORT_TICKET_STATUS_LABELS[status];
}
