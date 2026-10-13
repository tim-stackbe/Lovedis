import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// The Logbuch is ADMIN-only. The real guards run here (only `@/auth`, Prisma
// and the consensus helper are mocked), so every action, query and page is
// authorized against the same DB-role lookup production uses. On top of the
// gate: authors edit only their own rows, any admin may soft delete, and at
// most LOG_MAX_PINNED entries can be pinned per startup.
// ---------------------------------------------------------------------------

class RedirectSignal extends Error {
  constructor(public url: string) {
    super(`REDIRECT:${url}`);
  }
}

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new RedirectSignal(url);
  }),
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/consensus-data", () => ({
  getStartupConsensus: vi.fn().mockResolvedValue({
    evaluatorCount: 0,
    weightedTotal: 0,
    recommendation: "STRONG_NO",
    gated: false,
  }),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
    contact: { findMany: vi.fn().mockResolvedValue([]) },
    scoutingCampaign: { findMany: vi.fn().mockResolvedValue([]) },
    startup: { findUnique: vi.fn() },
    startupLogEntry: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn(),
      update: vi.fn(),
    },
    startupLogComment: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { auth } from "@/auth";
import {
  createLogComment,
  createLogEntry,
  deleteLogComment,
  deleteLogEntry,
  toggleLogEntryPin,
  toggleLogFollowUpDone,
  updateLogComment,
  updateLogEntry,
} from "@/app/actions/logbook";
import StartupLogbookPage from "@/app/(main)/startups/[id]/logbuch/page";
import StartupDetailPage from "@/app/(main)/startups/[id]/page";
import type { UserRole } from "@/generated/prisma/enums";
import { LOG_MAX_PINNED } from "@/lib/constants";
import { getLogbook, getLogbookTeaser } from "@/lib/logbook";
import { prisma } from "@/lib/prisma";

const mockAuth = vi.mocked(auth);
const mockUserFindUnique = vi.mocked(prisma.user.findUnique);
const entryDb = vi.mocked(prisma.startupLogEntry);
const commentDb = vi.mocked(prisma.startupLogComment);

function signIn(role: UserRole, id = "usr_admin"): void {
  mockAuth.mockResolvedValue({ user: { id, role } } as never);
  mockUserFindUnique.mockResolvedValue({ id, isActive: true, role } as never);
}

async function redirectUrlOf(fn: () => Promise<unknown>): Promise<string | null> {
  try {
    await fn();
    return null;
  } catch (err) {
    if (err instanceof RedirectSignal) return err.url;
    throw err;
  }
}

function form(values: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) fd.set(k, v);
  return fd;
}

const ENTRY_ROW = {
  startupId: "su_1",
  authorId: "usr_author",
  source: "MANUAL",
  type: "CALL",
  deletedAt: null,
  occurredAt: new Date("2026-10-01T10:00:00Z"),
  pinnedAt: null,
  nextStep: "Deck",
  followUpDoneAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

const NON_ADMIN: UserRole[] = ["MEMBER", "BUSINESS_PARTNER", "INVESTOR", "STARTUP"];

describe("ADMIN-only gate", () => {
  const calls: [string, () => Promise<unknown>][] = [
    ["createLogEntry", () => createLogEntry(undefined, form({ startupId: "su_1", type: "NOTE", body: "x" }))],
    ["updateLogEntry", () => updateLogEntry(undefined, form({ entryId: "le_1", type: "NOTE", body: "x" }))],
    ["deleteLogEntry", () => deleteLogEntry("le_1")],
    ["toggleLogEntryPin", () => toggleLogEntryPin("le_1")],
    ["toggleLogFollowUpDone", () => toggleLogFollowUpDone("le_1")],
    ["createLogComment", () => createLogComment(undefined, form({ entryId: "le_1", body: "x" }))],
    ["updateLogComment", () => updateLogComment(undefined, form({ commentId: "lc_1", body: "x" }))],
    ["deleteLogComment", () => deleteLogComment("lc_1")],
    ["getLogbook", () => getLogbook("su_1")],
    ["getLogbookTeaser", () => getLogbookTeaser("su_1")],
    [
      "Logbuch page",
      () =>
        StartupLogbookPage({
          params: Promise.resolve({ id: "su_1" }),
          searchParams: Promise.resolve({}),
        }),
    ],
  ];

  for (const role of NON_ADMIN) {
    it(`redirects ${role} away from every Logbuch action, query and page`, async () => {
      signIn(role, "usr_x");
      for (const [name, call] of calls) {
        expect(await redirectUrlOf(call), name).toMatch(/^\/dashboard\//);
      }
      for (const fn of Object.values(entryDb)) expect(fn).not.toHaveBeenCalled();
      for (const fn of Object.values(commentDb)) expect(fn).not.toHaveBeenCalled();
    });
  }
});

describe("startup detail teaser", () => {
  const startupRow = {
    id: "su_1",
    name: "EPINOIA",
    description: "x",
    industry: "Industrie",
    stage: "SEED",
    pipelineStage: "DISCOVERED",
    fundingRaised: null,
    teamSize: null,
    city: null,
    country: null,
    foundedYear: null,
    website: null,
    createdAt: new Date(),
    radarQuadrant: null,
    radarRing: null,
    sourceType: null,
    screenedAt: null,
    screenedBy: null,
    screenSummary: null,
    screenRecommendation: null,
    campaign: null,
    contacts: [],
    attachments: [],
    evaluations: [],
    partnerReviews: [],
  };

  const render = () =>
    StartupDetailPage({ params: Promise.resolve({ id: "su_1" }) });

  it("does not load any Logbuch data for MEMBER", async () => {
    signIn("MEMBER", "usr_member");
    vi.mocked(prisma.startup.findUnique).mockResolvedValue(startupRow as never);
    await render();
    for (const fn of Object.values(entryDb)) expect(fn).not.toHaveBeenCalled();
  });

  it("loads the teaser for ADMIN", async () => {
    signIn("ADMIN");
    vi.mocked(prisma.startup.findUnique).mockResolvedValue(startupRow as never);
    await render();
    expect(entryDb.findMany).toHaveBeenCalledTimes(1);
    expect(entryDb.count).toHaveBeenCalledTimes(1);
  });
});

describe("ownership and soft delete", () => {
  it("rejects editing another admin's entry", async () => {
    signIn("ADMIN", "usr_other");
    entryDb.findUnique.mockResolvedValue(ENTRY_ROW as never);
    const res = await updateLogEntry(
      undefined,
      form({ entryId: "le_1", type: "CALL", body: "geändert" })
    );
    expect(res.error).toBe("Du kannst nur deine eigenen Einträge bearbeiten.");
    expect(entryDb.update).not.toHaveBeenCalled();
  });

  it("lets the author edit and stamps editedAt", async () => {
    signIn("ADMIN", "usr_author");
    entryDb.findUnique.mockResolvedValue(ENTRY_ROW as never);
    const res = await updateLogEntry(
      undefined,
      form({ entryId: "le_1", type: "CALL", body: "geändert" })
    );
    expect(res.success).toBeDefined();
    const data = entryDb.update.mock.calls[0][0].data;
    expect(data.body).toBe("geändert");
    expect(data.editedAt).toBeInstanceOf(Date);
  });

  it("never edits SYSTEM entries, even for their 'author'", async () => {
    signIn("ADMIN", "usr_author");
    entryDb.findUnique.mockResolvedValue({ ...ENTRY_ROW, source: "SYSTEM" } as never);
    const res = await updateLogEntry(
      undefined,
      form({ entryId: "le_1", type: "CALL", body: "x" })
    );
    expect(res.error).toBeDefined();
    expect(entryDb.update).not.toHaveBeenCalled();
  });

  it("lets any admin soft delete and records who did it", async () => {
    signIn("ADMIN", "usr_other");
    entryDb.findUnique.mockResolvedValue(ENTRY_ROW as never);
    await deleteLogEntry("le_1");
    const data = entryDb.update.mock.calls[0][0].data;
    expect(data.deletedAt).toBeInstanceOf(Date);
    expect(data.deletedById).toBe("usr_other");
  });

  it("rejects editing another admin's comment", async () => {
    signIn("ADMIN", "usr_other");
    commentDb.findUnique.mockResolvedValue({
      authorId: "usr_author",
      deletedAt: null,
      entry: { startupId: "su_1" },
    } as never);
    const res = await updateLogComment(
      undefined,
      form({ commentId: "lc_1", body: "x" })
    );
    expect(res.error).toBe("Du kannst nur deine eigenen Antworten bearbeiten.");
    expect(commentDb.update).not.toHaveBeenCalled();
  });
});

describe("pin limit", () => {
  it(`refuses a pin beyond ${LOG_MAX_PINNED}`, async () => {
    signIn("ADMIN");
    entryDb.findUnique.mockResolvedValue(ENTRY_ROW as never);
    entryDb.count.mockResolvedValue(LOG_MAX_PINNED);
    const res = await toggleLogEntryPin("le_1");
    expect(res.error).toContain(String(LOG_MAX_PINNED));
    expect(entryDb.update).not.toHaveBeenCalled();
  });

  it("pins below the limit and always allows unpinning", async () => {
    signIn("ADMIN");
    entryDb.findUnique.mockResolvedValue(ENTRY_ROW as never);
    entryDb.count.mockResolvedValue(LOG_MAX_PINNED - 1);
    await toggleLogEntryPin("le_1");
    expect(entryDb.update.mock.calls[0][0].data.pinnedAt).toBeInstanceOf(Date);

    entryDb.update.mockClear();
    entryDb.findUnique.mockResolvedValue({ ...ENTRY_ROW, pinnedAt: new Date() } as never);
    entryDb.count.mockResolvedValue(LOG_MAX_PINNED);
    await toggleLogEntryPin("le_1");
    expect(entryDb.update.mock.calls[0][0].data.pinnedAt).toBeNull();
  });
});
