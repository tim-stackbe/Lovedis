import { describe, expect, it } from "vitest";
import { buildExportSheets } from "@/lib/insights/export";
import {
  buildPilotIndex,
  dataQuality,
  externalStartupIds,
  inBatchPeriod,
  industryBreakdown,
  isQualifiedMatch,
  pairKey,
  partnerDetail,
  partnerRetention,
  partnersInBatch,
  rate,
  resolvePartnerCompany,
  startupDetail,
  startupsInBatch,
  summarizeBatch,
  summarizePortfolio,
  type InsightsDataset,
  type InsightsMatch,
} from "@/lib/insights/metrics";

// ---------------------------------------------------------------------------
// KPI definitions (Plan: plan-kpi-analytics-hub, Abschnitt 3). Pure functions
// over a hand-built dataset, so every number below can be checked by eye.
// ---------------------------------------------------------------------------

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

function match(overrides: Partial<InsightsMatch> & Pick<InsightsMatch, "batchId" | "partnerId" | "startupId">): InsightsMatch {
  return {
    startupRelevance: null,
    partnerRelevance: null,
    contactStatus: "NONE",
    useCaseTypes: [],
    startupFollowUp: null,
    partnerFollowUp: null,
    ...overrides,
  };
}

/**
 * Two accelerator batches (2025 with FingerHaus+Lupp, 2026 with FingerHaus+Weimer),
 * startups Alpha/Beta/Gamma in 2026, Delta only via an engagement (external).
 */
function fixture(): InsightsDataset {
  return {
    batches: [
      { id: "b25", name: "LD 2025", type: "ACCELERATOR", startDate: d("2025-03-01"), endDate: d("2025-06-30"), createdAt: d("2025-01-01") },
      { id: "b26", name: "LD 2026", type: "ACCELERATOR", startDate: d("2026-03-01"), endDate: d("2026-06-30"), createdAt: d("2026-01-01") },
      { id: "bind", name: "Industrie", type: "INDUSTRIEPROGRAMM", startDate: null, endDate: null, createdAt: d("2026-02-01") },
    ],
    batchStartups: [
      { batchId: "b26", startupId: "alpha" },
      { batchId: "b26", startupId: "beta" },
      { batchId: "b26", startupId: "gamma" },
      { batchId: "b25", startupId: "gamma" },
    ],
    batchPartners: [
      { batchId: "b25", partnerId: "fh" },
      { batchId: "b25", partnerId: "lupp" },
      { batchId: "b26", partnerId: "fh" },
      { batchId: "b26", partnerId: "weimer" },
    ],
    partners: [
      { id: "fh", name: "FingerHaus", slug: "fingerhaus" },
      { id: "lupp", name: "Lupp", slug: "lupp" },
      { id: "weimer", name: "Weimer", slug: "weimer" },
    ],
    startups: [
      { id: "alpha", name: "Alpha", industry: "Construction", city: "Frankfurt", teamSize: 5, sourceType: null },
      { id: "beta", name: "Beta", industry: "Construction", city: null, teamSize: null, sourceType: null },
      { id: "gamma", name: "Gamma", industry: "HealthTech", city: "Kassel", teamSize: 3, sourceType: null },
      { id: "delta", name: "Delta", industry: " ", city: null, teamSize: null, sourceType: null },
    ],
    matches: [
      // Alpha × FingerHaus: top match, pilot agreed in the matrix.
      match({ batchId: "b26", partnerId: "fh", startupId: "alpha", startupRelevance: "HIGH", partnerRelevance: "HIGH", contactStatus: "PILOT_AGREED" }),
      // Alpha × Weimer: rated only, no contact, no follow-up → not a match.
      match({ batchId: "b26", partnerId: "weimer", startupId: "alpha", startupRelevance: "MEDIUM" }),
      // Beta × FingerHaus: follow-up wanted by the partner → match; pilot via engagement.
      match({ batchId: "b26", partnerId: "fh", startupId: "beta", partnerRelevance: "MEDIUM", partnerFollowUp: true }),
      // Gamma × Weimer: in contact → match, no pilot.
      match({ batchId: "b26", partnerId: "weimer", startupId: "gamma", startupRelevance: "LOW", partnerRelevance: "LOW", contactStatus: "IN_CONTACT" }),
      // Previous batch cell, must not count for 2026.
      match({ batchId: "b25", partnerId: "lupp", startupId: "gamma", contactStatus: "FOLLOW_UP" }),
    ],
    engagements: [
      { id: "e1", title: "Pilot Beta", startupId: "beta", status: "ACTIVE", partnerCompanyId: "fh", partnerResolution: "company", startDate: d("2026-04-01"), createdAt: d("2026-04-01") },
      { id: "e2", title: "Delta Test", startupId: "delta", status: "COMPLETED", partnerCompanyId: "lupp", partnerResolution: "name", startDate: null, createdAt: d("2026-05-01") },
      { id: "e3", title: "Abgebrochen", startupId: "gamma", status: "CANCELLED", partnerCompanyId: "weimer", partnerResolution: "company", startDate: null, createdAt: d("2026-05-01") },
      { id: "e4", title: "Ohne Partner", startupId: "gamma", status: "ACTIVE", partnerCompanyId: null, partnerResolution: "none", startDate: null, createdAt: d("2026-05-01") },
    ],
    challenges: [
      { id: "c1", title: "Weimer Challenge", status: "OPEN", partnerCompanyId: "weimer", partnerResolution: "company" },
      { id: "c2", title: "Team Challenge", status: "OPEN", partnerCompanyId: null, partnerResolution: "none" },
    ],
    applications: [
      { challengeId: "c1", startupId: "alpha", status: "ACCEPTED", pocStatus: "RUNNING" },
      { challengeId: "c2", startupId: "beta", status: "PENDING", pocStatus: null },
    ],
    bookings: [
      { startupId: "alpha", status: "COMPLETED", offeringType: "MENTOR_SESSION", credits: 2, createdAt: d("2026-04-10") },
      { startupId: "alpha", status: "CONFIRMED", offeringType: "SUPPORT", credits: 1, createdAt: d("2026-06-30") },
      { startupId: "alpha", status: "CANCELLED", offeringType: "SUPPORT", credits: 5, createdAt: d("2026-05-01") },
      // Outside the 2026 period → not counted for b26.
      { startupId: "beta", status: "COMPLETED", offeringType: "PROGRAM", credits: 6, createdAt: d("2026-07-01") },
      { startupId: "gamma", status: "REQUESTED", offeringType: "MENTOR_SESSION", credits: 1, createdAt: d("2026-03-15") },
    ],
  };
}

describe("isQualifiedMatch", () => {
  it("counts contact or a follow-up wish of either side, not a mere rating", () => {
    const base = { contactStatus: "NONE" as const, startupFollowUp: null, partnerFollowUp: null };
    expect(isQualifiedMatch(base)).toBe(false);
    expect(isQualifiedMatch({ ...base, contactStatus: "IN_CONTACT" })).toBe(true);
    expect(isQualifiedMatch({ ...base, startupFollowUp: true })).toBe(true);
    expect(isQualifiedMatch({ ...base, partnerFollowUp: true })).toBe(true);
    expect(isQualifiedMatch({ ...base, partnerFollowUp: false })).toBe(false);
  });
});

describe("buildPilotIndex", () => {
  it("collects pilots from matrix, engagements and PoCs, ignoring cancelled and unattributed ones", () => {
    const pilots = buildPilotIndex(fixture());
    expect(pilots.get(pairKey("alpha", "fh"))).toEqual(["MATRIX"]);
    expect(pilots.get(pairKey("beta", "fh"))).toEqual(["ENGAGEMENT"]);
    expect(pilots.get(pairKey("delta", "lupp"))).toEqual(["ENGAGEMENT"]);
    expect(pilots.get(pairKey("alpha", "weimer"))).toEqual(["POC"]);
    expect(pilots.has(pairKey("gamma", "weimer"))).toBe(false);
    expect(pilots.size).toBe(4);
  });
});

describe("summarizeBatch", () => {
  it("computes the program KPIs for one batch", () => {
    const s = summarizeBatch(fixture(), "b26")!;
    expect(s).toMatchObject({
      startups: 3,
      partners: 2,
      ratedPairings: 4,
      topMatches: 1,
      matches: 3,
      matchesWithPilot: 2,
      pilotPairs: 3, // alpha×fh, beta×fh, alpha×weimer (PoC)
      startupsWithApplication: 2,
      startupsWithoutApplication: 1,
      sessionsBooked: 3, // alpha COMPLETED + CONFIRMED, gamma REQUESTED
      sessionsCompleted: 1,
      creditsRedeemed: 3,
      periodApplied: true,
    });
    expect(s.matchToPilotRate).toBeCloseTo(2 / 3);
  });

  it("measures partner retention against the previous batch of the same type", () => {
    const s = summarizeBatch(fixture(), "b26")!;
    expect(s.retention).toEqual({
      previousBatchId: "b25",
      previousBatchName: "LD 2025",
      previousPartners: 2,
      retained: 1,
      rate: 0.5,
    });
    expect(partnerRetention(fixture(), fixture().batches[0])).toBeNull();
  });

  it("returns null for an unknown batch and n. v. rates for empty batches", () => {
    expect(summarizeBatch(fixture(), "nope")).toBeNull();
    const empty = summarizeBatch(fixture(), "bind")!;
    expect(empty.matches).toBe(0);
    expect(empty.matchToPilotRate).toBeNull();
    expect(empty.periodApplied).toBe(false);
  });
});

describe("inBatchPeriod", () => {
  it("includes the whole end day and everything when the batch has no period", () => {
    const [b25, , bind] = fixture().batches;
    expect(inBatchPeriod(b25, d("2025-06-30"))).toBe(true);
    expect(inBatchPeriod(b25, new Date("2025-06-30T23:59:59Z"))).toBe(true);
    expect(inBatchPeriod(b25, d("2025-07-01"))).toBe(false);
    expect(inBatchPeriod(b25, d("2025-02-28"))).toBe(false);
    expect(inBatchPeriod(bind, d("1999-01-01"))).toBe(true);
  });
});

describe("partner and startup breakdowns", () => {
  it("lists partners of a batch with their match and pilot counts", () => {
    const rows = partnersInBatch(fixture(), "b26");
    expect(rows.map((r) => [r.partner.slug, r.matches, r.pilots])).toEqual([
      ["fingerhaus", 2, 2],
      ["weimer", 1, 1],
    ]);
  });

  it("lists startups of a batch, sorted by name, with period-scoped sessions", () => {
    const rows = startupsInBatch(fixture(), "b26");
    expect(rows.map((r) => r.startup.name)).toEqual(["Alpha", "Beta", "Gamma"]);
    const beta = rows.find((r) => r.startup.id === "beta")!;
    expect(beta.sessionsCompleted).toBe(0); // booking lies after the period
    expect(rows.find((r) => r.startup.id === "alpha")!.creditsRedeemed).toBe(3);
  });

  it("groups by industry and falls back for blank values", () => {
    const all = industryBreakdown(fixture(), null);
    expect(all.map((r) => [r.industry, r.startups])).toEqual([
      ["Construction", 2],
      ["HealthTech", 1],
      ["Ohne Branche", 1],
    ]);
    const construction = industryBreakdown(fixture(), "b26").find((r) => r.industry === "Construction")!;
    expect(construction).toMatchObject({ startups: 2, matches: 2, pilots: 3 });
  });
});

describe("portfolio KPIs", () => {
  it("treats collaborating startups outside any accelerator batch as external", () => {
    expect([...externalStartupIds(fixture())]).toEqual(["delta"]);
    expect(summarizePortfolio(fixture())).toMatchObject({
      batches: 3,
      startupsInBatches: 3,
      partnersInBatches: 3,
      matches: 4,
      pilotPairs: 4,
      engagementsActive: 2,
      externalStartups: 1,
    });
  });
});

describe("drill-downs", () => {
  it("shows all collaborations of a partner across batches", () => {
    const fh = partnerDetail(fixture(), "fh")!;
    expect(fh.batches.map((b) => b.batch.id)).toEqual(["b26", "b25"]);
    expect(fh.totals).toEqual({ matches: 2, pilots: 2, startups: 2 });
    expect(fh.engagements.map((e) => e.startupName)).toEqual(["Beta"]);

    const weimer = partnerDetail(fixture(), "weimer")!;
    expect(weimer.challenges).toEqual([
      expect.objectContaining({ id: "c1", applications: 1, pocs: 1 }),
    ]);
    expect(partnerDetail(fixture(), "nope")).toBeNull();
  });

  it("shows programs, pairings and venture store usage of a startup", () => {
    const alpha = startupDetail(fixture(), "alpha")!;
    expect(alpha.batches.map((b) => b.id)).toEqual(["b26"]);
    expect(alpha.isExternal).toBe(false);
    expect(alpha.matchRows.map((r) => [r.partner.slug, r.qualified, r.pilotSources])).toEqual([
      ["fingerhaus", true, ["MATRIX"]],
      ["weimer", false, ["POC"]],
    ]);
    expect(alpha).toMatchObject({ sessionsBooked: 2, sessionsCompleted: 1, creditsRedeemed: 3 });
    expect(startupDetail(fixture(), "delta")!.isExternal).toBe(true);
  });
});

describe("dataQuality", () => {
  it("counts the gaps that block complete KPIs", () => {
    const byKey = Object.fromEntries(dataQuality(fixture()).map((q) => [q.key, [q.count, q.total]]));
    expect(byKey).toEqual({
      "engagement-partner": [1, 4],
      "engagement-partner-name": [1, 4],
      "challenge-partner": [1, 2],
      "batch-period": [1, 3],
      "startup-city": [1, 3],
      "startup-team-size": [1, 3],
      "startup-multi-accelerator": [1, 3],
    });
  });
});

describe("resolvePartnerCompany", () => {
  const partners = [
    { id: "fh", name: "FingerHaus", slug: "fingerhaus", companyId: "co-fh" },
    { id: "saelzer", name: "Sälzer", slug: "saelzer", companyId: null },
  ];

  it("prefers the linked company account", () => {
    expect(resolvePartnerCompany({ companyId: "co-fh", company: "Sälzer" }, partners)).toEqual({
      partnerCompanyId: "fh",
      partnerResolution: "company",
    });
  });

  it("falls back to the legacy company name, umlaut- and suffix-tolerant", () => {
    expect(resolvePartnerCompany({ companyId: null, company: "Saelzer GmbH" }, partners)).toEqual({
      partnerCompanyId: "saelzer",
      partnerResolution: "name",
    });
    expect(resolvePartnerCompany({ companyId: "other", company: "FingerHaus" }, partners)).toEqual({
      partnerCompanyId: "fh",
      partnerResolution: "name",
    });
  });

  it("returns none when nothing matches", () => {
    expect(resolvePartnerCompany({ companyId: null, company: "Acme" }, partners).partnerResolution).toBe("none");
    expect(resolvePartnerCompany(null, partners).partnerResolution).toBe("none");
  });
});

describe("rate", () => {
  it("is null without a base", () => {
    expect(rate(1, 0)).toBeNull();
    expect(rate(1, 4)).toBe(0.25);
  });
});

describe("buildExportSheets", () => {
  it("produces the four fact sheets with KPI flags per match row", () => {
    const sheets = buildExportSheets(fixture());
    expect(sheets.map((s) => s.name)).toEqual(["Batch-KPIs", "Matches", "Kooperationen", "Buchungen"]);

    const batchRow = sheets[0].rows.find((r) => r.Batch === "LD 2026")!;
    expect(batchRow).toMatchObject({ Matches: 3, "Match zu Pilot (%)": 66.7, "Partner-Retention (%)": 50 });

    const matches = sheets[1].rows;
    expect(matches).toHaveLength(5);
    const alphaFh = matches.find((r) => r.Startup === "Alpha" && r.Partner === "FingerHaus")!;
    expect(alphaFh).toMatchObject({ "Match (KPI)": 1, "Pilot (KPI)": 1, "Pilot-Quelle": "Matrix: Pilot vereinbart" });

    expect(sheets[2].rows).toHaveLength(6); // 4 engagements + 2 applications
    expect(sheets[3].rows).toHaveLength(5);
  });

  it("never exports free-text columns", () => {
    const columns = new Set(buildExportSheets(fixture()).flatMap((s) => s.rows.flatMap(Object.keys)));
    for (const forbidden of ["Notizen", "Notes", "Next steps", "Use-Case-Notiz", "Offene Fragen"]) {
      expect(columns.has(forbidden)).toBe(false);
    }
  });
});
