"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import { requireAuth } from "@/lib/auth-guards";
import { canMessage } from "@/lib/messages";
import { prisma } from "@/lib/prisma";

const bodySchema = z
  .string()
  .trim()
  .min(1, "Nachricht darf nicht leer sein.")
  .max(4000, "Nachricht ist zu lang.");

async function isParticipant(
  conversationId: string,
  userId: string
): Promise<boolean> {
  const link = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
    select: { id: true },
  });
  return Boolean(link);
}

export async function sendMessage(
  conversationId: string,
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const session = await requireAuth();

  const parsed = bodySchema.safeParse(formData.get("body"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Nachricht." };
  }

  if (!(await isParticipant(conversationId, session.user.id))) {
    return { error: "Konversation nicht gefunden." };
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.message.create({
      data: { conversationId, senderId: session.user.id, body: parsed.data },
    }),
    prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: now },
    }),
    prisma.conversationParticipant.update({
      where: {
        conversationId_userId: { conversationId, userId: session.user.id },
      },
      data: { lastReadAt: now },
    }),
  ]);

  revalidatePath("/messages");
  return { success: "ok" };
}

/** Find-or-create a 1:1 conversation with another user; returns its id. */
export async function startConversation(
  recipientId: string
): Promise<{ conversationId?: string; error?: string }> {
  const session = await requireAuth();

  if (recipientId === session.user.id) {
    return { error: "Du kannst dir nicht selbst schreiben." };
  }

  const recipient = await prisma.user.findUnique({
    where: { id: recipientId },
    select: { role: true, isActive: true },
  });
  if (!recipient || !recipient.isActive) {
    return { error: "Empfänger nicht gefunden." };
  }
  if (!canMessage(session.user.role, recipient.role)) {
    return { error: "Du darfst diesem Nutzer nicht schreiben." };
  }

  const existing = await prisma.conversation.findFirst({
    where: {
      AND: [
        { participants: { some: { userId: session.user.id } } },
        { participants: { some: { userId: recipientId } } },
      ],
    },
    select: { id: true, _count: { select: { participants: true } } },
  });
  if (existing && existing._count.participants === 2) {
    return { conversationId: existing.id };
  }

  const created = await prisma.conversation.create({
    data: {
      participants: {
        create: [{ userId: session.user.id }, { userId: recipientId }],
      },
    },
    select: { id: true },
  });

  revalidatePath("/messages");
  return { conversationId: created.id };
}

export async function markConversationRead(
  conversationId: string
): Promise<void> {
  const session = await requireAuth();
  if (!(await isParticipant(conversationId, session.user.id))) return;
  await prisma.conversationParticipant.update({
    where: {
      conversationId_userId: { conversationId, userId: session.user.id },
    },
    data: { lastReadAt: new Date() },
  });
}
