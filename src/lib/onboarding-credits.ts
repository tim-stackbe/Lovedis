import type { PrismaClient } from "@/generated/prisma/client";
import { ONBOARDING_FLEX_CREDITS } from "@/lib/credit-buckets";

// ---------------------------------------------------------------------------
// Onboarding-Guthaben („sponsored by LOVEDIS"). Jedes Startup startet mit 10
// Venture Credits, alle flexibel (FLEX). Der Grant läuft über den bestehenden
// Ledger (eine CreditTransaction type=GRANT) — der Ledger bleibt Single Source
// of Truth, die gecachten Salden (balance/flexBalance) werden atomar
// mitgeführt. Idempotent: pro Konto wird höchstens EIN Onboarding-Grant
// erzeugt (Guard auf type=GRANT + stabilem Grund-Präfix).
// ---------------------------------------------------------------------------

/** Total onboarding amount (kept for backwards-compatible imports). */
export const ONBOARDING_CREDIT_AMOUNT = ONBOARDING_FLEX_CREDITS;

/** Stable prefix used as the idempotency guard (also matches legacy grants). */
export const ONBOARDING_CREDIT_REASON =
  "Onboarding-Guthaben — sponsored by LOVEDIS";

export const ONBOARDING_FLEX_REASON = `${ONBOARDING_CREDIT_REASON} (Flexibel)`;

/**
 * Grants the one-time 10-credit onboarding balance to a startup, atomically and
 * idempotently. Ensures a CreditAccount exists, then — only if no onboarding
 * GRANT is already present — writes the FLEX GRANT transaction and increments
 * the cached total + flex balance in the same transaction. Returns true when a
 * grant was newly created, false when it was already present (no double-grant).
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

    // Guard on the stable prefix so any earlier onboarding grant (legacy +12,
    // the 6/6 split, or this one) counts as "already onboarded".
    const existing = await tx.creditTransaction.findFirst({
      where: {
        accountId: account.id,
        type: "GRANT",
        reason: { startsWith: ONBOARDING_CREDIT_REASON },
      },
      select: { id: true },
    });
    if (existing) return false;

    await tx.creditTransaction.create({
      data: {
        accountId: account.id,
        type: "GRANT",
        bucket: "FLEX",
        amount: ONBOARDING_FLEX_CREDITS,
        reason: ONBOARDING_FLEX_REASON,
        createdById: createdById ?? null,
      },
    });
    await tx.creditAccount.update({
      where: { id: account.id },
      data: {
        balance: { increment: ONBOARDING_FLEX_CREDITS },
        flexBalance: { increment: ONBOARDING_FLEX_CREDITS },
      },
    });
    return true;
  });
}
