import type { CreditBucket } from "@/generated/prisma/enums";

// ---------------------------------------------------------------------------
// Venture-Credit-Töpfe (FIX / FLEX) — geteilte Konstanten + Anzeige-Helfer.
//
// Modell seit 28.09.2026: Jedes Startup erhält 10 Venture Credits, ALLE
// flexibel (FLEX) — frei einsetzbar für Support-Angebote, eingelöst bei
// CONFIRMED (1–2 Credits je Session). Die exklusiven Programme sind kostenlos
// und verbrauchen keine Credits. Der FIX-Topf bleibt im Datenmodell erhalten
// (Ledger-Historie), wird aber nicht mehr vergeben und nicht mehr angezeigt.
// ---------------------------------------------------------------------------

export const ONBOARDING_FIX_CREDITS = 0;
export const ONBOARDING_FLEX_CREDITS = 10;
export const ONBOARDING_CREDIT_TOTAL =
  ONBOARDING_FIX_CREDITS + ONBOARDING_FLEX_CREDITS; // 10

export const CREDIT_BUCKET_LABELS: Record<CreditBucket, string> = {
  FIX: "Fix",
  FLEX: "Flexibel",
};

export interface CreditBudget {
  /** Cached total balance (FIX + FLEX remaining). */
  balance: number;
  fixBalance: number;
  flexBalance: number;
}

export interface CreditBudgetView {
  /** Total budget the startup started with (default 10). */
  total: number;
  /** Remaining across both buckets (== balance). */
  remaining: number;
  /** Credits already used across both buckets. */
  used: number;
  fixTotal: number;
  fixRemaining: number;
  fixUsed: number;
  flexTotal: number;
  flexRemaining: number;
  flexUsed: number;
}

/**
 * Derives a "X von 10" budget view from the cached account balances. The
 * per-bucket totals default to the onboarding split (0/10) but grow if the team
 * grants more than the onboarding amount into a bucket (used > 0 with a higher
 * remaining), so the "von N" figure never understates what a startup holds.
 */
export function deriveCreditBudget(
  account: CreditBudget | null | undefined
): CreditBudgetView {
  const fixRemaining = account?.fixBalance ?? 0;
  const flexRemaining = account?.flexBalance ?? 0;
  const remaining = account?.balance ?? fixRemaining + flexRemaining;

  // Totals are the max of the onboarding grant and what's currently held, so a
  // top-up beyond the default never makes "remaining" exceed "total".
  const fixTotal = Math.max(ONBOARDING_FIX_CREDITS, fixRemaining);
  const flexTotal = Math.max(ONBOARDING_FLEX_CREDITS, flexRemaining);
  const total = fixTotal + flexTotal;

  return {
    total,
    remaining,
    used: Math.max(0, total - remaining),
    fixTotal,
    fixRemaining,
    fixUsed: Math.max(0, fixTotal - fixRemaining),
    flexTotal,
    flexRemaining,
    flexUsed: Math.max(0, flexTotal - flexRemaining),
  };
}
