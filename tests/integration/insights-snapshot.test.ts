import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { loadInsightsDataset } from "@/lib/insights/data";
import { hashState, stableStringify, takeInsightsSnapshot, utcDay } from "@/lib/insights/snapshot";
import { createUser, prisma, resetDb } from "../helpers/db";

// ---------------------------------------------------------------------------
// KPI-Insights history job + read-only loader against a real Postgres. The
// snapshot must only append to MetricSnapshot and never touch source tables.
// ---------------------------------------------------------------------------

async function seedMatrix() {
  const batch = await prisma.scoutingCampaign.create({
    data: { name: "LD Test", type: "ACCELERATOR" },
  });
  const partner = await prisma.partnerCompany.create({
    data: { name: "FingerHaus", slug: "fingerhaus" },
  });
  const startup = await prisma.startup.create({
    data: { name: "Alpha", description: "Test", industry: "Construction", teamSize: 4 },
  });
  await prisma.batchStartup.create({ data: { batchId: batch.id, startupId: startup.id } });
  await prisma.batchPartner.create({ data: { batchId: batch.id, partnerCompanyId: partner.id } });
  const match = await prisma.partnerStartupMatch.create({
    data: {
      batchId: batch.id,
      partnerId: partner.id,
      startupId: startup.id,
      startupRelevance: "HIGH",
      contactStatus: "NONE",
      useCaseNote: "interne Notiz",
    },
  });
  return { batch, partner, startup, match };
}

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("snapshot helpers", () => {
  it("hashes states independent of key order", async () => {
    expect(stableStringify({ b: 1, a: [true, null] })).toBe('{"a":[true,null],"b":1}');
    expect(await hashState({ a: 1, b: "x" })).toBe(await hashState({ b: "x", a: 1 }));
    expect(await hashState({ a: 1 })).not.toBe(await hashState({ a: 2 }));
  });

  it("truncates to the UTC calendar day", () => {
    expect(utcDay(new Date("2026-10-13T23:30:00+02:00")).toISOString()).toBe("2026-10-13T00:00:00.000Z");
  });
});

describe("takeInsightsSnapshot", () => {
  it("stores every entity once, then only changes", async () => {
    const { match, startup } = await seedMatrix();
    const day1 = new Date("2026-10-13T08:00:00Z");

    const first = await takeInsightsSnapshot(day1);
    expect(first).toEqual({ takenOn: "2026-10-13", checked: 2, written: 2 });

    const rerun = await takeInsightsSnapshot(day1);
    expect(rerun.written).toBe(0);

    await prisma.partnerStartupMatch.update({
      where: { id: match.id },
      data: { contactStatus: "IN_CONTACT" },
    });
    const day2 = await takeInsightsSnapshot(new Date("2026-10-14T08:00:00Z"));
    expect(day2.written).toBe(1);

    const history = await prisma.metricSnapshot.findMany({
      where: { entityType: "MATCH", entityId: match.id },
      orderBy: { takenOn: "asc" },
    });
    expect(history.map((h) => (h.state as { contactStatus: string }).contactStatus)).toEqual([
      "NONE",
      "IN_CONTACT",
    ]);
    expect(
      await prisma.metricSnapshot.count({ where: { entityType: "STARTUP", entityId: startup.id } })
    ).toBe(1);
  });

  it("replaces the same-day row when the state changes twice in one day", async () => {
    const { match } = await seedMatrix();
    const day = new Date("2026-10-13T08:00:00Z");
    await takeInsightsSnapshot(day);
    await prisma.partnerStartupMatch.update({
      where: { id: match.id },
      data: { contactStatus: "PILOT_AGREED" },
    });
    const second = await takeInsightsSnapshot(new Date("2026-10-13T20:00:00Z"));
    expect(second.written).toBe(1);

    const rows = await prisma.metricSnapshot.findMany({ where: { entityId: match.id } });
    expect(rows).toHaveLength(1);
    expect((rows[0].state as { contactStatus: string }).contactStatus).toBe("PILOT_AGREED");
  });

  it("does not copy free-text notes and leaves the source rows untouched", async () => {
    const { match } = await seedMatrix();
    const before = await prisma.partnerStartupMatch.findUniqueOrThrow({ where: { id: match.id } });

    await takeInsightsSnapshot(new Date("2026-10-13T08:00:00Z"));

    const after = await prisma.partnerStartupMatch.findUniqueOrThrow({ where: { id: match.id } });
    expect(after.updatedAt.getTime()).toBe(before.updatedAt.getTime());
    const row = await prisma.metricSnapshot.findFirstOrThrow({ where: { entityId: match.id } });
    expect(JSON.stringify(row.state)).not.toContain("interne Notiz");
  });
});

describe("loadInsightsDataset", () => {
  it("attributes engagements to matrix partners via the company account or the legacy name", async () => {
    const { partner, startup } = await seedMatrix();
    const company = await prisma.company.create({ data: { name: "FingerHaus GmbH" } });
    await prisma.partnerCompany.update({ where: { id: partner.id }, data: { companyId: company.id } });

    const linkedUser = await createUser({ role: "BUSINESS_PARTNER" });
    await prisma.user.update({ where: { id: linkedUser.id }, data: { companyId: company.id } });
    const namedUser = await createUser({ role: "BUSINESS_PARTNER" });
    await prisma.user.update({ where: { id: namedUser.id }, data: { company: "Fingerhaus Bau AG" } });
    const otherUser = await createUser({ role: "BUSINESS_PARTNER" });
    const team = await createUser({ role: "ADMIN" });

    for (const [title, partnerId] of [
      ["linked", linkedUser.id],
      ["named", namedUser.id],
      ["other", otherUser.id],
    ]) {
      await prisma.engagement.create({
        data: { title, partnerId, startupId: startup.id, createdById: team.id },
      });
    }

    const ds = await loadInsightsDataset();
    const byTitle = Object.fromEntries(
      ds.engagements.map((e) => [e.title, [e.partnerCompanyId, e.partnerResolution]])
    );
    expect(byTitle).toEqual({
      linked: [partner.id, "company"],
      named: [partner.id, "name"],
      other: [null, "none"],
    });
    expect(ds.batchPartners).toEqual([{ batchId: ds.batches[0].id, partnerId: partner.id }]);
    expect(ds.matches[0]).not.toHaveProperty("useCaseNote");
  });
});
