import type {
  Recommendation,
  ScoreDimension,
} from "@/generated/prisma/enums";
import {
  CHALLENGE_FIT_GATE_MIN,
  CHALLENGE_WEIGHTS,
  DEFAULT_WEIGHTS,
  SCORE_DIMENSIONS,
} from "@/lib/constants";

export type DimensionScores = Partial<Record<ScoreDimension, number>>;
export type Weights = Record<ScoreDimension, number>;

/**
 * Asserts the challenge weights sum to 1.0 (= 100 %). Throws in dev/test so a
 * bad edit to CHALLENGE_WEIGHTS is caught immediately; also covered by a unit
 * test. Uses a small epsilon to tolerate floating-point noise.
 */
export function assertWeightsSumToOne(
  weights: Record<ScoreDimension, number> = CHALLENGE_WEIGHTS
): void {
  const sum = SCORE_DIMENSIONS.reduce((acc, d) => acc + (weights[d] ?? 0), 0);
  if (Math.abs(sum - 1) > 1e-9) {
    throw new Error(
      `CHALLENGE_WEIGHTS must sum to 1.0 (100 %), but got ${sum.toFixed(4)}.`
    );
  }
}

// Fail fast on module load if the canonical weights are misconfigured.
assertWeightsSumToOne();

/** Normalizes a weight map so all weights sum to 1 (guards against bad overrides). */
export function normalizeWeights(weights: Partial<Weights>): Weights {
  const merged: Weights = { ...DEFAULT_WEIGHTS, ...weights };
  const sum = SCORE_DIMENSIONS.reduce((acc, d) => acc + (merged[d] ?? 0), 0);
  if (sum <= 0) return { ...DEFAULT_WEIGHTS };
  const normalized = {} as Weights;
  for (const d of SCORE_DIMENSIONS) normalized[d] = (merged[d] ?? 0) / sum;
  return normalized;
}

/**
 * Weighted total (0–5): sum of each criterion's value × its weight, rounded to
 * 2 decimals. With the default weights summing to 1 and a max value of 5, the
 * maximum total is 5.00.
 */
export function computeOverallScore(
  scores: DimensionScores,
  weights: Partial<Weights> = DEFAULT_WEIGHTS
): number {
  const w = normalizeWeights(weights);
  const total = SCORE_DIMENSIONS.reduce(
    (acc, d) => acc + (scores[d] ?? 0) * w[d],
    0
  );
  return Math.round(total * 100) / 100;
}

/**
 * Challenge-Fit hard gate: true when CHALLENGE_FIT < CHALLENGE_FIT_GATE_MIN.
 * A gated startup is "Kein Fit (Gate)" regardless of its weighted total.
 */
export function isChallengeFitGated(scores: DimensionScores): boolean {
  return (scores.CHALLENGE_FIT ?? 0) < CHALLENGE_FIT_GATE_MIN;
}

/**
 * Recommendation from the weighted total, with the Challenge-Fit gate override.
 * Bands (gate not triggered):
 *   total >= 4.0        → STRONG_YES  ("Klares Ja")
 *   3.0 <= total < 4.0  → YES         ("Ja mit Nachfassen")
 *   2.0 <= total < 3.0  → NO          ("Eher Nein")
 *   total < 2.0         → STRONG_NO   ("Klares Nein")
 * Gate triggered         → STRONG_NO  (plus the "Kein Fit (Gate)" status label)
 *
 * Note: the 4-band scheme deliberately does NOT emit MAYBE; the enum value is
 * retained only for legacy rows / the DB default.
 */
export function deriveRecommendation(
  overallScore: number,
  gated = false
): Recommendation {
  if (gated) return "STRONG_NO";
  if (overallScore >= 4.0) return "STRONG_YES";
  if (overallScore >= 3.0) return "YES";
  if (overallScore >= 2.0) return "NO";
  return "STRONG_NO";
}

export interface EvaluationResult {
  overallScore: number;
  recommendation: Recommendation;
  /** Challenge-Fit gate triggered (status: "Kein Fit (Gate)"). */
  gated: boolean;
}

/** Full evaluation derivation used by forms, compare, radar and reports. */
export function evaluateScores(
  scores: DimensionScores,
  weights: Partial<Weights> = DEFAULT_WEIGHTS
): EvaluationResult {
  const overallScore = computeOverallScore(scores, weights);
  const gated = isChallengeFitGated(scores);
  return {
    overallScore,
    gated,
    recommendation: deriveRecommendation(overallScore, gated),
  };
}

/** Converts a Score[] relation (from Prisma) into a DimensionScores map. */
export function scoresToMap(
  scores: { dimension: ScoreDimension; value: number }[]
): DimensionScores {
  const map: DimensionScores = {};
  for (const s of scores) map[s.dimension] = s.value;
  return map;
}
