import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth-guards", () => ({ requireAdmin: vi.fn(), requireTeam: vi.fn() }));

import {
  deleteTracking,
  saveBatchChallenges,
  saveReportingMeta,
  saveTracking,
} from "@/app/actions/insights";
import { requireAdmin } from "@/lib/auth-guards";
import { loadInsightsDataset } from "@/lib/insights/data";
import { takeInsightsSnapshot } from "@/lib/insights/snapshot";
import { createUser, prisma, resetDb } from "../helpers/db";

// ---------------------------------------------------------------------------
// KPI-Insights Phase 2 actions against a real Postgres. They may only write to
// StartupReportingMeta, PipelineTracking and BatchChallengeLink; every
// existing row they reference must stay byte-for-byte unchanged.
// ---------------------------------------------------------------------------

let adminId: string;

function form(values: Record<string, string | string[]>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) {
    for (const item of Array.isArray(v) ? v : [v]) fd.append(k, item);
  }
  return fd;
}

async function seed() {
  const admin = await prisma.user.findUniqueOrThrow({ where: { id: adminId } });
  const partnerUser = await createUser({ role: "BUSINESS_PARTNER" });
  const batch = await prisma.scoutingCampaign.create({ data: { name: "LD Test", type: "ACCELERATOR" } });
  const partner = await prisma.partnerCompany.create({ data: { name: "FingerHaus", slug: "fingerhaus" } });
  const startup = await prisma.startup.create({
    data: { name: "Alpha", description: "Test", industry: "Bau", city: "Kassel", teamSize: 4 },
  });
  const other = await prisma.startup.create({ data: { name: "Beta", description: "Test", industry: "Bau" } });
  await prisma.batchStartup.create({ data: { batchId: batch.id, startupId: startup.id } });
  await prisma.batchPartner.create({ data: { batchId: batch.id, partnerCompanyId: partner.id } });
  const challenge = await prisma.challenge.create({
    data: { title: "Bau-Challenge", description: "x", status: "OPEN", createdById: admin.id },
  });
  const challenge2 = await prisma.challenge.create({
    data: { title: "Holz-Challenge", description: "x", status: "OPEN", createdById: admin.id },
  });
  const engagement = await prisma.engagement.create({
    data: { title: "Pilot Alpha", partnerId: partnerUser.id, startupId: startup.id, createdById: admin.id },
  });
  return { batch, partner, startup, other, challenge, challenge2, engagement };
}

/** Rows of the existing tables, to prove the actions never write to them. */
async function existingState() {
  const [startups, batches, challenges, engagements, partners] = await Promise.all([
    prisma.startup.findMany({ orderBy: { id: "asc" } }),
    prisma.scoutingCampaign.findMany({ orderBy: { id: "asc" } }),
    prisma.challenge.findMany({ orderBy: { id: "asc" } }),
    prisma.engagement.findMany({ orderBy: { id: "asc" } }),
    prisma.partnerCompany.findMany({ orderBy: { id: "asc" } }),
  ]);
  return JSON.stringify({ startups, batches, challenges, engagements, partners });
}

beforeEach(async () => {
  await resetDb();
  adminId = (await createUser({ role: "ADMIN" })).id;
  vi.mocked(requireAdmin).mockResolvedValue({
    user: { id: adminId, role: "ADMIN" },
  } as Awaited<ReturnType<typeof requireAdmin>>);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("saveReportingMeta", () => {
  it("creates and updates the Förder facts without touching the startup", async () => {
    const { startup } = await seed();
    const before = await existingState();

    const created = await saveReportingMeta(
      undefined,
      form({ startupId: startup.id, hessenBased: "yes", foundersTotal: "2", foundersFemale: "1", fteBaseline: "3" })
    );
    expect(created.success).toBeDefined();
    const updated = await saveReportingMeta(
      undefined,
      form({ startupId: startup.id, hessenBased: "", foundersTotal: "2", foundersFemale: "2" })
    );
    expect(updated.success).toBeDefined();

    const rows = await prisma.startupReportingMeta.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      startupId: startup.id,
      hessenBased: null,
      foundersFemale: 2,
      fteBaseline: null,
      updatedById: adminId,
    });
    expect(await existingState()).toBe(before);
  });

  it("rejects unknown startups and invalid counts", async () => {
    expect((await saveReportingMeta(undefined, form({ startupId: "nope" }))).error).toMatch(/nicht gefunden/);
    const { startup } = await seed();
    const bad = await saveReportingMeta(undefined, form({ startupId: startup.id, foundersTotal: "1", foundersFemale: "3" }));
    expect(bad.error).toMatch(/Gründerinnen/);
    expect(await prisma.startupReportingMeta.count()).toBe(0);
  });
});

describe("saveTracking / deleteTracking", () => {
  it("creates, updates and deletes an entry; the linked engagement stays untouched", async () => {
    const { startup, partner, batch, engagement } = await seed();
    const before = await existingState();

    const created = await saveTracking(
      undefined,
      form({
        track: "BASIS",
        startupId: startup.id,
        partnerCompanyId: partner.id,
        batchId: batch.id,
        engagementId: engagement.id,
        stage: "PILOT",
        ndaSigned: "on",
        useCase: "Digitale Bauakte",
      })
    );
    expect(created.success).toBe("Tracking-Eintrag angelegt.");
    const entry = await prisma.pipelineTracking.findFirstOrThrow();
    expect(created.redirectTo).toBe(`/insights/tracking/${entry.id}`);
    expect(entry).toMatchObject({ stage: "PILOT", ndaSigned: true, createdById: adminId, useCase: "Digitale Bauakte" });

    const updated = await saveTracking(
      undefined,
      form({
        id: entry.id,
        track: "BASIS",
        startupId: startup.id,
        partnerCompanyId: partner.id,
        engagementId: engagement.id,
        stage: "CONTRACT",
        contractOn: "2026-09-01",
        revenueEur: "5000",
      })
    );
    expect(updated.success).toBe("Tracking-Eintrag gespeichert.");
    const after = await prisma.pipelineTracking.findUniqueOrThrow({ where: { id: entry.id } });
    expect(after).toMatchObject({ stage: "CONTRACT", revenueEur: 5000, ndaSigned: false, batchId: null, useCase: null });
    expect(after.contractOn?.toISOString()).toBe("2026-09-01T00:00:00.000Z");

    expect(await existingState()).toBe(before);

    const deleted = await deleteTracking(undefined, form({ id: entry.id }));
    expect(deleted).toMatchObject({ success: "Tracking-Eintrag gelöscht.", redirectTo: "/insights/tracking" });
    expect(await prisma.pipelineTracking.count()).toBe(0);
    expect((await deleteTracking(undefined, form({ id: entry.id }))).error).toMatch(/nicht gefunden/);
    expect(await existingState()).toBe(before);
  });

  it("validates references: unknown ids, foreign engagements and double links", async () => {
    const { startup, other, engagement } = await seed();
    const base = { track: "BASIS", stage: "MATCH" };

    expect((await saveTracking(undefined, form({ ...base, startupId: "nope" }))).error).toMatch(/Startup/);
    expect(
      (await saveTracking(undefined, form({ ...base, startupId: startup.id, partnerCompanyId: "nope" }))).error
    ).toMatch(/Partner/);
    expect(
      (await saveTracking(undefined, form({ ...base, startupId: other.id, engagementId: engagement.id }))).error
    ).toMatch(/anderen Startup/);

    expect(
      (await saveTracking(undefined, form({ ...base, startupId: startup.id, engagementId: engagement.id }))).success
    ).toBeDefined();
    expect(
      (await saveTracking(undefined, form({ ...base, startupId: startup.id, engagementId: engagement.id }))).error
    ).toMatch(/bereits/);
    expect((await saveTracking(undefined, form({ ...base, id: "nope", startupId: startup.id }))).error).toMatch(
      /nicht gefunden/
    );
    expect(await prisma.pipelineTracking.count()).toBe(1);
  });
});

describe("saveBatchChallenges", () => {
  it("replaces the challenge set of a batch without touching challenges or batches", async () => {
    const { batch, challenge, challenge2 } = await seed();
    const before = await existingState();

    await saveBatchChallenges(undefined, form({ batchId: batch.id, challengeId: [challenge.id, challenge2.id] }));
    expect(await prisma.batchChallengeLink.count({ where: { batchId: batch.id } })).toBe(2);

    const res = await saveBatchChallenges(undefined, form({ batchId: batch.id, challengeId: [challenge2.id] }));
    expect(res.success).toBe("1 Challenges dem Batch zugeordnet.");
    const links = await prisma.batchChallengeLink.findMany();
    expect(links.map((l) => l.challengeId)).toEqual([challenge2.id]);

    expect((await saveBatchChallenges(undefined, form({ batchId: batch.id, challengeId: ["nope"] }))).error).toMatch(
      /nicht gefunden/
    );
    expect((await saveBatchChallenges(undefined, form({ batchId: "nope" }))).error).toMatch(/Batch/);
    expect(await prisma.batchChallengeLink.count()).toBe(1);
    expect(await existingState()).toBe(before);
  });
});

describe("loader and snapshot with Phase 2 data", () => {
  it("loads tracking without free text and snapshots tracking and Förder facts", async () => {
    const { startup, partner, batch, challenge } = await seed();
    await saveReportingMeta(undefined, form({ startupId: startup.id, hessenBased: "yes", foundersTotal: "1", foundersFemale: "1" }));
    await saveTracking(
      undefined,
      form({ track: "ONE_ON_ONE", startupId: startup.id, partnerCompanyId: partner.id, stage: "LOI", goal: "Geheimes Ziel" })
    );
    await saveBatchChallenges(undefined, form({ batchId: batch.id, challengeId: [challenge.id] }));

    const ds = await loadInsightsDataset();
    expect(ds.reportingMeta).toEqual([expect.objectContaining({ startupId: startup.id, hessenBased: true })]);
    expect(ds.tracking).toHaveLength(1);
    expect(ds.tracking[0]).not.toHaveProperty("goal");
    expect(ds.batchChallenges).toEqual([{ batchId: batch.id, challengeId: challenge.id }]);

    const day1 = await takeInsightsSnapshot(new Date("2026-10-13T08:00:00Z"));
    const types = await prisma.metricSnapshot.groupBy({ by: ["entityType"], _count: true });
    expect(Object.fromEntries(types.map((t) => [t.entityType, t._count]))).toMatchObject({
      TRACKING: 1,
      REPORTING_META: 1,
    });
    const row = await prisma.metricSnapshot.findFirstOrThrow({ where: { entityType: "TRACKING" } });
    expect(JSON.stringify(row.state)).not.toContain("Geheimes Ziel");
    expect(day1.written).toBe(day1.checked);

    expect((await takeInsightsSnapshot(new Date("2026-10-13T09:00:00Z"))).written).toBe(0);
  });
});
