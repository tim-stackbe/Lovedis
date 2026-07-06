import type { Recommendation, UserRole } from "@/generated/prisma/enums";
import { CHALLENGE_WEIGHTS, SCORE_DIMENSIONS } from "@/lib/constants";
import { VENTURE_SCOUT_ROLES } from "@/lib/roles";
import {
  computeOverallScore,
  deriveRecommendation,
  evaluateScores,
  isChallengeFitGated,
  type DimensionScores,
} from "@/lib/scoring";

/**
 * Team consensus scoring
 * ----------------------
 * When several Lovedis team members each fill in their own 6-criteria matrix
 * for the same startup, we aggregate their evaluations into ONE combined
 * consensus result. This module holds the PURE (DB-free, unit-testable) part;
 * the Prisma data-loading lives in `src/lib/consensus-data.ts`.
 *
 * Design decisions (applied as defaults here, see the task brief):
 *  1. Which evaluations count — only evaluators whose CURRENT role is in
 *     VENTURE_SCOUT_ROLES (ADMIN/MEMBER). If a user later loses that role their
 *     evaluation is dropped from the aggregate. We filter on `evaluatorRole`
 *     (the freshly-looked-up role), not on who authored the row.
 *  2. One-per-evaluator — if an evaluator has multiple evaluations for a
 *     startup we keep only their MOST RECENT one (by `updatedAt`), then
 *     aggregate across distinct evaluators.
 *  3. Aggregation = mean per criterion — for each of the 6 criteria we average
 *     the score value (0–5) across the participating evaluators. The consensus
 *     weighted total is `computeOverallScore(perCriterionMean)` using
 *     CHALLENGE_WEIGHTS (rounded to 2 decimals). This is mathematically the
 *     mean of the individual weighted totals — we deliberately compute it from
 *     the per-criterion means so the number stays consistent with the table.
 *  4. Gate on the aggregate — the Challenge-Fit gate triggers when the AVERAGED
 *     CHALLENGE_FIT criterion < 3 → consensus status "Kein Fit (Gate)" and the
 *     recommendation is forced to STRONG_NO (same rule as an individual, but on
 *     the mean).
 *  5. Consensus recommendation — derived from the aggregated weighted total via
 *     the existing `deriveRecommendation` bands (+ the gate override).
 *  6. Divergence — we expose `evaluatorCount`, a per-evaluator `breakdown`
 *     (total + recommendation + gate) and the min/max individual total so
 *     disagreement is visible.
 *
 * All constants are reused from `@/lib/constants` / `@/lib/scoring`; nothing is
 * duplicated here.
 */

/** A single evaluator's evaluation, fed into the aggregator. */
export interface EvaluatorEvaluationInput {
  /** Distinct evaluator identity — used to dedupe multiple evaluations. */
  evaluatorId: string;
  evaluatorName: string;
  /** The evaluator's CURRENT role (looked up now, not the author snapshot). */
  evaluatorRole: UserRole;
  /** Per-criterion score values (0–5) for this evaluation. */
  scores: DimensionScores;
  /** Timestamp used to pick the most recent evaluation per evaluator. */
  updatedAt: Date | string | number;
}

/** One evaluator's individual result, surfaced alongside the consensus. */
export interface ConsensusBreakdownEntry {
  evaluatorId: string;
  evaluatorName: string;
  /** This evaluator's own weighted total (0–5, 2 decimals). */
  overallScore: number;
  recommendation: Recommendation;
  /** This evaluator individually tripped the Challenge-Fit gate. */
  gated: boolean;
}

export interface ConsensusResult {
  /** Number of distinct scout-role evaluators contributing to the consensus. */
  evaluatorCount: number;
  /** Mean score (0–5) per criterion across the participating evaluators. */
  perCriterionMean: DimensionScores;
  /** Consensus weighted total (0–5, 2 decimals) from the per-criterion means. */
  weightedTotal: number;
  /** Consensus Challenge-Fit gate (averaged CHALLENGE_FIT < 3). */
  gated: boolean;
  /** Consensus recommendation (gate-aware). */
  recommendation: Recommendation;
  /** Per-evaluator individual results (for divergence). */
  breakdown: ConsensusBreakdownEntry[];
  /** Lowest / highest individual weighted total (null when no evaluators). */
  minTotal: number | null;
  maxTotal: number | null;
}

function toMillis(value: Date | string | number): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  return new Date(value).getTime();
}

/** True when a role currently belongs to the Venture Scout module (ADMIN/MEMBER). */
export function isScoutRole(role: UserRole): boolean {
  return VENTURE_SCOUT_ROLES.includes(role);
}

/**
 * The empty consensus (n = 0). Callers should branch on `evaluatorCount === 0`
 * and render "noch nicht bewertet" — the zeroed numbers below are placeholders
 * and intentionally NOT treated as a real STRONG_NO/gate verdict by the UI.
 */
const EMPTY_CONSENSUS: ConsensusResult = {
  evaluatorCount: 0,
  perCriterionMean: {},
  weightedTotal: 0,
  gated: false,
  recommendation: "STRONG_NO",
  breakdown: [],
  minTotal: null,
  maxTotal: null,
};

/**
 * Aggregates a set of evaluations into a single team consensus result.
 *
 * Steps: (1) drop non-scout-role evaluators, (2) keep the most recent
 * evaluation per distinct evaluator, (3) mean per criterion, (4) weighted total
 * from those means, (5) gate on the averaged Challenge Fit, (6) build the
 * per-evaluator breakdown. Pure and deterministic.
 *
 * n = 0 → EMPTY_CONSENSUS ("noch nicht bewertet").
 * n = 1 → the consensus equals that single evaluation (means collapse to it).
 */
export function aggregateEvaluations(
  evaluations: EvaluatorEvaluationInput[]
): ConsensusResult {
  // (1) Only evaluators whose CURRENT role is a scout role count.
  const eligible = evaluations.filter((e) => isScoutRole(e.evaluatorRole));

  // (2) Dedupe to the most recent evaluation per distinct evaluator.
  const latestByEvaluator = new Map<string, EvaluatorEvaluationInput>();
  for (const e of eligible) {
    const existing = latestByEvaluator.get(e.evaluatorId);
    if (!existing || toMillis(e.updatedAt) >= toMillis(existing.updatedAt)) {
      latestByEvaluator.set(e.evaluatorId, e);
    }
  }
  const participants = [...latestByEvaluator.values()];

  if (participants.length === 0) return EMPTY_CONSENSUS;

  // (3) Mean per criterion (missing value counts as 0, consistent with
  //     computeOverallScore's `scores[d] ?? 0`).
  const perCriterionMean: DimensionScores = {};
  for (const dimension of SCORE_DIMENSIONS) {
    const sum = participants.reduce(
      (acc, p) => acc + (p.scores[dimension] ?? 0),
      0
    );
    perCriterionMean[dimension] = sum / participants.length;
  }

  // (4) + (5) Weighted total & gate from the aggregated means.
  const weightedTotal = computeOverallScore(perCriterionMean, CHALLENGE_WEIGHTS);
  const gated = isChallengeFitGated(perCriterionMean);
  const recommendation = deriveRecommendation(weightedTotal, gated);

  // (6) Per-evaluator breakdown (each evaluator's own gate/recommendation).
  const breakdown: ConsensusBreakdownEntry[] = participants.map((p) => {
    const individual = evaluateScores(p.scores, CHALLENGE_WEIGHTS);
    return {
      evaluatorId: p.evaluatorId,
      evaluatorName: p.evaluatorName,
      overallScore: individual.overallScore,
      recommendation: individual.recommendation,
      gated: individual.gated,
    };
  });

  const totals = breakdown.map((b) => b.overallScore);

  return {
    evaluatorCount: participants.length,
    perCriterionMean,
    weightedTotal,
    gated,
    recommendation,
    breakdown,
    minTotal: Math.min(...totals),
    maxTotal: Math.max(...totals),
  };
}
