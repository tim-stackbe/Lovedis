import type {
  Recommendation,
  ScoreDimension,
} from "@/generated/prisma/enums";
import {
  DEFAULT_WEIGHTS,
  MAX_SCORE,
  SCORE_DIMENSIONS,
  type Quadrant,
} from "@/lib/constants";

export type DimensionScores = Partial<Record<ScoreDimension, number>>;
export type Weights = Record<ScoreDimension, number>;

/** Normalizes a weight map so all weights sum to 1 (guards against bad overrides). */
export function normalizeWeights(weights: Partial<Weights>): Weights {
  const merged: Weights = { ...DEFAULT_WEIGHTS, ...weights };
  const sum = SCORE_DIMENSIONS.reduce((acc, d) => acc + (merged[d] ?? 0), 0);
  if (sum <= 0) return { ...DEFAULT_WEIGHTS };
  const normalized = {} as Weights;
  for (const d of SCORE_DIMENSIONS) normalized[d] = (merged[d] ?? 0) / sum;
  return normalized;
}

/** Weighted overall score (0–5) across the 7 dimensions. */
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
 * Potential = upside-oriented dimensions (market, traction, business model).
 * Feasibility = execution-oriented dimensions (product, team, competitive
 * position, strategic fit). Both 0–5.
 */
export function computePotential(scores: DimensionScores): number {
  const dims: ScoreDimension[] = ["MARKET", "TRACTION", "BUSINESS_MODEL"];
  const v = dims.reduce((acc, d) => acc + (scores[d] ?? 0), 0) / dims.length;
  return Math.round(v * 100) / 100;
}

export function computeFeasibility(scores: DimensionScores): number {
  const dims: ScoreDimension[] = [
    "PRODUCT",
    "TEAM",
    "COMPETITIVE_POSITION",
    "STRATEGIC_FIT",
  ];
  const v = dims.reduce((acc, d) => acc + (scores[d] ?? 0), 0) / dims.length;
  return Math.round(v * 100) / 100;
}

const QUADRANT_THRESHOLD = MAX_SCORE / 2; // 2.5

/** Potential × Feasibility → 4-quadrant matrix. */
export function deriveQuadrant(
  potential: number,
  feasibility: number
): Quadrant {
  const highP = potential >= QUADRANT_THRESHOLD;
  const highF = feasibility >= QUADRANT_THRESHOLD;
  if (highP && highF) return "MONEY_MAKER";
  if (highP && !highF) return "DREAMER";
  if (!highP && highF) return "SOLID_BET";
  return "PASS";
}

/** Recommendation mapping from the weighted overall score. */
export function deriveRecommendation(overallScore: number): Recommendation {
  if (overallScore >= 4.2) return "STRONG_YES";
  if (overallScore >= 3.4) return "YES";
  if (overallScore >= 2.4) return "MAYBE";
  if (overallScore >= 1.4) return "NO";
  return "STRONG_NO";
}

export interface EvaluationResult {
  overallScore: number;
  potential: number;
  feasibility: number;
  quadrant: Quadrant;
  recommendation: Recommendation;
}

/** Full evaluation derivation used by forms, compare, radar and reports. */
export function evaluateScores(
  scores: DimensionScores,
  weights: Partial<Weights> = DEFAULT_WEIGHTS
): EvaluationResult {
  const overallScore = computeOverallScore(scores, weights);
  const potential = computePotential(scores);
  const feasibility = computeFeasibility(scores);
  return {
    overallScore,
    potential,
    feasibility,
    quadrant: deriveQuadrant(potential, feasibility),
    recommendation: deriveRecommendation(overallScore),
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
