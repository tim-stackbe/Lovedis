"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { firstZodError, type ActionState } from "@/lib/action-state";
import { requireTeam } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Venture credit ledger. The team books transactions against a per-startup
// CreditAccount; the account keeps a cached running `balance`. Sign convention:
// GRANT adds, SPEND subtracts, ADJUSTMENT applies the signed amount as entered.
// ---------------------------------------------------------------------------

const bookingSchema = z.object({
  startupId: z.string().min(1, "Startup ist erforderlich"),
  type: z.enum(["GRANT", "SPEND", "ADJUSTMENT"]),
  amount: z.coerce.number().int("Ganze Zahl erwartet"),
  reason: z.string().min(1, "Grund ist erforderlich").max(280),
});

/**
 * Returns the existing account id for a startup, creating one if needed.
 * Uses upsert so two concurrent first-time bookings can't race into a P2002 on
 * the unique startupId.
 */
async function ensureAccount(startupId: string): Promise<string> {
  const account = await prisma.creditAccount.upsert({
    where: { startupId },
    update: {},
    create: { startupId },
    select: { id: true },
  });
  return account.id;
}

export async function bookCreditTransaction(
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const session = await requireTeam();
  const parsed = bookingSchema.safeParse({
    startupId: formData.get("startupId"),
    type: formData.get("type"),
    amount: formData.get("amount"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  const { startupId, type, reason } = parsed.data;
  const magnitude = Math.abs(parsed.data.amount);
  if (magnitude === 0) return { error: "Betrag darf nicht 0 sein." };

  // Normalise the signed delta from the (positive) magnitude + type. For
  // ADJUSTMENT we keep the entered sign so corrections can go either way.
  let delta: number;
  if (type === "GRANT") delta = magnitude;
  else if (type === "SPEND") delta = -magnitude;
  else delta = parsed.data.amount;

  const startup = await prisma.startup.findUnique({
    where: { id: startupId },
    select: { id: true },
  });
  if (!startup) return { error: "Startup nicht gefunden." };

  const accountId = await ensureAccount(startupId);

  await prisma.$transaction([
    prisma.creditTransaction.create({
      data: {
        accountId,
        type,
        amount: delta,
        reason,
        createdById: session.user.id,
      },
    }),
    prisma.creditAccount.update({
      where: { id: accountId },
      data: { balance: { increment: delta } },
    }),
  ]);

  revalidatePath("/credits");
  revalidatePath("/venture/credits");
  revalidatePath("/venture");
  return { success: "Buchung erfasst." };
}
