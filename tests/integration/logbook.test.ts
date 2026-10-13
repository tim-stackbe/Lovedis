import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth-guards", () => ({ requireAdmin: vi.fn() }));

import {
  createLogComment,
  createLogEntry,
  deleteLogEntry,
  toggleLogEntryPin,
  toggleLogFollowUpDone,
} from "@/app/actions/logbook";
import { requireAdmin } from "@/lib/auth-guards";
import { LOG_MAX_PINNED } from "@/lib/constants";
import { getLogbook, getLogbookTeaser } from "@/lib/logbook";
import { createUser, prisma, resetDb } from "../helpers/db";

let adminId: string;
let startupId: string;

function asAdmin(id: string) {
  vi.mocked(requireAdmin).mockResolvedValue({
    user: { id, role: "ADMIN" },
  } as Awaited<ReturnType<typeof requireAdmin>>);
}

function entryForm(values: Record<string, string | string[]>): FormData {
  const fd = new FormData();
  fd.set("startupId", startupId);
  for (const [k, v] of Object.entries(values)) {
    for (const item of Array.isArray(v) ? v : [v]) fd.append(k, item);
  }
  return fd;
}

async function newEntry(values: Record<string, string | string[]> = {}) {
  const res = await createLogEntry(
    undefined,
    entryForm({ type: "CALL", body: "Call", ...values })
  );
  expect(res.error).toBeUndefined();
  return prisma.startupLogEntry.findFirstOrThrow({
    where: { startupId },
    orderBy: { createdAt: "desc" },
  });
}

beforeEach(async () => {
  await resetDb();
  adminId = (await createUser({ role: "ADMIN" })).id;
  asAdmin(adminId);
  startupId = (
    await prisma.startup.create({
      data: { name: "EPINOIA", description: "x", industry: "AI" },
    })
  ).id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Logbuch actions against a real database", () => {
  it("creates an entry and drops participant ids that don't belong", async () => {
    const contact = await prisma.contact.create({
      data: { startupId, name: "Jane CEO" },
    });
    const member = await createUser({ role: "MEMBER" });
    const entry = await newEntry({
      contactIds: [contact.id, "foreign_contact"],
      teamParticipantIds: [adminId, member.id],
      nextStep: "Deck nachreichen",
      followUpAssigneeId: member.id,
    });
    expect(entry.source).toBe("MANUAL");
    expect(entry.authorId).toBe(adminId);
    expect(entry.contactIds).toEqual([contact.id]);
    expect(entry.teamParticipantIds).toEqual([adminId]);
    expect(entry.followUpAssigneeId).toBeNull();
  });

  it("enforces the pin limit with real counts", async () => {
    const entries = [];
    for (let i = 0; i <= LOG_MAX_PINNED; i++) entries.push(await newEntry());
    for (const e of entries.slice(0, LOG_MAX_PINNED)) {
      expect((await toggleLogEntryPin(e.id)).error).toBeUndefined();
    }
    const res = await toggleLogEntryPin(entries[LOG_MAX_PINNED].id);
    expect(res.error).toBeDefined();
    expect(
      await prisma.startupLogEntry.count({ where: { pinnedAt: { not: null } } })
    ).toBe(LOG_MAX_PINNED);
  });

  it("soft deletes, unpins and hides the entry from reads", async () => {
    const entry = await newEntry({ nextStep: "Follow-up" });
    await toggleLogEntryPin(entry.id);
    await createLogComment(
      undefined,
      (() => {
        const fd = new FormData();
        fd.set("entryId", entry.id);
        fd.set("body", "Antwort");
        return fd;
      })()
    );

    const other = await createUser({ role: "ADMIN" });
    asAdmin(other.id);
    expect((await deleteLogEntry(entry.id)).error).toBeUndefined();

    const row = await prisma.startupLogEntry.findUniqueOrThrow({
      where: { id: entry.id },
    });
    expect(row.deletedById).toBe(other.id);
    expect(row.pinnedAt).toBeNull();

    const data = await getLogbook(startupId);
    expect(data?.entries).toHaveLength(0);
    expect(data?.events.map((e) => e.label)).toContain("Startup angelegt");
    const teaser = await getLogbookTeaser(startupId);
    expect(teaser).toMatchObject({ recent: [], openFollowUps: 0, lastContactAt: null });
  });

  it("toggles follow-ups and reports them in the teaser", async () => {
    const entry = await newEntry({ nextStep: "Deck nachreichen" });
    expect((await getLogbookTeaser(startupId)).openFollowUps).toBe(1);
    await toggleLogFollowUpDone(entry.id);
    expect((await getLogbookTeaser(startupId)).openFollowUps).toBe(0);
    const data = await getLogbook(startupId);
    expect(data?.entries[0]).toMatchObject({ canEdit: true, comments: [] });
  });
});
