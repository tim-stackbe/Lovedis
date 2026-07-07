import type { PrismaClient } from "@/generated/prisma/client";

// ---------------------------------------------------------------------------
// Onboarding-Guthaben („sponsored by LOVEDIS"). Jedes Startup startet mit 12
// Venture Credits (Notion-Modell). Der Grant läuft über den bestehenden Ledger
// (CreditTransaction type=GRANT) — der Ledger bleibt Single Source of Truth, die
// gecachte `balance` wird atomar mitgeführt. Idempotent: pro Konto wird höchstens
// EIN Onboarding-GRANT erzeugt (Guard auf type=GRANT + stabilem Grund-Text).
// ---------------------------------------------------------------------------

export const ONBOARDING_CREDIT_AMOUNT = 12;

export const ONBOARDING_CREDIT_REASON =
  "Onboarding-Guthaben — sponsored by LOVEDIS";

/**
 * Grants the one-time 12-credit onboarding balance to a startup, atomically and
 * idempotently. Ensures a CreditAccount exists, then — only if no onboarding
 * GRANT is already present — writes the GRANT transaction and increments the
 * cached balance in the same transaction. Returns true when a grant was newly
 * created, false when it was already present (no double-grant).
 */
export async function grantOnboardingCredits(
  db: PrismaClient,
  startupId: string,
  createdById?: string | null
): Promise<boolean> {
  return db.$transaction(async (tx) => {
    const account = await tx.creditAccount.upsert({
      where: { startupId },
      update: {},
      create: { startupId },
      select: { id: true },
    });

    const existing = await tx.creditTransaction.findFirst({
      where: {
        accountId: account.id,
        type: "GRANT",
        reason: ONBOARDING_CREDIT_REASON,
      },
      select: { id: true },
    });
    if (existing) return false;

    await tx.creditTransaction.create({
      data: {
        accountId: account.id,
        type: "GRANT",
        amount: ONBOARDING_CREDIT_AMOUNT,
        reason: ONBOARDING_CREDIT_REASON,
        createdById: createdById ?? null,
      },
    });
    await tx.creditAccount.update({
      where: { id: account.id },
      data: { balance: { increment: ONBOARDING_CREDIT_AMOUNT } },
    });
    return true;
  });
}
