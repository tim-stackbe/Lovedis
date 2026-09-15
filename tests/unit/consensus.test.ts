import { describe, expect, it } from "vitest";
import { SCORE_DIMENSIONS } from "@/lib/constants";
import {
  aggregateEvaluations,
  type EvaluatorEvaluationInput,
} from "@/lib/consensus";
import { computeOverallScore, type DimensionScores } from "@/lib/scoring";

/** All six criteria set to the same value. */
const full = (v: number): DimensionScores =>
  Object.fromEntries(SCORE_DIMENSIONS.map((d) => [d, v])) as DimensionScores;

/** CHALLENGE_FIT + the remaining five criteria set explicitly (band tests). */
const mk = (challengeFit: number, rest: number): DimensionScores =>
  ({ ...full(rest), CHALLENGE_FIT: challengeFit }) as DimensionScores;

function evalInput(
  id: string,
  scores: DimensionScores,
  overrides: Partial<EvaluatorEvaluationInput> = {}
): EvaluatorEvaluationInput {
  return {
    evaluatorId: id,
    evaluatorName: `Evaluator ${id}`,
    evaluatorRole: "MEMBER",
    scores,
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

describe("aggregateEvaluations — edge cases", () => {
  it("n = 0 → empty consensus (noch nicht bewertet)", () => {
    const r = aggregateEvaluations([]);
    expect(r.evaluatorCount).toBe(0);
    expect(r.breakdown).toEqual([]);
    expect(r.weightedTotal).toBe(0);
    expect(r.gated).toBe(false);
    expect(r.minTotal).toBeNull();
    expect(r.maxTotal).toBeNull();
  });

  it("n = 1 → consensus equals that single evaluation", () => {
    const scores = mk(4, 3);
    const r = aggregateEvaluations([evalInput("a", scores)]);
    expect(r.evaluatorCount).toBe(1);
    expect(r.weightedTotal).toBe(computeOverallScore(scores));
    for (const d of SCORE_DIMENSIONS) {
      expect(r.perCriterionMean[d]).toBe(scores[d]);
    }
    expect(r.minTotal).toBe(r.weightedTotal);
    expect(r.maxTotal).toBe(r.weightedTotal);
    expect(r.breakdown).toHaveLength(1);
    expect(r.breakdown[0].evaluatorId).toBe("a");
  });
});

describe("aggregateEvaluations — mean per criterion + weighted total", () => {
  it("averages each criterion across distinct evaluators", () => {
    const r = aggregateEvaluations([
      evalInput("a", full(4)),
      evalInput("b", full(2)),
    ]);
    expect(r.evaluatorCount).toBe(2);
    for (const d of SCORE_DIMENSIONS) {
      expect(r.perCriterionMean[d]).toBe(3);
    }
    // weighted total of the means == computeOverallScore(full(3)) == 3
    expect(r.weightedTotal).toBe(3);
  });

  it("consensus total equals the mean of individual weighted totals", () => {
    const a = mk(5, 3); // total 5*0.3 + 3*0.7 = 1.5 + 2.1 = 3.6
    const b = mk(3, 1); // total 3*0.3 + 1*0.7 = 0.9 + 0.7 = 1.6
    const r = aggregateEvaluations([evalInput("a", a), evalInput("b", b)]);
    const meanOfTotals =
      (computeOverallScore(a) + computeOverallScore(b)) / 2;
    expect(r.weightedTotal).toBeCloseTo(meanOfTotals, 10);
  });

  it("exposes min/max individual totals for divergence", () => {
    const r = aggregateEvaluations([
      evalInput("a", full(4)), // total 4
      evalInput("b", full(2)), // total 2
      evalInput("c", full(3)), // total 3
    ]);
    expect(r.minTotal).toBe(2);
    expect(r.maxTotal).toBe(4);
    expect(r.breakdown).toHaveLength(3);
  });
});

describe("aggregateEvaluations — gate on the averaged Challenge Fit", () => {
  it("gates when the AVERAGED Challenge Fit < 3, even if some individuals scored ≥3", () => {
    const a = mk(4, 5); // CF 4 → individually NOT gated
    const b = mk(1, 5); // CF 1 → individually gated
    const r = aggregateEvaluations([evalInput("a", a), evalInput("b", b)]);
    // mean CF = 2.5 < 3 → consensus gated
    expect(r.perCriterionMean.CHALLENGE_FIT).toBe(2.5);
    expect(r.gated).toBe(true);
    expect(r.recommendation).toBe("STRONG_NO");

    const aEntry = r.breakdown.find((x) => x.evaluatorId === "a")!;
    const bEntry = r.breakdown.find((x) => x.evaluatorId === "b")!;
    expect(aEntry.gated).toBe(false);
    expect(bEntry.gated).toBe(true);
  });

  it("does NOT gate when the averaged Challenge Fit ≥ 3, even if one individual is gated", () => {
    const a = mk(5, 5); // CF 5
    const b = mk(2, 5); // CF 2 → individually gated
    const r = aggregateEvaluations([evalInput("a", a), evalInput("b", b)]);
    // mean CF = 3.5 ≥ 3 → consensus NOT gated
    expect(r.perCriterionMean.CHALLENGE_FIT).toBe(3.5);
    expect(r.gated).toBe(false);
    expect(r.recommendation).not.toBe("STRONG_NO");
  });
});

describe("aggregateEvaluations — recommendation bands on the aggregate", () => {
  it("STRONG_YES when total ≥ 4.0", () => {
    const r = aggregateEvaluations([evalInput("a", full(4))]);
    expect(r.weightedTotal).toBe(4);
    expect(r.recommendation).toBe("STRONG_YES");
  });

  it("YES for 3.0 ≤ total < 4.0", () => {
    const r = aggregateEvaluations([evalInput("a", full(3))]);
    expect(r.weightedTotal).toBe(3);
    expect(r.recommendation).toBe("YES");
  });

  it("NO for 2.0 ≤ total < 3.0 (Challenge Fit not gated)", () => {
    // CF 3 (not gated), rest 2 → total 0.9 + 1.4 = 2.3
    const r = aggregateEvaluations([evalInput("a", mk(3, 2))]);
    expect(r.gated).toBe(false);
    expect(r.weightedTotal).toBe(2.3);
    expect(r.recommendation).toBe("NO");
  });

  it("STRONG_NO for total < 2.0 (Challenge Fit not gated)", () => {
    // CF 3 (not gated), rest 0 → total 0.9
    const r = aggregateEvaluations([evalInput("a", mk(3, 0))]);
    expect(r.gated).toBe(false);
    expect(r.weightedTotal).toBe(0.9);
    expect(r.recommendation).toBe("STRONG_NO");
  });
});

describe("aggregateEvaluations — eligibility & dedupe", () => {
  it("excludes evaluators whose current role is NOT a scout role", () => {
    const r = aggregateEvaluations([
      evalInput("scout", full(4), { evaluatorRole: "MEMBER" }),
      evalInput("admin", full(4), { evaluatorRole: "ADMIN" }),
      evalInput("partner", full(1), { evaluatorRole: "BUSINESS_PARTNER" }),
      evalInput("investor", full(1), { evaluatorRole: "INVESTOR" }),
      evalInput("startup", full(1), { evaluatorRole: "STARTUP" }),
    ]);
    // Only MEMBER + ADMIN count → mean stays full(4) → total 4
    expect(r.evaluatorCount).toBe(2);
    expect(r.weightedTotal).toBe(4);
    expect(r.breakdown.map((b) => b.evaluatorId).sort()).toEqual([
      "admin",
      "scout",
    ]);
  });

  it("all-non-scout input collapses to the empty consensus", () => {
    const r = aggregateEvaluations([
      evalInput("p", full(5), { evaluatorRole: "BUSINESS_PARTNER" }),
    ]);
    expect(r.evaluatorCount).toBe(0);
  });

  it("keeps only the MOST RECENT evaluation per evaluator", () => {
    const older = evalInput("a", full(2), {
      updatedAt: new Date("2026-01-01T00:00:00Z"),
    });
    const newer = evalInput("a", full(4), {
      updatedAt: new Date("2026-06-01T00:00:00Z"),
    });
    // Order in the array should not matter.
    const r = aggregateEvaluations([newer, older]);
    expect(r.evaluatorCount).toBe(1);
    expect(r.weightedTotal).toBe(computeOverallScore(full(4)));
  });

  it("dedupes per evaluator then averages across distinct evaluators", () => {
    const r = aggregateEvaluations([
      evalInput("a", full(2), { updatedAt: new Date("2026-01-01T00:00:00Z") }),
      evalInput("a", full(4), { updatedAt: new Date("2026-02-01T00:00:00Z") }), // a → 4
      evalInput("b", full(2)), // b → 2
    ]);
    expect(r.evaluatorCount).toBe(2);
    // mean of a(4) & b(2) = 3
    expect(r.weightedTotal).toBe(3);
  });
});
