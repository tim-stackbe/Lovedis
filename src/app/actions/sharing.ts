"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { firstZodError, type ActionState } from "@/lib/action-state";
import { requireRole } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

const shareSchema = z.object({
  evaluationId: z.string().min(1),
  recipientId: z.string().min(1),
  message: z.string().max(2000).optional(),
});

export async function shareScoring(
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const session = await requireRole(["ADMIN"]);

  const parsed = shareSchema.safeParse({
    evaluationId: formData.get("evaluationId"),
    recipientId: formData.get("recipientId"),
    message: formData.get("message") || undefined,
  });
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  const [evaluation, recipient] = await Promise.all([
    prisma.evaluation.findUnique({
      where: { id: parsed.data.evaluationId },
      select: { id: true },
    }),
    prisma.user.findUnique({
      where: { id: parsed.data.recipientId },
      select: { role: true, isActive: true },
    }),
  ]);
  if (!evaluation) return { error: "Evaluation not found." };
  if (
    !recipient ||
    !recipient.isActive ||
    !["BUSINESS_PARTNER", "INVESTOR"].includes(recipient.role)
  ) {
    return { error: "Recipient must be an active partner or investor." };
  }

  const existing = await prisma.sharedScoring.findUnique({
    where: {
      evaluationId_recipientId: {
        evaluationId: parsed.data.evaluationId,
        recipientId: parsed.data.recipientId,
      },
    },
  });
  if (existing) {
    return { error: "This scoring is already shared with that recipient." };
  }

  await prisma.sharedScoring.create({
    data: {
      evaluationId: parsed.data.evaluationId,
      recipientId: parsed.data.recipientId,
      sharedById: session.user.id,
      message: parsed.data.message,
    },
  });

  revalidatePath("/sharing");
  revalidatePath("/scorings");
  revalidatePath("/dashboard/partner");
  revalidatePath("/dashboard/investor");
  return { success: "Scoring shared." };
}

export async function revokeSharedScoring(sharingId: string): Promise<void> {
  await requireRole(["ADMIN"]);
  await prisma.sharedScoring.delete({ where: { id: sharingId } });
  revalidatePath("/sharing");
  revalidatePath("/scorings");
}
