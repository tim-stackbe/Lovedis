"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type {
  SupportTicketCategory,
  SupportTicketStatus,
} from "@/generated/prisma/enums";
import { firstZodError, type ActionState } from "@/lib/action-state";
import {
  requireApprovedAccess,
  requireRole,
  requireSupportCreator,
  SUPPORT_CREATOR_ROLES,
} from "@/lib/auth-guards";
import { ROLE_HOMES } from "@/lib/roles";
import { redirect } from "next/navigation";
import {
  SUPPORT_TICKET_CATEGORIES,
  SUPPORT_TICKET_STATUSES,
} from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import {
  sendNewSupportTicketEmail,
  sendSupportStaffReplyEmail,
  sendSupportUserReplyEmail,
} from "@/lib/support-ticket-email";

const REVALIDATE_PATHS = [
  "/support",
  "/support/new",
  "/support/admin",
  "/dashboard/admin",
];

function revalidateSupport(ticketId?: string) {
  for (const path of REVALIDATE_PATHS) revalidatePath(path);
  if (ticketId) {
    revalidatePath(`/support/${ticketId}`);
    revalidatePath(`/support/admin/${ticketId}`);
  }
}

const createSchema = z.object({
  subject: z
    .string()
    .trim()
    .min(3, "Bitte gib einen Betreff an (mindestens 3 Zeichen).")
    .max(200, "Betreff ist zu lang."),
  category: z.enum(
    SUPPORT_TICKET_CATEGORIES as [
      SupportTicketCategory,
      ...SupportTicketCategory[],
    ]
  ),
  body: z
    .string()
    .trim()
    .min(10, "Bitte beschreibe dein Anliegen in mindestens 10 Zeichen.")
    .max(5000, "Nachricht ist zu lang."),
});

export async function createSupportTicket(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const session = await requireSupportCreator();
  const parsed = createSchema.safeParse({
    subject: formData.get("subject"),
    category: formData.get("category"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  const { subject, category, body } = parsed.data;

  const ticket = await prisma.$transaction(async (tx) => {
    const created = await tx.supportTicket.create({
      data: {
        subject,
        category,
        createdById: session.user.id,
        messages: {
          create: {
            body,
            authorId: session.user.id,
            isStaff: false,
          },
        },
      },
      include: {
        createdBy: { select: { name: true, email: true } },
      },
    });
    return created;
  });

  void sendNewSupportTicketEmail({
    ticketNumber: ticket.number,
    subject: ticket.subject,
    category: ticket.category,
    creatorName: ticket.createdBy.name ?? "Nutzer",
    creatorEmail: ticket.createdBy.email,
    ticketId: ticket.id,
  });

  revalidateSupport(ticket.id);
  return {
    success: "Dein Support-Ticket wurde erstellt.",
    redirectTo: `/support/${ticket.id}`,
  };
}

const replySchema = z.object({
  ticketId: z.string().min(1),
  body: z
    .string()
    .trim()
    .min(1, "Bitte gib eine Nachricht ein.")
    .max(5000, "Nachricht ist zu lang."),
});

export async function replyToSupportTicket(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const parsed = replySchema.safeParse({
    ticketId: formData.get("ticketId"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  const { ticketId, body } = parsed.data;

  const session = await requireApprovedAccess();
  const isAdmin = session.user.role === "ADMIN";
  const isCreator = SUPPORT_CREATOR_ROLES.includes(
    session.user.role as (typeof SUPPORT_CREATOR_ROLES)[number]
  );

  if (!isAdmin && !isCreator) {
    redirect(ROLE_HOMES[session.user.role]);
  }

  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  if (!ticket) {
    return { error: "Ticket nicht gefunden." };
  }

  if (!isAdmin && ticket.createdById !== session.user.id) {
    return { error: "Kein Zugriff auf dieses Ticket." };
  }

  if (ticket.status === "RESOLVED") {
    return { error: "Dieses Ticket ist bereits erledigt." };
  }

  let nextStatus: SupportTicketStatus = ticket.status;
  if (isAdmin) {
    nextStatus = "WAITING_ON_USER";
  } else if (ticket.status === "WAITING_ON_USER") {
    nextStatus = "IN_PROGRESS";
  } else if (ticket.status === "OPEN") {
    nextStatus = "IN_PROGRESS";
  }

  await prisma.$transaction(async (tx) => {
    await tx.supportTicketMessage.create({
      data: {
        ticketId,
        body,
        authorId: session.user.id,
        isStaff: isAdmin,
      },
    });

    await tx.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: nextStatus,
        handledById: isAdmin
          ? (ticket.handledById ?? session.user.id)
          : ticket.handledById,
      },
    });
  });

  if (isAdmin) {
    void sendSupportStaffReplyEmail({
      to: ticket.createdBy.email,
      creatorName: ticket.createdBy.name ?? "",
      ticketNumber: ticket.number,
      subject: ticket.subject,
      ticketId: ticket.id,
    });
  } else {
    void sendSupportUserReplyEmail({
      ticketNumber: ticket.number,
      subject: ticket.subject,
      creatorName: ticket.createdBy.name ?? session.user.name ?? "Nutzer",
      ticketId: ticket.id,
    });
  }

  revalidateSupport(ticketId);
  return { success: "Antwort gesendet." };
}

const statusSchema = z.object({
  ticketId: z.string().min(1),
  status: z.enum(
    SUPPORT_TICKET_STATUSES as [
      SupportTicketStatus,
      ...SupportTicketStatus[],
    ]
  ),
});

export async function updateSupportTicketStatus(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  await requireRole(["ADMIN"]);

  const parsed = statusSchema.safeParse({
    ticketId: formData.get("ticketId"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  const { ticketId, status } = parsed.data;

  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    select: { id: true },
  });
  if (!ticket) {
    return { error: "Ticket nicht gefunden." };
  }

  await prisma.supportTicket.update({
    where: { id: ticketId },
    data: {
      status,
      closedAt: status === "RESOLVED" ? new Date() : null,
    },
  });

  revalidateSupport(ticketId);
  return { success: "Status aktualisiert." };
}

export async function assignSupportTicket(ticketId: string): Promise<ActionState> {
  const session = await requireRole(["ADMIN"]);

  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    select: { id: true, handledById: true, status: true },
  });
  if (!ticket) {
    return { error: "Ticket nicht gefunden." };
  }

  const updates: {
    handledById: string;
    status?: SupportTicketStatus;
  } = {
    handledById: session.user.id,
  };

  if (ticket.status === "OPEN") {
    updates.status = "IN_PROGRESS";
  }

  await prisma.supportTicket.update({
    where: { id: ticketId },
    data: updates,
  });

  revalidateSupport(ticketId);
  return { success: "Ticket übernommen." };
}
