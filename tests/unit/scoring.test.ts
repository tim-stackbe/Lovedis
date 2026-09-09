import { describe, expect, it } from "vitest";
import {
  CHALLENGE_FIT_GATE_MIN,
  CHALLENGE_WEIGHTS,
  SCORE_DIMENSIONS,
} from "@/lib/constants";
import {
  assertWeightsSumToOne,
  computeOverallScore,
  deriveRecommendation,
  evaluateScores,
  isChallengeFitGated,
  type DimensionScores,
} from "@/lib/scoring";

const full = (v: number): DimensionScores =>
  Object.fromEntries(SCORE_DIMENSIONS.map((d) => [d, v])) as DimensionScores;

describe("CHALLENGE_WEIGHTS invariant", () => {
  it("has exactly the 6 challenge criteria", () => {
    expect(SCORE_DIMENSIONS).toHaveLength(6);
    expect(Object.keys(CHALLENGE_WEIGHTS).sort()).toEqual(
      [...SCORE_DIMENSIONS].sort()
    );
  });

  it("sums to exactly 100 %", () => {
    const sum = SCORE_DIMENSIONS.reduce((a, d) => a + CHALLENGE_WEIGHTS[d], 0);
    expect(sum).toBeCloseTo(1, 10);
    expect(() => assertWeightsSumToOne()).not.toThrow();
  });

  it("assertWeightsSumToOne throws on a broken weight map", () => {
    expect(() =>
      assertWeightsSumToOne({ ...CHALLENGE_WEIGHTS, CHALLENGE_FIT: 0.99 })
    ).toThrow(/sum to 1/i);
  });
});

describe("computeOverallScore — weighted total (max 5.0, 2 decimals)", () => {
  it("returns 5.00 when every criterion is maxed", () => {
    expect(computeOverallScore(full(5))).toBe(5);
  });

  it("returns 0 when every criterion is 0", () => {
    expect(computeOverallScore(full(0))).toBe(0);
  });

  it("applies the exact per-criterion weights", () => {
    // Only CHALLENGE_FIT (30 %) scored 4 → 4 * 0.30 = 1.2
    const scores: DimensionScores = { CHALLENGE_FIT: 4 };
    expect(computeOverallScore(scores)).toBe(1.2);
  });

  it("rounds to two decimals", () => {
    // 3 across all criteria → 3.00
    expect(computeOverallScore(full(3))).toBe(3);
    // Mixed values that would otherwise carry long decimals
    const scores: DimensionScores = {
      CHALLENGE_FIT: 5, // 1.5
      MATURITY_FEASIBILITY: 3, // 0.6
      TEAM_EXECUTION: 4, // 0.6
      MARKET_SCALABILITY: 2, // 0.3
      STRATEGIC_ECOSYSTEM_FIT: 1, // 0.1
      TRACTION_REFERENCES: 5, // 0.5
    };
    expect(computeOverallScore(scores)).toBe(3.6);
  });
});

describe("Challenge-Fit hard gate", () => {
  it("is gated below the minimum", () => {
    expect(isChallengeFitGated({ CHALLENGE_FIT: CHALLENGE_FIT_GATE_MIN - 1 })).toBe(
      true
    );
    expect(isChallengeFitGated({})).toBe(true); // missing = 0 < min
  });

  it("is not gated at or above the minimum", () => {
    expect(isChallengeFitGated({ CHALLENGE_FIT: CHALLENGE_FIT_GATE_MIN })).toBe(
      false
    );
    expect(isChallengeFitGated({ CHALLENGE_FIT: 5 })).toBe(false);
  });

  it("gate overrides recommendation to STRONG_NO despite a high total", () => {
    // High everything but CHALLENGE_FIT = 2 → gated → STRONG_NO
    const scores: DimensionScores = {
      ...full(5),
      CHALLENGE_FIT: 2,
    };
    const result = evaluateScores(scores);
    expect(result.gated).toBe(true);
    expect(result.recommendation).toBe("STRONG_NO");
  });
});

describe("deriveRecommendation — 4-band challenge scheme", () => {
  it("maps the bands from the weighted total", () => {
    expect(deriveRecommendation(4.0)).toBe("STRONG_YES");
    expect(deriveRecommendation(4.5)).toBe("STRONG_YES");
    expect(deriveRecommendation(3.99)).toBe("YES");
    expect(deriveRecommendation(3.0)).toBe("YES");
    expect(deriveRecommendation(2.99)).toBe("NO");
    expect(deriveRecommendation(2.0)).toBe("NO");
    expect(deriveRecommendation(1.99)).toBe("STRONG_NO");
    expect(deriveRecommendation(0)).toBe("STRONG_NO");
  });

  it("never emits MAYBE", () => {
    for (let t = 0; t <= 5; t += 0.1) {
      expect(deriveRecommendation(Math.round(t * 100) / 100)).not.toBe("MAYBE");
    }
  });

  it("gate forces STRONG_NO regardless of total", () => {
    expect(deriveRecommendation(4.8, true)).toBe("STRONG_NO");
  });
});
