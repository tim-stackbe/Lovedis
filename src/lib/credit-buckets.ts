import type { CreditBucket } from "@/generated/prisma/enums";

// ---------------------------------------------------------------------------
// Venture-Credit-Töpfe (FIX / FLEX) — geteilte Konstanten + Anzeige-Helfer.
//
// Notion-Modell (siehe docs/plan-marketplace-notion-feedback.md §2.2 + §5.2/§5.3):
// Jedes Startup erhält 12 Onboarding-Credits, aufgeteilt in
//   • 6 FIX  — reserviert für das exklusive Programm „Sales, Pricing & Growth".
//              Werden „nicht eingelöst, sondern nur angemeldet" — d. h. das
//              Buchen/Anmelden eines Programms verbraucht FIX (kein FLEX-Preis).
//   • 6 FLEX — frei einsetzbar für Mentor:innen-Sessions + Support-Angebote,
//              eingelöst bei CONFIRMED wie bisher (1–2 Credits je Session).
//
// INTERPRETATION (Default, im Team revidierbar): Das eine exklusive Programm
// verbraucht beim Anmelden das GESAMTE FIX-Kontingent (6 Credits) — 1:1 zu
// „6 Credits sind fix für die Sales-Journey verplant". Mentor:innen/Support
// ziehen aus FLEX. Beide Töpfe haben einen eigenen Boden bei 0.
// ---------------------------------------------------------------------------

export const ONBOARDING_FIX_CREDITS = 6;
export const ONBOARDING_FLEX_CREDITS = 6;
export const ONBOARDING_CREDIT_TOTAL =
  ONBOARDING_FIX_CREDITS + ONBOARDING_FLEX_CREDITS; // 12

/** FIX-Kontingent, das die Anmeldung zum exklusiven Programm verbraucht. */
export const PROGRAM_FIX_CREDIT_COST = 6;

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
  /** Total budget the startup started with (default 12). */
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
 * Derives a "X von 12" budget view from the cached account balances. The
 * per-bucket totals default to the onboarding split (6/6) but grow if the team
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
