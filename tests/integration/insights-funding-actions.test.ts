import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth-guards", () => ({ requireAdmin: vi.fn(), requireStartup: vi.fn() }));

import {
  createFeedbackSurvey,
  deleteFundingEvent,
  saveFundingEvent,
  saveFundingScope,
  setFeedbackSurveyClosed,
  submitFeedback,
} from "@/app/actions/funding";
import { requireAdmin, requireStartup } from "@/lib/auth-guards";
import { loadInsightsDataset } from "@/lib/insights/data";
import { buildFundingReport } from "@/lib/insights/funding";
import { loadFundingDataset, surveysForStartup } from "@/lib/insights/funding-data";
import { createProgram, createProgramBooking, createUser, prisma, resetDb } from "../helpers/db";

// ---------------------------------------------------------------------------
// KPI-Insights Phase 3 actions against a real Postgres. They may only write to
// FundingScopeItem, FundingEventCount, FeedbackSurvey and FeedbackResponse;
// batches, programs, bookings, mentors and startups stay byte-for-byte unchanged.
// ---------------------------------------------------------------------------

let adminId: string;

function form(values: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) fd.set(k, v);
  return fd;
}

function asStartupUser(id: string) {
  vi.mocked(requireStartup).mockResolvedValue({
    user: { id, role: "STARTUP" },
  } as Awaited<ReturnType<typeof requireStartup>>);
}

async function seed() {
  const owner = await createUser({ role: "STARTUP" });
  const outsider = await createUser({ role: "STARTUP" });
  const batch = await prisma.scoutingCampaign.create({
    data: { name: "Industry #1", type: "INDUSTRIEPROGRAMM", startDate: new Date("2026-09-01"), endDate: new Date("2026-12-15") },
  });
  const startup = await prisma.startup.create({
    data: { name: "Alpha", description: "Test", industry: "Bau", foundedYear: 2023, ownerUserId: owner.id },
  });
  const other = await prisma.startup.create({
    data: { name: "Beta", description: "Test", industry: "Bau", ownerUserId: outsider.id },
  });
  await prisma.batchStartup.create({ data: { batchId: batch.id, startupId: startup.id } });
  const program = await createProgram({ createdById: adminId });
  await createProgramBooking({
    startupId: other.id,
    programId: program.id,
    requestedById: outsider.id,
    status: "CONFIRMED",
    fixCreditCost: 0,
  });
  await prisma.mentorProfile.create({ data: { name: "Mentorin", isActive: true } });
  await prisma.mentorProfile.create({ data: { name: "Inaktiv", isActive: false } });
  return { owner, outsider, batch, startup, other, program };
}

/** Rows of the existing tables, to prove the actions never write to them. */
async function existingState() {
  const [startups, batches, batchStartups, programs, bookings, mentors] = await Promise.all([
    prisma.startup.findMany({ orderBy: { id: "asc" } }),
    prisma.scoutingCampaign.findMany({ orderBy: { id: "asc" } }),
    prisma.batchStartup.findMany({ orderBy: { id: "asc" } }),
    prisma.program.findMany({ orderBy: { id: "asc" } }),
    prisma.marketplaceBooking.findMany({ orderBy: { id: "asc" } }),
    prisma.mentorProfile.findMany({ orderBy: { id: "asc" } }),
  ]);
  return JSON.stringify({ startups, batches, batchStartups, programs, bookings, mentors });
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

describe("saveFundingScope", () => {
  it("assigns, changes and removes formats without touching batches or programs", async () => {
    const { batch, program } = await seed();
    const before = await existingState();

    expect((await saveFundingScope(undefined, form({ kind: "BATCH", refId: batch.id, format: "CONSTRUCTION" }))).success).toBeDefined();
    expect((await saveFundingScope(undefined, form({ kind: "BATCH", refId: batch.id, format: "INDUSTRY" }))).success).toBeDefined();
    await saveFundingScope(undefined, form({ kind: "PROGRAM", refId: program.id, format: "PROGRAM_2" }));
    const rows = await prisma.fundingScopeItem.findMany({ orderBy: { kind: "asc" } });
    expect(rows.map((r) => [r.kind, r.format])).toEqual([
      ["BATCH", "INDUSTRY"],
      ["PROGRAM", "PROGRAM_2"],
    ]);
    expect(rows[0].createdById).toBe(adminId);

    expect((await saveFundingScope(undefined, form({ kind: "PROGRAM", refId: program.id, format: "" }))).success).toBe("Zuordnung entfernt.");
    expect(await prisma.fundingScopeItem.count()).toBe(1);

    expect((await saveFundingScope(undefined, form({ kind: "BATCH", refId: "nope", format: "INDUSTRY" }))).error).toMatch(/Batch/);
    expect((await saveFundingScope(undefined, form({ kind: "PROGRAM", refId: batch.id, format: "PROGRAM_1" }))).error).toMatch(/Programm/);
    expect((await saveFundingScope(undefined, form({ kind: "BATCH", refId: batch.id, format: "PROGRAM_1" }))).error).toBeDefined();
    expect(await existingState()).toBe(before);
  });
});

describe("saveFundingEvent / deleteFundingEvent", () => {
  it("creates, updates and deletes event counts", async () => {
    await seed();
    const before = await existingState();
    const base = { kind: "DEMO_DAY", title: "Demo Day Industry", heldOn: "2026-12-10", attendees: "58", source: "LUMA" };

    expect((await saveFundingEvent(undefined, form(base))).success).toBe("Veranstaltung eingetragen.");
    const event = await prisma.fundingEventCount.findFirstOrThrow();
    expect(event).toMatchObject({ attendees: 58, source: "LUMA", createdById: adminId });
    expect(event.heldOn.toISOString()).toBe("2026-12-10T00:00:00.000Z");

    const updated = await saveFundingEvent(undefined, form({ ...base, id: event.id, attendees: "64", source: "ATTIO", note: "Check-in" }));
    expect(updated.success).toBe("Veranstaltung gespeichert.");
    expect(await prisma.fundingEventCount.findUniqueOrThrow({ where: { id: event.id } })).toMatchObject({
      attendees: 64,
      source: "ATTIO",
      note: "Check-in",
    });
    expect((await saveFundingEvent(undefined, form({ ...base, id: "nope" }))).error).toMatch(/nicht gefunden/);
    expect((await saveFundingEvent(undefined, form({ ...base, attendees: "x" }))).error).toBeDefined();

    expect((await deleteFundingEvent(undefined, form({ id: event.id }))).success).toBeDefined();
    expect((await deleteFundingEvent(undefined, form({ id: event.id }))).error).toMatch(/nicht gefunden/);
    expect(await prisma.fundingEventCount.count()).toBe(0);
    expect(await existingState()).toBe(before);
  });
});

describe("feedback surveys", () => {
  it("lets participants answer once (updatable) while open, and nobody else", async () => {
    const { owner, outsider, batch, startup } = await seed();
    const before = await existingState();

    expect((await createFeedbackSurvey(undefined, form({ scope: `BATCH:${batch.id}`, title: "Abschluss Industry" }))).success).toBe(
      "Umfrage geöffnet."
    );
    expect((await createFeedbackSurvey(undefined, form({ scope: "BATCH:nope", title: "x" }))).error).toMatch(/Batch/);
    const survey = await prisma.feedbackSurvey.findFirstOrThrow();

    expect(await surveysForStartup(startup.id)).toEqual([
      { id: survey.id, title: "Abschluss Industry", scopeName: "Industry #1", open: true, answered: false },
    ]);

    asStartupUser(owner.id);
    const answer = { surveyId: survey.id, recommend: "9", overall: "4", goodText: "Partner-Intros" };
    expect((await submitFeedback(undefined, form(answer))).success).toBeDefined();
    expect((await submitFeedback(undefined, form({ ...answer, recommend: "10" }))).success).toBeDefined();
    const responses = await prisma.feedbackResponse.findMany();
    expect(responses).toHaveLength(1);
    expect(responses[0]).toMatchObject({ startupId: startup.id, userId: owner.id, recommend: 10, overall: 4, goodText: "Partner-Intros" });
    expect((await surveysForStartup(startup.id))[0].answered).toBe(true);

    asStartupUser(outsider.id);
    expect((await submitFeedback(undefined, form(answer))).error).toMatch(/nicht teil/);

    await setFeedbackSurveyClosed(undefined, form({ id: survey.id, close: "true" }));
    asStartupUser(owner.id);
    expect((await submitFeedback(undefined, form(answer))).error).toMatch(/geschlossen/);
    await setFeedbackSurveyClosed(undefined, form({ id: survey.id, close: "false" }));
    expect((await submitFeedback(undefined, form({ ...answer, recommend: "8" }))).success).toBeDefined();

    expect(await existingState()).toBe(before);
  });

  it("scopes program surveys to confirmed bookings", async () => {
    const { owner, outsider, program, other } = await seed();
    await createFeedbackSurvey(undefined, form({ scope: `PROGRAM:${program.id}`, title: "Programm-Feedback" }));
    const survey = await prisma.feedbackSurvey.findFirstOrThrow();

    asStartupUser(owner.id);
    expect((await submitFeedback(undefined, form({ surveyId: survey.id, recommend: "7", overall: "3" }))).error).toMatch(/nicht teil/);
    asStartupUser(outsider.id);
    expect((await submitFeedback(undefined, form({ surveyId: survey.id, recommend: "7", overall: "3" }))).success).toBeDefined();
    expect((await surveysForStartup(other.id)).map((s) => s.scopeName)).toEqual([program.title]);
  });

  it("rejects users without a startup", async () => {
    const { batch } = await seed();
    await createFeedbackSurvey(undefined, form({ scope: `BATCH:${batch.id}`, title: "x" }));
    const survey = await prisma.feedbackSurvey.findFirstOrThrow();
    const lonely = await createUser({ role: "STARTUP" });
    asStartupUser(lonely.id);
    expect((await submitFeedback(undefined, form({ surveyId: survey.id, recommend: "7", overall: "3" }))).error).toMatch(/kein Startup/);
  });
});

describe("loader and report", () => {
  it("builds the Verwendungsnachweis from real rows", async () => {
    const { owner, batch, program } = await seed();
    await saveFundingScope(undefined, form({ kind: "BATCH", refId: batch.id, format: "INDUSTRY" }));
    await saveFundingScope(undefined, form({ kind: "PROGRAM", refId: program.id, format: "PROGRAM_1" }));
    await saveFundingEvent(undefined, form({ kind: "FLAGSHIP", title: "LOVE DISRUPTION", heldOn: "2026-11-05", attendees: "280", source: "LUMA" }));
    await createFeedbackSurvey(undefined, form({ scope: `BATCH:${batch.id}`, title: "x" }));
    const survey = await prisma.feedbackSurvey.findFirstOrThrow();
    asStartupUser(owner.id);
    await submitFeedback(undefined, form({ surveyId: survey.id, recommend: "8", overall: "4", improveText: "Mehr Zeit" }));

    const [ds, fd] = await Promise.all([loadInsightsDataset(), loadFundingDataset()]);
    expect(fd.responses[0]).not.toHaveProperty("improveText");
    expect(fd.activeMentors).toBe(1);
    const report = buildFundingReport(ds, fd, new Date("2026-12-20T10:00:00Z"));
    const kpi = (key: string) => report.kpis.find((k) => k.key === key)!;
    expect(kpi("accelerator-startups").actual).toBe("1");
    expect(kpi("program-participants").actual).toBe("1");
    expect(kpi("mentors").actual).toBe("1");
    expect(kpi("event-FLAGSHIP")).toMatchObject({ actual: "280", status: "reached" });
    expect(kpi("nps").actual).toBe("8,0");
    expect(report.participantIds.size).toBe(2);
  });
});
