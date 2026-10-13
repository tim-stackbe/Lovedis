import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Entdecke is the shop window of the *current* Industry Batch. Before batch
// scoping the only filter was `isPublished`, so any published startup outside
// the batch (a QA row, a past or future batch) leaked onto the surface that
// promises "Startups aus unserem aktuellen Industry Batch".
//
// The pure helpers are tested directly; the page tests render the real server
// components with a mocked Prisma so they assert on the filter that actually
// reaches the database.
// ---------------------------------------------------------------------------

const BATCH_1 = "cmt_batch_1";
const BATCH_2 = "cmt_batch_2";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    scoutingCampaign: { findMany: vi.fn() },
    startup: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
    },
    startupFollow: { findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn() },
    introRequest: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/auth-guards", () => ({
  requireMarketplace: vi
    .fn()
    .mockResolvedValue({ user: { id: "usr_investor", role: "INVESTOR" } }),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

import { notFound } from "next/navigation";
import { pickCurrentBatch, discoverStartupWhere } from "@/lib/discover-batch";
import { prisma } from "@/lib/prisma";

const scoutingCampaignFindMany = vi.mocked(prisma.scoutingCampaign.findMany);
const startupFindMany = vi.mocked(prisma.startup.findMany);
const startupFindFirst = vi.mocked(prisma.startup.findFirst);
const startupCount = vi.mocked(prisma.startup.count);
const mockNotFound = vi.mocked(notFound);

function batch(overrides: Partial<{
  id: string;
  startDate: Date | null;
  endDate: Date | null;
  createdAt: Date;
}> = {}) {
  return {
    id: BATCH_1,
    startDate: null,
    endDate: null,
    createdAt: new Date("2026-09-11T10:36:00.348Z"),
    ...overrides,
  };
}

/** The `where` filter a mocked Prisma method received on its first call. */
function whereOf(mock: { mock: { calls: unknown[][] } }): unknown {
  const args = mock.mock.calls[0]?.[0] as { where?: unknown } | undefined;
  return args?.where;
}

/**
 * Every string reachable in the returned element tree, including data handed to
 * child components as props — the startup cards are client components that are
 * only described, never invoked, so their names live in props, not in children.
 */
function textOf(
  node: unknown,
  out: string[] = [],
  seen = new WeakSet<object>()
): string[] {
  if (node == null || typeof node === "boolean") return out;
  if (typeof node === "string" || typeof node === "number") {
    out.push(String(node));
    return out;
  }
  if (typeof node !== "object" || seen.has(node)) return out;
  seen.add(node);
  for (const value of Object.values(node)) textOf(value, out, seen);
  return out;
}

beforeEach(() => {
  vi.clearAllMocks();
  startupFindMany.mockResolvedValue([] as never);
  startupCount.mockResolvedValue(0 as never);
  vi.mocked(prisma.startupFollow.findMany).mockResolvedValue([] as never);
});

describe("pickCurrentBatch — derived from existing schema fields", () => {
  const NOW = new Date("2026-09-14T12:00:00.000Z");

  it("has no current batch when none exist", () => {
    expect(pickCurrentBatch([], NOW)).toBeNull();
  });

  it("treats a batch without a date window as running (today's Batch #1)", () => {
    expect(pickCurrentBatch([batch()], NOW)?.id).toBe(BATCH_1);
  });

  it("prefers the batch whose window contains now over a finished one", () => {
    const finished = batch({
      id: BATCH_1,
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-06-30"),
      createdAt: new Date("2026-08-01"),
    });
    const running = batch({
      id: BATCH_2,
      startDate: new Date("2026-09-01"),
      endDate: new Date("2026-12-31"),
      createdAt: new Date("2026-07-01"),
    });
    expect(pickCurrentBatch([finished, running], NOW)?.id).toBe(BATCH_2);
  });

  it("ignores a batch that has not started yet", () => {
    const upcoming = batch({ id: BATCH_2, startDate: new Date("2027-01-01") });
    expect(pickCurrentBatch([batch(), upcoming], NOW)?.id).toBe(BATCH_1);
  });

  it("takes the most recently started of several running batches", () => {
    const older = batch({ id: BATCH_1, startDate: new Date("2026-03-01") });
    const newer = batch({ id: BATCH_2, startDate: new Date("2026-09-01") });
    expect(pickCurrentBatch([older, newer], NOW)?.id).toBe(BATCH_2);
  });

  it("falls back to the newest batch when every batch has ended", () => {
    const old = batch({
      id: BATCH_1,
      endDate: new Date("2026-02-01"),
      createdAt: new Date("2026-01-01"),
    });
    const recent = batch({
      id: BATCH_2,
      endDate: new Date("2026-08-01"),
      createdAt: new Date("2026-05-01"),
    });
    // A stale batch beats an empty marketplace.
    expect(pickCurrentBatch([old, recent], NOW)?.id).toBe(BATCH_2);
  });
});

describe("discoverStartupWhere", () => {
  it("requires published AND membership in the current batch", () => {
    expect(discoverStartupWhere(BATCH_1)).toEqual({
      isPublished: true,
      batchStartups: { some: { batchId: BATCH_1 } },
    });
  });

  it("falls back to all published storefronts when no batch resolves", () => {
    // Silently rendering an empty Entdecke for everyone would be worse than the
    // pre-batch behaviour; publishing is still required either way.
    expect(discoverStartupWhere(null)).toEqual({ isPublished: true });
  });
});

describe("/discover scopes its query to the current batch", () => {
  async function renderList() {
    const page = (await import("@/app/(main)/discover/page")).default;
    return page({ searchParams: Promise.resolve({}) });
  }

  it("filters on batch membership on top of isPublished", async () => {
    scoutingCampaignFindMany.mockResolvedValue([batch()] as never);
    await renderList();

    const where = whereOf(startupFindMany);
    expect(where).toMatchObject({
      isPublished: true,
      batchStartups: { some: { batchId: BATCH_1 } },
    });
  });

  it("does not list a published startup outside the batch", async () => {
    scoutingCampaignFindMany.mockResolvedValue([batch()] as never);
    // Prisma applies the filter; the page must ask for it and render only what
    // comes back — here the batch has a single member.
    startupFindMany.mockImplementation((async ({
      where,
      distinct,
    }: {
      where?: unknown;
      distinct?: unknown;
    }) => {
      if (distinct) return []; // the industry-filter options query
      const scoped = Boolean(
        (where as { batchStartups?: unknown }).batchStartups
      );
      return scoped
        ? [
            {
              id: "su_in_batch",
              name: "EPINOIA",
              tagline: null,
              description: "Wissensmanagement.",
              logoUrl: null,
              industry: "Knowledge Management",
              stage: "SEED",
              city: null,
              country: null,
              teamSize: null,
              seekingFunding: false,
              seekingAmount: null,
              lookingFor: [],
              _count: { followers: 0 },
            },
          ]
        : [{ id: "su_qa", name: "Test Startup (QA)" }];
    }) as never);
    startupCount.mockResolvedValue(1 as never);

    const text = textOf(await renderList()).join(" ");
    expect(text).toContain("EPINOIA");
    expect(text).not.toContain("Test Startup (QA)");
  });

  it("counts only batch members in the banner, so the stat matches the list", async () => {
    scoutingCampaignFindMany.mockResolvedValue([batch()] as never);
    await renderList();

    expect(whereOf(startupCount)).toEqual({
      isPublished: true,
      batchStartups: { some: { batchId: BATCH_1 } },
    });
  });

  it("still lists published startups when no batch exists", async () => {
    scoutingCampaignFindMany.mockResolvedValue([] as never);
    await renderList();

    expect(whereOf(startupFindMany)).toEqual({
      isPublished: true,
    });
  });
});

describe("/discover/[id] mirrors the list's visibility filter", () => {
  async function renderDetail(id: string) {
    const page = (await import("@/app/(main)/discover/[id]/page")).default;
    return page({ params: Promise.resolve({ id }) });
  }

  it("scopes the detail read to the current batch", async () => {
    scoutingCampaignFindMany.mockResolvedValue([batch()] as never);
    startupFindFirst.mockResolvedValue(null as never);

    await expect(renderDetail("su_qa")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(whereOf(startupFindFirst)).toEqual({
      isPublished: true,
      batchStartups: { some: { batchId: BATCH_1 } },
      id: "su_qa",
    });
  });

  it("404s a published startup outside the batch instead of deep-linking it", async () => {
    scoutingCampaignFindMany.mockResolvedValue([batch()] as never);
    // Prisma finds nothing for the scoped filter: the row is published but not
    // a batch member.
    startupFindFirst.mockResolvedValue(null as never);

    await expect(renderDetail("su_qa")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mockNotFound).toHaveBeenCalled();
  });
});
