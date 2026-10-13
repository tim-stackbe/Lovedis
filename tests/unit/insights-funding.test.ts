import { describe, expect, it } from "vitest";
import { buildFundingSheets } from "@/lib/insights/export";
import {
  buildFundingReport,
  daysUntil,
  isSurveyOpen,
  parseEventForm,
  parseResponseForm,
  parseScopeForm,
  parseSurveyForm,
  summarizeFeedback,
  surveyEligibleStartupIds,
  type FundingDataset,
} from "@/lib/insights/funding";
import type { InsightsDataset, InsightsReportingMeta, InsightsTracking } from "@/lib/insights/metrics";

const d = (s: string) => new Date(`${s}T00:00:00.000Z`);

function meta(overrides: Partial<InsightsReportingMeta> & Pick<InsightsReportingMeta, "startupId">): InsightsReportingMeta {
  return {
    hessenBased: null,
    foundersTotal: null,
    foundersFemale: null,
    teamTotal: null,
    teamFemale: null,
    fteBaseline: null,
    fteBaselineOn: null,
    fteCurrent: null,
    fteCurrentOn: null,
    maturityStart: null,
    maturityCurrent: null,
    preFounding: null,
    followOnRound: null,
    followOnRoundOn: null,
    evidence: null,
    ...overrides,
  };
}

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

/** Industry batch b1 (a, b, c), unmapped batch b2 (z), program p1 (a, d), 1:1 startup x. */
function insights(): InsightsDataset {
  return {
    batches: [
      { id: "b1", name: "Industry #1", type: "INDUSTRIEPROGRAMM", startDate: d("2026-09-01"), endDate: d("2026-12-15"), createdAt: d("2026-08-01") },
      { id: "b2", name: "Alt", type: "ACCELERATOR", startDate: null, endDate: null, createdAt: d("2025-01-01") },
    ],
    batchStartups: [
      { batchId: "b1", startupId: "a" },
      { batchId: "b1", startupId: "b" },
      { batchId: "b1", startupId: "c" },
      { batchId: "b2", startupId: "z" },
    ],
    batchPartners: [{ batchId: "b1", partnerId: "fh" }],
    partners: [{ id: "fh", name: "FingerHaus", slug: "fingerhaus" }],
    startups: ["a", "b", "c", "d", "x", "z"].map((id) => ({
      id,
      name: id.toUpperCase(),
      industry: "Bau",
      city: null,
      teamSize: null,
      sourceType: null,
    })),
    matches: [
      { batchId: "b1", partnerId: "fh", startupId: "a", startupRelevance: "HIGH", partnerRelevance: "HIGH", contactStatus: "PILOT_AGREED", useCaseTypes: [], startupFollowUp: null, partnerFollowUp: null },
    ],
    engagements: [],
    challenges: [],
    applications: [],
    bookings: [],
    reportingMeta: [
      meta({ startupId: "a", fteBaseline: 2, fteCurrent: 5, maturityStart: "MVP", maturityCurrent: "MARKET_READY", followOnRound: "SEED", preFounding: false }),
      meta({ startupId: "b", fteBaseline: 3, fteCurrent: 4, maturityStart: "PROTOTYPE", maturityCurrent: "PILOT", preFounding: true }),
      meta({ startupId: "x", hessenBased: true, followOnRound: "OTHER" }),
    ],
    tracking: [
      tracking({ id: "t1", startupId: "a", partnerCompanyId: "fh", batchId: "b1", stage: "CONTRACT" }),
      tracking({ id: "o1", startupId: "x", partnerCompanyId: "fh", track: "ONE_ON_ONE", stage: "PILOT" }),
    ],
    batchChallenges: [],
  };
}

function funding(overrides: Partial<FundingDataset> = {}): FundingDataset {
  return {
    scope: [
      { kind: "BATCH", refId: "b1", format: "INDUSTRY" },
      { kind: "PROGRAM", refId: "p1", format: "PROGRAM_1" },
    ],
    programs: [
      { id: "p1", title: "KI & Tech Journey", status: "OPEN" },
      { id: "p2", title: "Sales", status: "OPEN" },
    ],
    programBookings: [
      { programId: "p1", startupId: "a", status: "CONFIRMED" },
      { programId: "p1", startupId: "d", status: "COMPLETED" },
      { programId: "p1", startupId: "z", status: "REQUESTED" },
      { programId: "p2", startupId: "z", status: "CONFIRMED" },
    ],
    activeMentors: 22,
    foundedYears: [
      { startupId: "a", foundedYear: 2022 },
      { startupId: "b", foundedYear: 2019 },
      { startupId: "c", foundedYear: null },
      { startupId: "d", foundedYear: 2024 },
      { startupId: "x", foundedYear: 2023 },
    ],
    events: [
      { id: "e1", kind: "DEMO_DAY", title: "Demo Day Industry", heldOn: d("2026-12-10"), attendees: 64, source: "LUMA" },
      { id: "e2", kind: "DEMO_DAY", title: "Demo Day Construction", heldOn: d("2026-09-20"), attendees: 41, source: "ATTIO" },
      { id: "e3", kind: "FLAGSHIP", title: "LOVE DISRUPTION", heldOn: d("2026-11-05"), attendees: 290, source: "LUMA" },
    ],
    surveys: [
      { id: "s1", title: "Abschluss Industry", scopeKind: "BATCH", refId: "b1", closesOn: null, closedAt: null, createdAt: d("2026-12-16") },
    ],
    responses: [
      { surveyId: "s1", startupId: "a", recommend: 10, overall: 5 },
      { surveyId: "s1", startupId: "b", recommend: 6, overall: 3 },
      { surveyId: "s1", startupId: "c", recommend: 9, overall: 4 },
    ],
    ...overrides,
  };
}

const today = d("2026-10-13");

describe("buildFundingReport", () => {
  const report = buildFundingReport(insights(), funding(), today);
  const kpi = (key: string) => report.kpis.find((k) => k.key === key)!;
  const check = (key: string) => report.checks.find((c) => c.key === key)!;

  it("counts participants per format from batches, confirmed program bookings and 1:1 tracking", () => {
    expect(report.formats.map((f) => [f.format, f.participants, f.aidTotalEur])).toEqual([
      ["CONSTRUCTION", 0, 0],
      ["INDUSTRY", 3, 3 * 2910],
      ["HEALTH_TECH", 0, 0],
      ["PROGRAM_1", 2, 2 * 301],
      ["PROGRAM_2", 0, 0],
      ["PROGRAM_3", 0, 0],
      ["ONE_ON_ONE", 1, 9243],
    ]);
    // z is only in the unmapped batch and has an unmapped/unconfirmed program booking.
    expect([...report.participantIds].sort()).toEqual(["a", "b", "c", "d", "x"]);
    expect(report.beneficiaries.filter((b) => b.startupId === "a").map((b) => b.format)).toEqual([
      "INDUSTRY",
      "PROGRAM_1",
    ]);
  });

  it("fills the Antrag KPIs with Soll, Ist and status", () => {
    expect(kpi("accelerator-startups")).toMatchObject({ actual: "3", status: "progress" });
    expect(kpi("program-participants")).toMatchObject({ actual: "2", status: "progress" });
    expect(kpi("one-on-one-startups")).toMatchObject({ actual: "1", status: "reached" });
    expect(kpi("mentors")).toMatchObject({ actual: "22", status: "reached" });
    expect(kpi("pilots")).toMatchObject({ actual: "1", status: "progress" });
    expect(kpi("nps")).toMatchObject({ actual: "8,3", status: "reached" });
    expect(kpi("nps").note).toContain("klassischer NPS 33");
    expect(kpi("program-rating").actual).toBe("4,0 von 5");
    // a: MVP (3) → Marktreife (5), b: Prototyp (2) → Pilot (4).
    expect(kpi("maturity")).toMatchObject({ actual: "2,5 zu 4,5" });
    expect(kpi("maturity").note).toContain("2 von 5");
    // Only SEED/SERIES_A count: a yes, x (OTHER) no.
    expect(kpi("follow-on")).toMatchObject({ actual: "20 %" });
    // a +3, b +1 → 2 per startup.
    expect(kpi("jobs")).toMatchObject({ actual: "2,0" });
    // Basis: a×fh contract; 1:1: x×fh pilot only.
    expect(kpi("pilot-to-contract").actual).toBe("50 %");
  });

  it("rates events against the per-event targets", () => {
    expect(kpi("event-DEMO_DAY")).toMatchObject({ actual: "41 / 64", status: "progress" });
    expect(kpi("event-FLAGSHIP")).toMatchObject({ actual: "290", status: "reached" });
    expect(kpi("event-CXO_DINNER").status).toBe("missing");
    expect(report.events.find((g) => g.kind === "DEMO_DAY")).toMatchObject({ attendees: 105, belowMin: 1 });
  });

  it("flags Antrag rules and missing data", () => {
    expect(check("startup-age")).toMatchObject({ count: 1, total: 5 }); // b founded 2019
    expect(check("startup-founded-missing").count).toBe(1); // c
    expect(check("pre-founding-share")).toMatchObject({ count: 1, severity: "error" }); // 1 of 5 = 20 %
    expect(check("one-on-one-hessen").count).toBe(0);
    expect(check("batch-dates").count).toBe(0);
    expect(check("formats-unmapped").count).toBe(4);
    expect(check("multi-format").count).toBe(1); // a
  });

  it("counts down to the end of the period and the report deadline", () => {
    expect(report.daysToPeriodEnd).toBe(daysUntil(d("2027-02-28"), today));
    expect(report.daysToReportDue).toBe(199);
  });

  it("has no data before anything is mapped", () => {
    const empty = buildFundingReport(insights(), funding({ scope: [], events: [], responses: [], activeMentors: 0 }), today);
    expect(empty.kpis.find((k) => k.key === "accelerator-startups")!.status).toBe("missing");
    expect(empty.kpis.find((k) => k.key === "nps")!.actual).toBe("n. v.");
    expect([...empty.participantIds]).toEqual(["x"]);
  });

  it("exports the Verwendungsnachweis sheets without free text", () => {
    const sheets = buildFundingSheets(insights(), funding(), report);
    expect(sheets.map((s) => s.name)).toEqual(["Verwendungsnachweis", "Formate", "Begünstigte", "Veranstaltungen", "Prüfpunkte"]);
    expect(sheets[0].rows[0]).toMatchObject({ KPI: "Start-ups in den Basis-Akzeleratoren", Soll: "36 (3 × 12)", Ist: "3" });
    expect(sheets[2].rows.find((r) => r.Startup === "B")).toMatchObject({ Gründungsjahr: 2019, "Vor-Gründung": "ja" });
    expect(sheets[3].rows).toHaveLength(3);
    const text = JSON.stringify(sheets);
    expect(text).not.toMatch(/[\u2013\u2014]/);
  });
});

describe("surveys", () => {
  it("knows who may answer and when a survey is open", () => {
    const ds = insights();
    const fd = funding();
    expect([...surveyEligibleStartupIds({ scopeKind: "BATCH", refId: "b1" }, ds, fd)].sort()).toEqual(["a", "b", "c"]);
    expect([...surveyEligibleStartupIds({ scopeKind: "PROGRAM", refId: "p1" }, ds, fd)].sort()).toEqual(["a", "d"]);
    expect(isSurveyOpen({ closesOn: null, closedAt: null }, today)).toBe(true);
    expect(isSurveyOpen({ closesOn: d("2026-10-13"), closedAt: null }, new Date("2026-10-13T22:00:00Z"))).toBe(true);
    expect(isSurveyOpen({ closesOn: d("2026-10-12"), closedAt: null }, today)).toBe(false);
    expect(isSurveyOpen({ closesOn: null, closedAt: d("2026-10-01") }, today)).toBe(false);
  });

  it("summarizes the NPS question both ways", () => {
    expect(summarizeFeedback([])).toEqual({ responses: 0, recommendAvg: null, npsClassic: null, overallAvg: null });
    const s = summarizeFeedback([
      { surveyId: "s", startupId: "a", recommend: 10, overall: 5 },
      { surveyId: "s", startupId: "b", recommend: 9, overall: 4 },
      { surveyId: "s", startupId: "c", recommend: 7, overall: 4 },
      { surveyId: "s", startupId: "d", recommend: 2, overall: 1 },
    ]);
    expect(s).toEqual({ responses: 4, recommendAvg: 7, npsClassic: 25, overallAvg: 3.5 });
  });
});

function form(values: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) fd.set(k, v);
  return fd;
}

describe("Phase 3 form parsing", () => {
  it("parses scope assignments and rejects formats of the wrong kind", () => {
    expect(parseScopeForm(form({ kind: "BATCH", refId: "b1", format: "INDUSTRY" })).data).toEqual({
      kind: "BATCH",
      refId: "b1",
      format: "INDUSTRY",
    });
    expect(parseScopeForm(form({ kind: "PROGRAM", refId: "p1", format: "" })).data?.format).toBeNull();
    expect(parseScopeForm(form({ kind: "BATCH", refId: "b1", format: "PROGRAM_1" })).error).toMatch(/Akzelerator/);
    expect(parseScopeForm(form({ kind: "BATCH", refId: "b1", format: "NOPE" })).error).toBeDefined();
  });

  it("parses event counts", () => {
    expect(
      parseEventForm(form({ kind: "DEMO_DAY", title: " Demo Day ", heldOn: "2026-12-10", attendees: "64", source: "LUMA", note: "" })).data
    ).toEqual({ kind: "DEMO_DAY", title: "Demo Day", heldOn: d("2026-12-10"), attendees: 64, source: "LUMA", note: null });
    expect(parseEventForm(form({ kind: "DEMO_DAY", title: "x", heldOn: "2026-12-10", attendees: "", source: "LUMA" })).error).toMatch(/Teilnehmerzahl/);
    expect(parseEventForm(form({ kind: "DEMO_DAY", title: "x", heldOn: "", attendees: "3", source: "LUMA" })).error).toMatch(/Datum/);
    expect(parseEventForm(form({ kind: "DEMO_DAY", title: "x", heldOn: "2026-12-10", attendees: "-1", source: "LUMA" })).error).toMatch(/negativ/);
  });

  it("parses surveys and answers", () => {
    expect(parseSurveyForm(form({ scope: "PROGRAM:p1", title: "Feedback", closesOn: "2026-12-31" })).data).toEqual({
      scopeKind: "PROGRAM",
      refId: "p1",
      title: "Feedback",
      closesOn: d("2026-12-31"),
    });
    expect(parseSurveyForm(form({ scope: "", title: "Feedback" })).error).toMatch(/Batch oder Programm/);
    expect(parseResponseForm(form({ surveyId: "s1", recommend: "0", overall: "5", goodText: "Mentoring" })).data).toEqual({
      surveyId: "s1",
      recommend: 0,
      overall: 5,
      goodText: "Mentoring",
      improveText: null,
    });
    expect(parseResponseForm(form({ surveyId: "s1", overall: "5" })).error).toMatch(/Weiterempfehlung/);
    expect(parseResponseForm(form({ surveyId: "s1", recommend: "11", overall: "5" })).error).toMatch(/Weiterempfehlung/);
    expect(parseResponseForm(form({ surveyId: "s1", recommend: "8", overall: "0" })).error).toMatch(/Gesamtbewertung/);
  });
});
