import { describe, expect, it, vi } from "vitest";

// Pure Logbuch logic: validation, per-row permission rules, pin limit and the
// read-time merge of derived system events. The DB and guards are not touched.
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/auth-guards", () => ({ requireAdmin: vi.fn() }));

import {
  canEditComment,
  canEditEntry,
  canPinAnother,
  createCommentSchema,
  createEntrySchema,
  deriveSystemEvents,
  describeLogContext,
  entryFormInput,
  filterTimeline,
  mergeTimeline,
  openFollowUps,
  parseLogFilters,
  pickStaleStartups,
  sortDashboardFollowUps,
  updateEntrySchema,
  type DerivedSource,
  type LogEntryView,
} from "@/lib/logbook";
import { LOG_MAX_PINNED } from "@/lib/constants";

function form(values: Record<string, string | string[]>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) {
    for (const item of Array.isArray(v) ? v : [v]) fd.append(k, item);
  }
  return fd;
}

const BASE = { startupId: "su_1", type: "CALL", body: "Intro-Call mit CEO." };

function entry(overrides: Partial<LogEntryView> = {}): LogEntryView {
  return {
    kind: "entry",
    id: "le_1",
    type: "NOTE",
    source: "MANUAL",
    occurredAt: new Date("2026-10-01T10:00:00Z"),
    createdAt: new Date("2026-10-01T10:00:00Z"),
    editedAt: null,
    title: null,
    body: "x",
    contactIds: [],
    teamParticipantIds: [],
    externalParticipants: null,
    nextStep: null,
    followUpAt: null,
    followUpDoneAt: null,
    followUpAssignee: null,
    pinnedAt: null,
    author: { id: "usr_a", name: "Anna Admin" },
    canEdit: true,
    context: null,
    comments: [],
    ...overrides,
  };
}

describe("entry validation", () => {
  it("parses a full composer submission and maps empty optionals to null", () => {
    const parsed = createEntrySchema.parse(
      entryFormInput(
        form({
          ...BASE,
          occurredAt: "2026-10-01T08:30:00.000Z",
          title: "  ",
          contactIds: ["c1", "c2"],
          teamParticipantIds: ["usr_a"],
          externalParticipants: "",
          nextStep: " Deck nachreichen ",
          followUpAt: "2026-10-10T21:59:59.000Z",
          followUpAssigneeId: "usr_a",
        })
      )
    );
    expect(parsed.title).toBeNull();
    expect(parsed.externalParticipants).toBeNull();
    expect(parsed.occurredAt).toEqual(new Date("2026-10-01T08:30:00.000Z"));
    expect(parsed.contactIds).toEqual(["c1", "c2"]);
    expect(parsed.nextStep).toBe("Deck nachreichen");
    expect(parsed.followUpAt).toEqual(new Date("2026-10-10T21:59:59.000Z"));
  });

  it("leaves occurredAt null when empty (server falls back to now)", () => {
    const parsed = createEntrySchema.parse(entryFormInput(form(BASE)));
    expect(parsed.occurredAt).toBeNull();
    expect(parsed.contactIds).toEqual([]);
  });

  it("rejects SYSTEM and unknown types, empty bodies and bad dates", () => {
    for (const type of ["SYSTEM", "TWEET"]) {
      expect(
        createEntrySchema.safeParse(entryFormInput(form({ ...BASE, type }))).success
      ).toBe(false);
    }
    const empty = createEntrySchema.safeParse(
      entryFormInput(form({ ...BASE, body: "   " }))
    );
    expect(empty.error?.issues[0]?.message).toBe(
      "Bitte beschreibe kurz, was passiert ist."
    );
    expect(
      createEntrySchema.safeParse(
        entryFormInput(form({ ...BASE, occurredAt: "gestern" }))
      ).success
    ).toBe(false);
  });

  it("requires a next step when a follow-up date is set", () => {
    const res = createEntrySchema.safeParse(
      entryFormInput(form({ ...BASE, followUpAt: "2026-10-10T21:59:59.000Z" }))
    );
    expect(res.success).toBe(false);
    expect(res.error?.issues[0]?.path).toEqual(["nextStep"]);
  });

  it("validates updates by entryId and comments by body", () => {
    expect(
      updateEntrySchema.safeParse(
        entryFormInput(form({ entryId: "le_1", type: "MEETING", body: "ok" }))
      ).success
    ).toBe(true);
    expect(createCommentSchema.safeParse({ entryId: "le_1", body: " " }).success).toBe(
      false
    );
    expect(
      createCommentSchema.safeParse({ entryId: "le_1", body: "a".repeat(5001) }).success
    ).toBe(false);
  });
});

describe("permission rules", () => {
  const row = {
    authorId: "usr_a",
    source: "MANUAL" as const,
    type: "CALL" as const,
    deletedAt: null,
  };

  it("lets only the author edit a manual entry", () => {
    expect(canEditEntry(row, "usr_a")).toBe(true);
    expect(canEditEntry(row, "usr_b")).toBe(false);
  });

  it("never allows editing SYSTEM, deleted or author-less entries", () => {
    expect(canEditEntry({ ...row, source: "SYSTEM" }, "usr_a")).toBe(false);
    expect(canEditEntry({ ...row, type: "SYSTEM" }, "usr_a")).toBe(false);
    expect(canEditEntry({ ...row, deletedAt: new Date() }, "usr_a")).toBe(false);
    expect(canEditEntry({ ...row, authorId: null }, "usr_a")).toBe(false);
  });

  it("lets only the author edit a comment", () => {
    expect(canEditComment({ authorId: "usr_a", deletedAt: null }, "usr_a")).toBe(true);
    expect(canEditComment({ authorId: "usr_a", deletedAt: null }, "usr_b")).toBe(false);
    expect(canEditComment({ authorId: null, deletedAt: null }, "usr_a")).toBe(false);
  });

  it(`caps pinned entries at ${LOG_MAX_PINNED}`, () => {
    expect(canPinAnother(0)).toBe(true);
    expect(canPinAnother(LOG_MAX_PINNED - 1)).toBe(true);
    expect(canPinAnother(LOG_MAX_PINNED)).toBe(false);
  });
});

const d = (iso: string) => new Date(iso);

function source(overrides: Partial<DerivedSource> = {}): DerivedSource {
  return {
    startup: {
      id: "su_1",
      createdAt: d("2026-01-01T09:00:00Z"),
      screenedAt: null,
      screenSummary: null,
      screenRecommendation: null,
      screenedBy: null,
    },
    evaluations: [],
    partnerReviews: [],
    pushes: [],
    reminders: [],
    engagements: [],
    bookings: [],
    introRequests: [],
    applications: [],
    matches: [],
    partnerVotes: [],
    updates: [],
    batchStartups: [],
    ...overrides,
  };
}

describe("derived system events", () => {
  it("always includes the creation event", () => {
    const events = deriveSystemEvents(source());
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ kind: "system", label: "Startup angelegt" });
  });

  it("derives screening, evaluation create/update and links to the source", () => {
    const events = deriveSystemEvents(
      source({
        startup: {
          ...source().startup,
          screenedAt: d("2026-02-01T09:00:00Z"),
          screenSummary: "Spannend",
          screenRecommendation: "YES",
          screenedBy: { id: "usr_a", name: "Anna" },
        },
        evaluations: [
          {
            id: "ev_1",
            createdAt: d("2026-03-01T09:00:00Z"),
            updatedAt: d("2026-03-05T09:00:00Z"),
            overallScore: 3.456,
            evaluator: { id: "usr_b", name: "Ben" },
          },
          {
            id: "ev_2",
            createdAt: d("2026-03-02T09:00:00Z"),
            updatedAt: d("2026-03-02T09:00:30Z"),
            overallScore: 0,
            evaluator: { id: "usr_b", name: "Ben" },
          },
        ],
      })
    );
    const keys = events.map((e) => e.key);
    expect(keys).toContain("screening:su_1");
    expect(keys).toContain("evaluation-created:ev_1");
    expect(keys).toContain("evaluation-updated:ev_1");
    // An edit within the grace window does not count as a separate update.
    expect(keys).not.toContain("evaluation-updated:ev_2");
    const updated = events.find((e) => e.key === "evaluation-updated:ev_1");
    expect(updated).toMatchObject({ href: "/evaluations/ev_1", detail: "Score 3.5" });
    expect(events.find((e) => e.key === "screening:su_1")?.detail).toBe(
      "Ja mit Nachfassen: Spannend"
    );
  });

  it("skips untouched match cells and never exposes booking messages", () => {
    const events = deriveSystemEvents(
      source({
        matches: [
          {
            id: "m_1",
            updatedAt: d("2026-04-01T09:00:00Z"),
            contactStatus: "NONE",
            updatedById: null,
            partner: { name: "Lupp" },
            batch: { name: "Batch 1" },
          },
        ],
        bookings: [
          {
            id: "b_1",
            createdAt: d("2026-04-02T09:00:00Z"),
            status: "REQUESTED",
            program: null,
            mentor: { name: "Polina" },
            offering: null,
          },
        ],
      })
    );
    expect(events.some((e) => e.key === "match:m_1")).toBe(false);
    expect(events.find((e) => e.key === "booking:b_1")).toMatchObject({
      label: "Venture-Store-Anfrage: Polina",
      detail: "Status: Angefragt",
    });
  });

  it("merges entries and events newest first with a deterministic tie-break", () => {
    const events = deriveSystemEvents(
      source({
        updates: [
          { id: "u_1", createdAt: d("2026-10-01T10:00:00Z"), title: "Seed", authorId: "x" },
        ],
      })
    );
    const merged = mergeTimeline(
      [
        entry({ id: "le_old", occurredAt: d("2026-05-01T10:00:00Z") }),
        entry({ id: "le_new", occurredAt: d("2026-10-02T10:00:00Z") }),
        entry({ id: "le_tie", occurredAt: d("2026-10-01T10:00:00Z") }),
      ],
      events
    );
    expect(merged.map((i) => (i.kind === "entry" ? i.id : i.key))).toEqual([
      "le_new",
      "le_tie",
      "update:u_1",
      "le_old",
      "startup-created:su_1",
    ]);
  });
});

describe("context labels and dashboard helpers", () => {
  it("builds refType labels for timeline entries", () => {
    expect(
      describeLogContext("PartnerStartupMatch", "m1", {
        contextLabel: "Lupp",
        batchId: "b1",
      })
    ).toEqual({
      label: "aus Match-Matrix: Lupp",
      href: "/match-matrix?batch=b1",
    });
    expect(
      describeLogContext("MarketplaceBooking", "bk1", {
        contextLabel: "Mentoring",
      })
    ).toMatchObject({ label: "aus Venture Store: Mentoring" });
    expect(describeLogContext(null, null, {})).toBeNull();
  });

  it("sorts follow-ups mine first, then by due date", () => {
    const sorted = sortDashboardFollowUps([
      {
        id: "b",
        startupId: "s",
        startupName: "B",
        nextStep: "x",
        followUpAt: d("2026-12-01"),
        assignee: null,
        mine: false,
        overdue: false,
      },
      {
        id: "a",
        startupId: "s",
        startupName: "A",
        nextStep: "y",
        followUpAt: d("2026-11-01"),
        assignee: null,
        mine: true,
        overdue: false,
      },
    ]);
    expect(sorted.map((x) => x.id)).toEqual(["a", "b"]);
  });

  it("lists stale active startups without recent manual contact", () => {
    const now = d("2026-10-05T12:00:00Z");
    const last = new Map<string, Date>([
      ["fresh", d("2026-10-01T12:00:00Z")],
      ["old", d("2026-08-01T12:00:00Z")],
    ]);
    const stale = pickStaleStartups(
      [
        { id: "fresh", name: "Fresh", pipelineStage: "PILOT" },
        { id: "old", name: "Old", pipelineStage: "SCREENING" },
        { id: "never", name: "Never", pipelineStage: "IN_EVALUATION" },
      ],
      last,
      now,
      30
    );
    expect(stale.map((s) => s.id)).toEqual(["never", "old"]);
  });
});

describe("filters and follow-ups", () => {
  const events = deriveSystemEvents(source());
  const items = mergeTimeline(
    [
      entry({ id: "call", type: "CALL" }),
      entry({ id: "note", type: "NOTE", author: { id: "usr_b", name: "Ben" } }),
    ],
    events
  );
  const ids = (list: typeof items) =>
    list.map((i) => (i.kind === "entry" ? i.id : "system"));

  it("parses URL params defensively", () => {
    expect(parseLogFilters({ type: ["CALL", "NOPE"], source: "manual", author: "u" })).toEqual(
      { types: ["CALL"], source: "manual", authorId: "u" }
    );
    expect(parseLogFilters({ source: "weird" })).toEqual({
      types: [],
      source: "all",
      authorId: null,
    });
  });

  it("filters by source, type and author", () => {
    const f = (o: Partial<ReturnType<typeof parseLogFilters>>) =>
      ids(filterTimeline(items, { types: [], source: "all", authorId: null, ...o }));
    expect(f({ source: "manual" })).toEqual(["call", "note"]);
    expect(f({ source: "system" })).toEqual(["system"]);
    expect(f({ types: ["CALL", "SYSTEM"] })).toEqual(["call", "system"]);
    expect(f({ authorId: "usr_b" })).toEqual(["note"]);
  });

  it("lists open follow-ups soonest first, undated last, done excluded", () => {
    const list = openFollowUps([
      entry({ id: "undated", nextStep: "a" }),
      entry({ id: "late", nextStep: "b", followUpAt: d("2026-12-01T00:00:00Z") }),
      entry({ id: "soon", nextStep: "c", followUpAt: d("2026-10-03T00:00:00Z") }),
      entry({ id: "done", nextStep: "d", followUpDoneAt: d("2026-10-01T00:00:00Z") }),
      entry({ id: "none" }),
    ]);
    expect(list.map((e) => e.id)).toEqual(["soon", "late", "undated"]);
  });
});
