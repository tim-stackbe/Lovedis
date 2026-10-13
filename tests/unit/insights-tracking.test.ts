import { describe, expect, it } from "vitest";
import { buildExportSheets } from "@/lib/insights/export";
import {
  buildPilotIndex,
  pairKey,
  type InsightsDataset,
  type InsightsReportingMeta,
  type InsightsTracking,
} from "@/lib/insights/metrics";
import { effectiveStage } from "@/lib/insights/stages";
import {
  isFemaleFounder,
  jobsCreated,
  parseReportingMetaForm,
  parseTrackingForm,
  suggestHessen,
  summarizeBatchReporting,
  summarizeOneOnOne,
  trackingDataQuality,
  trackingInBatch,
} from "@/lib/insights/tracking";

// ---------------------------------------------------------------------------
// KPI-Insights Phase 2 definitions (decided 2026-10-13): Female Founder from
// 50 % women among the founders, Hessen confirmed by the team, LOI/contract/
// revenue from the additive pipeline tracking.
// ---------------------------------------------------------------------------

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

function tracking(overrides: Partial<InsightsTracking> & Pick<InsightsTracking, "id" | "startupId">): InsightsTracking {
  return {
    track: "BASIS",
    partnerCompanyId: null,
    batchId: null,
    challengeId: null,
    engagementId: null,
    stage: "MATCH",
    introByLovedisOn: null,
    pilotStartOn: null,
    loiOn: null,
    contractOn: null,
    firstRevenueOn: null,
    revenueEur: null,
    supportIntensity: null,
    ndaSigned: false,
    ipAgreement: false,
    coInnovationAgreement: false,
    startOn: null,
    endOn: null,
    costPartnerEur: null,
    costLovedisEur: null,
    costStartupEur: null,
    outcome: null,
    ...overrides,
  };
}

function meta(overrides: Partial<InsightsReportingMeta> & Pick<InsightsReportingMeta, "startupId">): InsightsReportingMeta {
  return {
    hessenBased: null,
    foundersTotal: null,
    foundersFemale: null,
    teamTotal: null,
    teamFemale: null,
    fteBaseline: null,
    fteBaselineOn: null,
    evidence: null,
    ...overrides,
  };
}

/** Batch b1 with startups a/b/c and partners fh/we; startup x only in 1:1. */
function fixture(): InsightsDataset {
  return {
    batches: [
      { id: "b1", name: "LD 2026", type: "ACCELERATOR", startDate: null, endDate: null, createdAt: d("2026-01-01") },
      { id: "b2", name: "Industrie", type: "INDUSTRIEPROGRAMM", startDate: null, endDate: null, createdAt: d("2026-02-01") },
    ],
    batchStartups: [
      { batchId: "b1", startupId: "a" },
      { batchId: "b1", startupId: "b" },
      { batchId: "b1", startupId: "c" },
    ],
    batchPartners: [
      { batchId: "b1", partnerId: "fh" },
      { batchId: "b1", partnerId: "we" },
    ],
    partners: [
      { id: "fh", name: "FingerHaus", slug: "fingerhaus" },
      { id: "we", name: "Weimer", slug: "weimer" },
    ],
    startups: [
      { id: "a", name: "Alpha", industry: "Bau", city: "Frankfurt am Main", teamSize: 6, sourceType: null },
      { id: "b", name: "Beta", industry: "Bau", city: "Berlin", teamSize: null, sourceType: null },
      { id: "c", name: "Gamma", industry: "Bau", city: "Gießen", teamSize: 3, sourceType: null },
      { id: "x", name: "Xeno", industry: "Health", city: null, teamSize: null, sourceType: null },
    ],
    matches: [
      { batchId: "b1", partnerId: "fh", startupId: "a", startupRelevance: "HIGH", partnerRelevance: "HIGH", contactStatus: "PILOT_AGREED", useCaseTypes: [], startupFollowUp: null, partnerFollowUp: null },
    ],
    engagements: [],
    challenges: [
      { id: "c1", title: "Bau-Challenge", status: "OPEN", partnerCompanyId: "fh", partnerResolution: "company" },
      { id: "c2", title: "Holz-Challenge", status: "OPEN", partnerCompanyId: "we", partnerResolution: "company" },
      { id: "c3", title: "Nicht im Batch", status: "OPEN", partnerCompanyId: null, partnerResolution: "none" },
    ],
    applications: [
      { challengeId: "c1", startupId: "a", status: "ACCEPTED", pocStatus: null },
      { challengeId: "c2", startupId: "b", status: "PENDING", pocStatus: null },
      { challengeId: "c3", startupId: "c", status: "ACCEPTED", pocStatus: null },
    ],
    bookings: [],
    reportingMeta: [
      // Alpha: confirmed Hessen, 1 of 2 founders female (50 %) → Female Founder.
      meta({ startupId: "a", hessenBased: true, foundersTotal: 2, foundersFemale: 1, teamTotal: 8, teamFemale: 3, fteBaseline: 5 }),
      // Beta: not Hessen, 1 of 3 founders female → no Female Founder.
      meta({ startupId: "b", hessenBased: false, foundersTotal: 3, foundersFemale: 1, teamTotal: 4, teamFemale: 1 }),
      // Gamma has no meta: Hessen only suggested from "Gießen".
    ],
    tracking: [
      // Alpha × FingerHaus: contract date set, stage select still PILOT → CONTRACT.
      tracking({ id: "t1", startupId: "a", partnerCompanyId: "fh", batchId: "b1", stage: "PILOT", contractOn: d("2026-05-01"), revenueEur: 12000, outcome: "MARKET_READY" }),
      // Beta × Weimer: no batch, but both in b1 → counts for b1; pilot via tracking only.
      tracking({ id: "t2", startupId: "b", partnerCompanyId: "we", stage: "PILOT" }),
      // Gamma without partner: in b1 by batchId, excluded from the pair funnel.
      tracking({ id: "t3", startupId: "c", batchId: "b1", stage: "LOI" }),
      // 1:1 accelerator entries.
      tracking({ id: "o1", startupId: "x", partnerCompanyId: "fh", track: "ONE_ON_ONE", stage: "INTRO", costLovedisEur: 1000 }),
      tracking({ id: "o2", startupId: "x", partnerCompanyId: "we", track: "ONE_ON_ONE", stage: "PILOT", loiOn: d("2026-06-01"), costPartnerEur: 5000, costLovedisEur: 2000, outcome: "MVP" }),
      tracking({ id: "o3", startupId: "a", partnerCompanyId: "we", track: "ONE_ON_ONE", stage: "REVENUE", revenueEur: 3000 }),
    ],
    batchChallenges: [
      { batchId: "b1", challengeId: "c1" },
      { batchId: "b1", challengeId: "c2" },
    ],
  };
}

describe("effectiveStage", () => {
  it("raises the chosen stage by any filled milestone", () => {
    const base = tracking({ id: "t", startupId: "s" });
    expect(effectiveStage(base)).toBe("MATCH");
    expect(effectiveStage({ ...base, introByLovedisOn: d("2026-01-01") })).toBe("INTRO");
    expect(effectiveStage({ ...base, stage: "PILOT", loiOn: d("2026-01-01") })).toBe("LOI");
    expect(effectiveStage({ ...base, revenueEur: 1 })).toBe("REVENUE");
    expect(effectiveStage({ ...base, stage: "CONTRACT", introByLovedisOn: d("2026-01-01") })).toBe("CONTRACT");
    expect(effectiveStage({ ...base, stage: "UNKNOWN" })).toBe("MATCH");
  });
});

describe("suggestHessen", () => {
  it("recognizes Hessian cities, tolerant of umlauts and suffixes", () => {
    expect(suggestHessen("Frankfurt am Main")).toBe(true);
    expect(suggestHessen("Gießen")).toBe(true);
    expect(suggestHessen("  wiesbaden ")).toBe(true);
    expect(suggestHessen("Bad Homburg v. d. Höhe")).toBe(true);
  });

  it("rejects other cities, including Frankfurt (Oder), and has no opinion without city", () => {
    expect(suggestHessen("Berlin")).toBe(false);
    expect(suggestHessen("Frankfurt (Oder)")).toBe(false);
    expect(suggestHessen(null)).toBeNull();
    expect(suggestHessen(" ")).toBeNull();
  });
});

describe("isFemaleFounder", () => {
  it("counts teams with at least 50 % women among the founders", () => {
    expect(isFemaleFounder(meta({ startupId: "s", foundersTotal: 2, foundersFemale: 1 }))).toBe(true);
    expect(isFemaleFounder(meta({ startupId: "s", foundersTotal: 3, foundersFemale: 2 }))).toBe(true);
    expect(isFemaleFounder(meta({ startupId: "s", foundersTotal: 3, foundersFemale: 1 }))).toBe(false);
    expect(isFemaleFounder(meta({ startupId: "s", foundersTotal: 1, foundersFemale: 0 }))).toBe(false);
  });

  it("is unknown without founder counts", () => {
    expect(isFemaleFounder(undefined)).toBeNull();
    expect(isFemaleFounder(meta({ startupId: "s", foundersTotal: 2 }))).toBeNull();
    expect(isFemaleFounder(meta({ startupId: "s", foundersTotal: 0, foundersFemale: 0 }))).toBeNull();
  });
});

describe("jobsCreated", () => {
  it("compares the current team with the baseline, falling back to the profile team size", () => {
    const startup = fixture().startups[0];
    expect(jobsCreated(meta({ startupId: "a", teamTotal: 8, fteBaseline: 5 }), startup)).toBe(3);
    expect(jobsCreated(meta({ startupId: "a", fteBaseline: 4 }), startup)).toBe(2);
    expect(jobsCreated(meta({ startupId: "a", teamTotal: 8 }), startup)).toBeNull();
    expect(jobsCreated(undefined, startup)).toBeNull();
  });
});

describe("pilot index with tracking", () => {
  it("adds tracking entries from stage PILOT on as pilot source", () => {
    const pilots = buildPilotIndex(fixture());
    expect(pilots.get(pairKey("a", "fh"))).toEqual(["MATRIX", "TRACKING"]);
    expect(pilots.get(pairKey("b", "we"))).toEqual(["TRACKING"]);
    expect(pilots.has(pairKey("x", "fh"))).toBe(false); // INTRO only
    expect(pilots.get(pairKey("x", "we"))).toEqual(["TRACKING"]); // LOI date
  });
});

describe("summarizeBatchReporting", () => {
  it("assigns tracking to a batch explicitly or via startup and partner membership", () => {
    // o3 is a 1:1 entry without batch, but Alpha and Weimer are both in b1.
    expect(trackingInBatch(fixture(), "b1").map((t) => t.id)).toEqual(["t1", "t2", "t3", "o3"]);
    expect(trackingInBatch(fixture(), "b2")).toEqual([]);
  });

  it("computes Förder facts and the funnel for one batch", () => {
    const ds = fixture();
    const r = summarizeBatchReporting(ds, "b1", buildPilotIndex(ds));
    expect(r).toEqual({
      startupsWithMeta: 2,
      hessenConfirmed: 1,
      hessenSuggested: 1, // Gamma from "Gießen"
      femaleFounders: 1,
      startupsWithFounderData: 2,
      femaleTeamShare: 4 / 12,
      jobsCreated: 3,
      startupsWithJobData: 1,
      challenges: 2,
      challengesCovered: 1, // c1 accepted; c3 is not linked to the batch
      pilotPairs: 3, // a×fh, b×we, a×we
      dealPairs: 2, // a×fh and a×we reached revenue
      contractPairs: 2,
      pilotToDealRate: 2 / 3,
      revenueEur: 15000,
      revenuePairs: 2,
      marketReadyStartups: 1,
      trackingEntries: 4,
    });
  });
});

describe("summarizeOneOnOne", () => {
  it("summarizes conversion, revenue, costs and outcomes of the 1:1 accelerator", () => {
    const s = summarizeOneOnOne(fixture());
    expect(s.entries).toBe(3);
    expect(s.byStage).toEqual({ MATCH: 0, INTRO: 1, PILOT: 0, LOI: 1, CONTRACT: 0, REVENUE: 1 });
    expect(s.reachedPilot).toBe(2);
    expect(s.reachedContract).toBe(1);
    expect(s.pilotRate).toBeCloseTo(2 / 3);
    expect(s.pilotToContractRate).toBe(0.5);
    expect(s.revenueEur).toBe(3000);
    expect(s.costs).toEqual({ partner: 5000, lovedis: 3000, startup: 0 });
    expect(s.outcomes).toEqual({ MVP: 1, MARKET_READY: 0, FUNDING_READY: 0 });
  });
});

describe("trackingDataQuality", () => {
  it("counts missing Förder facts, baselines, challenge links and partners", () => {
    const byKey = Object.fromEntries(trackingDataQuality(fixture()).map((q) => [q.key, [q.count, q.total]]));
    expect(byKey).toEqual({
      "startup-reporting-meta": [1, 3], // Gamma has no meta
      "startup-fte-baseline": [2, 3],
      "batch-challenges": [0, 1],
      "tracking-partner": [1, 6],
    });
  });
});

describe("export with Phase 2 sheets", () => {
  it("adds the tracking and Förder sheets and the new batch columns", () => {
    const sheets = buildExportSheets(fixture());
    expect(sheets.map((s) => s.name)).toEqual([
      "Batch-KPIs",
      "Matches",
      "Kooperationen",
      "Buchungen",
      "Pipeline-Tracking",
      "Förder-Merkmale",
    ]);
    const batch = sheets[0].rows.find((r) => r.Batch === "LD 2026")!;
    expect(batch).toMatchObject({
      "Hessen (bestätigt)": 1,
      "Female Founder": 1,
      "Pilot zu LOI/Vertrag (%)": 66.7,
      "Umsatz mit Partnern (EUR)": 15000,
    });
    // Revenue amount lifts the PILOT select past the contract date to "Umsatz".
    const t1 = sheets[4].rows.find((r) => r.Startup === "Alpha" && r.Partner === "FingerHaus")!;
    expect(t1["Stufe (erreicht)"]).toBe("Umsatz");
    const t3 = sheets[4].rows.find((r) => r.Startup === "Gamma")!;
    expect(t3["Stufe (erreicht)"]).toBe("LOI");
    const features = sheets[5].rows;
    expect(features.map((r) => [r.Startup, r.Hessen, r["Female Founder"]])).toEqual([
      ["Alpha", "ja", 1],
      ["Beta", "nein", 0],
      ["Gamma", "offen", ""],
    ]);
  });

  it("keeps free-text tracking fields out of the export", () => {
    const columns = buildExportSheets(fixture()).flatMap((s) => s.rows.flatMap((r) => Object.keys(r)));
    for (const forbidden of ["Use Case", "Ziel", "KPIs", "Ressourcen", "Form der Zusammenarbeit"]) {
      expect(columns).not.toContain(forbidden);
    }
  });
});

function form(values: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) fd.set(k, v);
  return fd;
}

describe("parseReportingMetaForm", () => {
  it("maps empty fields to null and the Hessen select to a boolean", () => {
    const res = parseReportingMetaForm(
      form({ startupId: "s", hessenBased: "yes", foundersTotal: "2", foundersFemale: "1", teamTotal: "", fteBaselineOn: "2026-03-01", evidence: "" })
    );
    expect(res.data).toEqual({
      startupId: "s",
      hessenBased: true,
      foundersTotal: 2,
      foundersFemale: 1,
      teamTotal: null,
      teamFemale: null,
      fteBaseline: null,
      fteBaselineOn: d("2026-03-01"),
      evidence: null,
    });
    expect(parseReportingMetaForm(form({ startupId: "s", hessenBased: "" })).data?.hessenBased).toBeNull();
  });

  it("rejects inconsistent counts", () => {
    expect(parseReportingMetaForm(form({ startupId: "s", foundersTotal: "1", foundersFemale: "2" })).error).toMatch(/Gründerinnen/);
    expect(parseReportingMetaForm(form({ startupId: "s", foundersFemale: "1" })).error).toMatch(/Gesamtzahl/);
    expect(parseReportingMetaForm(form({ startupId: "s", teamTotal: "2", teamFemale: "3" })).error).toMatch(/Team/);
    expect(parseReportingMetaForm(form({ startupId: "s", teamTotal: "-1" })).error).toMatch(/negativ/);
    expect(parseReportingMetaForm(form({ startupId: "s", teamTotal: "1.5" })).error).toMatch(/ganze Zahl/);
  });
});

describe("parseTrackingForm", () => {
  const minimal = { track: "BASIS", startupId: "s", stage: "PILOT" };

  it("parses a minimal entry with unchecked checkboxes", () => {
    const res = parseTrackingForm(form(minimal));
    expect(res.error).toBeUndefined();
    expect(res.data).toMatchObject({
      track: "BASIS",
      startupId: "s",
      partnerCompanyId: null,
      stage: "PILOT",
      ndaSigned: false,
      revenueEur: null,
      useCase: null,
    });
  });

  it("parses dates, money, checkboxes and trimmed text", () => {
    const res = parseTrackingForm(
      form({ ...minimal, partnerCompanyId: "p", loiOn: "2026-04-02", revenueEur: "2500", ndaSigned: "on", useCase: "  Digitale Bauakte  " })
    );
    expect(res.data).toMatchObject({
      partnerCompanyId: "p",
      loiOn: d("2026-04-02"),
      revenueEur: 2500,
      ndaSigned: true,
      useCase: "Digitale Bauakte",
    });
  });

  it("rejects unknown values and impossible periods", () => {
    expect(parseTrackingForm(form({ ...minimal, stage: "WON" })).error).toMatch(/Stufe/);
    expect(parseTrackingForm(form({ ...minimal, track: "X" })).error).toMatch(/Programm/);
    expect(parseTrackingForm(form({ ...minimal, startupId: "" })).error).toMatch(/Startup/);
    expect(parseTrackingForm(form({ ...minimal, loiOn: "02.04.2026" })).error).toMatch(/JJJJ-MM-TT/);
    expect(parseTrackingForm(form({ ...minimal, startOn: "2026-05-01", endOn: "2026-04-01" })).error).toMatch(/Ende/);
    expect(parseTrackingForm(form({ ...minimal, costLovedisEur: "-5" })).error).toMatch(/negativ/);
  });
});
