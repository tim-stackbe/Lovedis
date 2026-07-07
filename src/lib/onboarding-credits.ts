import type { PrismaClient } from "@/generated/prisma/client";
import {
  ONBOARDING_CREDIT_TOTAL,
  ONBOARDING_FIX_CREDITS,
  ONBOARDING_FLEX_CREDITS,
} from "@/lib/credit-buckets";

// ---------------------------------------------------------------------------
// Onboarding-Guthaben („sponsored by LOVEDIS"). Jedes Startup startet mit 12
// Venture Credits (Notion-Modell), aufgeteilt in 6 FIX (Programm-Kontingent)
// + 6 FLEX (frei einsetzbar). Der Grant läuft über den bestehenden Ledger
// (zwei CreditTransaction type=GRANT, je Topf) — der Ledger bleibt Single
// Source of Truth, die gecachten Salden (balance/fixBalance/flexBalance) werden
// atomar mitgeführt. Idempotent: pro Konto wird höchstens EIN Onboarding-Grant
// erzeugt (Guard auf type=GRANT + stabilem Grund-Präfix).
// ---------------------------------------------------------------------------

/** Total onboarding amount (kept for backwards-compatible imports). */
export const ONBOARDING_CREDIT_AMOUNT = ONBOARDING_CREDIT_TOTAL;

/** Stable prefix used as the idempotency guard across both bucket grants. */
export const ONBOARDING_CREDIT_REASON =
  "Onboarding-Guthaben — sponsored by LOVEDIS";

export const ONBOARDING_FIX_REASON = `${ONBOARDING_CREDIT_REASON} (Fix — Programm)`;
export const ONBOARDING_FLEX_REASON = `${ONBOARDING_CREDIT_REASON} (Flexibel)`;

/**
 * Grants the one-time 12-credit onboarding balance to a startup, atomically and
 * idempotently, split into 6 FIX + 6 FLEX. Ensures a CreditAccount exists, then
 * — only if no onboarding GRANT is already present — writes the two GRANT
 * transactions and increments the cached total + per-bucket balances in the
 * same transaction. Returns true when a grant was newly created, false when it
 * was already present (no double-grant).
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

    // Guard on the stable prefix so either the legacy single +12 GRANT or the
    // new split grant counts as "already onboarded".
    const existing = await tx.creditTransaction.findFirst({
      where: {
        accountId: account.id,
        type: "GRANT",
        reason: { startsWith: ONBOARDING_CREDIT_REASON },
      },
      select: { id: true },
    });
    if (existing) return false;

    await tx.creditTransaction.createMany({
      data: [
        {
          accountId: account.id,
          type: "GRANT",
          bucket: "FIX",
          amount: ONBOARDING_FIX_CREDITS,
          reason: ONBOARDING_FIX_REASON,
          createdById: createdById ?? null,
        },
        {
          accountId: account.id,
          type: "GRANT",
          bucket: "FLEX",
          amount: ONBOARDING_FLEX_CREDITS,
          reason: ONBOARDING_FLEX_REASON,
          createdById: createdById ?? null,
        },
      ],
    });
    await tx.creditAccount.update({
      where: { id: account.id },
      data: {
        balance: { increment: ONBOARDING_CREDIT_TOTAL },
        fixBalance: { increment: ONBOARDING_FIX_CREDITS },
        flexBalance: { increment: ONBOARDING_FLEX_CREDITS },
      },
    });
    return true;
  });
}
