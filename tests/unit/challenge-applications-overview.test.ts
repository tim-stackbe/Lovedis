import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// /challenge-applications is the team-wide overview of every startup pitch to
// every challenge. Two things have to hold:
//
//   * ONLY the internal team (ADMIN + MEMBER) reaches it. Pitches are
//     confidential startup input, and the July-2026 review already found a
//     cross-tenant read on /challenges/[id] (Sicherheitskonzept, Abschnitt
//     18.1) — a startup, partner or investor must not see other startups'
//     pitches through this door either.
//   * the list itself reads correctly: newest first, status filter applied
//     server-side, graceful empty states.
//
// The REAL guards run here (only `@/auth`, Prisma and `next/navigation` are
// mocked), so every case authorizes against the same DB-role lookup production
// uses. Server components are plain async functions returning an element tree,
// so awaiting one exercises exactly the page body.
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
}));
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    challengeApplication: {
      groupBy: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
    },
    startup: { findUnique: vi.fn() },
  },
}));

import { auth } from "@/auth";
import ApplicationsPage from "@/app/(main)/applications/page";
import ChallengeApplicationsPage from "@/app/(main)/challenge-applications/page";
import type { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { ROLE_NAV } from "@/lib/roles";

const mockAuth = vi.mocked(auth);
const mockUserFindUnique = vi.mocked(prisma.user.findUnique);
const mockGroupBy = vi.mocked(prisma.challengeApplication.groupBy);
const mockCount = vi.mocked(prisma.challengeApplication.count);
const mockFindMany = vi.mocked(prisma.challengeApplication.findMany);

/** Signs in a user whose DB row carries `role` (what the guards authorize on). */
function signIn(role: UserRole, id = "usr_1"): void {
  mockAuth.mockResolvedValue({ user: { id, role } } as never);
  mockUserFindUnique.mockResolvedValue({ id, isActive: true, role } as never);
}

const APPLICATIONS = [
  {
    id: "app_new",
    pitch: "Predictive Maintenance auf Basis von Vibrationsdaten.",
    status: "PENDING",
    createdAt: new Date("2026-09-12T09:00:00Z"),
    startup: { id: "su_epinoia", name: "EPINOIA", industry: "Knowledge" },
    challenge: {
      id: "ch_wartung",
      title: "Wartung ohne Stillstand",
      createdBy: { name: "Mara Klein", company: "Nordwerk AG" },
    },
    poc: null,
  },
  {
    id: "app_old",
    pitch: "Digitaler Zwilling für die Endmontage.",
    status: "ACCEPTED",
    createdAt: new Date("2026-08-30T09:00:00Z"),
    startup: { id: "su_twinly", name: "Twinly", industry: "Simulation" },
    challenge: {
      id: "ch_montage",
      title: "Montage-Takt erhöhen",
      createdBy: { name: "Jonas Ritter", company: null },
    },
    poc: { id: "poc_1", status: "RUNNING" },
  },
];

/**
 * The visible copy of an element tree — prop-carried strings (`title`,
 * `label`, …) included, since the UI primitives take their text that way.
 * Fragments are concatenated without a separator, so a phrase split across JSX
 * children — `Seite {page} von {pages}` — reads back exactly as the user sees
 * it. Styling and link props are skipped so they can't be mistaken for copy.
 */
const NON_TEXT_PROPS = new Set(["className", "href", "key"]);

function textOf(node: unknown, out: string[] = []): string[] {
  if (node == null || typeof node === "boolean") return out;
  if (typeof node === "string" || typeof node === "number") {
    out.push(String(node));
    return out;
  }
  if (Array.isArray(node)) {
    for (const child of node) textOf(child, out);
    return out;
  }
  if (typeof node === "object") {
    const props = (node as { props?: Record<string, unknown> }).props;
    if (props) {
      for (const [key, value] of Object.entries(props)) {
        if (!NON_TEXT_PROPS.has(key)) textOf(value, out);
      }
    }
  }
  return out;
}

/** Every `href` anywhere in the tree, in render order. */
function hrefsOf(node: unknown, out: string[] = []): string[] {
  if (node == null || typeof node !== "object") return out;
  if (Array.isArray(node)) {
    for (const child of node) hrefsOf(child, out);
    return out;
  }
  const props = (node as { props?: Record<string, unknown> }).props;
  if (!props) return out;
  if (typeof props.href === "string") out.push(props.href);
  for (const value of Object.values(props)) hrefsOf(value, out);
  return out;
}

/** Renders the page for the signed-in user. */
async function renderTree(
  searchParams: Record<string, string> = {}
): Promise<unknown> {
  return ChallengeApplicationsPage({
    searchParams: Promise.resolve(searchParams),
  });
}

async function render(
  searchParams: Record<string, string> = {}
): Promise<string> {
  return textOf(await renderTree(searchParams)).join("");
}

async function renderLinks(
  searchParams: Record<string, string> = {}
): Promise<string[]> {
  return hrefsOf(await renderTree(searchParams));
}

/** Runs the page and returns the redirect it threw, or null if it rendered. */
async function redirectUrlOf(fn: () => Promise<unknown>): Promise<string | null> {
  try {
    await fn();
    return null;
  } catch (err) {
    if (err instanceof RedirectSignal) return err.url;
    throw err;
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGroupBy.mockResolvedValue([
    { status: "PENDING", _count: 1 },
    { status: "ACCEPTED", _count: 1 },
  ] as never);
  mockCount.mockResolvedValue(APPLICATIONS.length as never);
  mockFindMany.mockResolvedValue(APPLICATIONS as never);
});

describe("authorization — team only", () => {
  for (const role of ["ADMIN", "MEMBER"] as const) {
    it(`lets a ${role} open the overview`, async () => {
      signIn(role);
      const text = await render();
      expect(text).toContain("Challenge-Bewerbungen");
      expect(mockFindMany).toHaveBeenCalledOnce();
    });
  }

  const HOMES: Record<string, string> = {
    STARTUP: "/dashboard/startup",
    BUSINESS_PARTNER: "/dashboard/partner",
    INVESTOR: "/dashboard/investor",
  };

  for (const role of ["STARTUP", "BUSINESS_PARTNER", "INVESTOR"] as const) {
    it(`redirects a ${role} home without reading any pitch`, async () => {
      signIn(role);

      const url = await redirectUrlOf(() => render());

      expect(url).toBe(HOMES[role]);
      // The guard bites before the query, so no foreign pitch is ever fetched.
      expect(mockFindMany).not.toHaveBeenCalled();
      expect(mockGroupBy).not.toHaveBeenCalled();
    });
  }

  it("sends a request without a session to /login", async () => {
    mockAuth.mockResolvedValue(null as never);

    const url = await redirectUrlOf(() => render());

    expect(url).toBe("/login");
    expect(mockFindMany).not.toHaveBeenCalled();
  });
});

describe("the list", () => {
  beforeEach(() => signIn("ADMIN"));

  it("shows every application with its startup, challenge, pitch and date", async () => {
    const text = await render();

    expect(text).toContain("EPINOIA");
    expect(text).toContain("Wartung ohne Stillstand");
    expect(text).toContain("Predictive Maintenance");
    expect(text).toContain("Twinly");
    expect(text).toContain("Montage-Takt erhöhen");
    // Submitted date, formatted the same way as everywhere else.
    expect(text).toContain("12. Sept. 2026");
  });

  it("links the startup and the challenge instead of dead-ending", async () => {
    const links = await renderLinks();

    expect(links).toContain("/startups/su_epinoia");
    expect(links).toContain("/challenges/ch_wartung");
    expect(links).toContain("/pocs/poc_1");
  });

  it("falls back to the challenge owner's name when they have no company", async () => {
    const text = await render();

    expect(text).toContain("Nordwerk AG");
    expect(text).toContain("Jonas Ritter");
  });

  it("counts the applications in the header", async () => {
    const text = await render();

    expect(text).toContain("Alle Bewerbungen (2)");
  });

  it("orders newest first", async () => {
    await render();

    expect(mockFindMany.mock.calls[0]![0]!.orderBy).toEqual({
      createdAt: "desc",
    });
  });

  it("caps a single response instead of rendering an unbounded table", async () => {
    await render();

    const args = mockFindMany.mock.calls[0]![0]!;
    expect(args.take).toBe(50);
    expect(args.skip).toBe(0);
  });

  it("pages through the rest of the rows", async () => {
    mockCount.mockResolvedValue(120 as never);

    const tree = await renderTree({ page: "3" });

    expect(mockFindMany.mock.calls[0]![0]!.skip).toBe(100);
    expect(textOf(tree).join("")).toContain("Seite 3 von 3");
    // Last page: only a way back.
    expect(hrefsOf(tree)).toContain("/challenge-applications?page=2");
    expect(textOf(tree).join("")).not.toContain("Weiter");
  });

  it("hides the pager when everything fits on one page", async () => {
    const text = await render();

    expect(text).not.toContain("Seite 1 von 1");
  });

  it("ignores a nonsense page parameter rather than querying a negative offset", async () => {
    await render({ page: "-4" });

    expect(mockFindMany.mock.calls[0]![0]!.skip).toBe(0);
  });
});

describe("status filter", () => {
  beforeEach(() => signIn("ADMIN"));

  it("narrows the query server-side and names the filter in the header", async () => {
    mockCount.mockResolvedValue(1 as never);
    mockFindMany.mockResolvedValue([APPLICATIONS[0]] as never);

    const text = await render({ status: "PENDING" });

    expect(mockFindMany.mock.calls[0]![0]!.where).toEqual({
      status: "PENDING",
    });
    expect(mockCount.mock.calls[0]![0]!.where).toEqual({ status: "PENDING" });
    expect(text).toContain("Ausstehend (1)");
  });

  it("switches between filters without stacking them up", async () => {
    const links = await renderLinks({ status: "ACCEPTED" });

    expect(links).toContain("/challenge-applications?status=REJECTED");
    // "Alle" must clear the filter, not carry it over.
    expect(links).toContain("/challenge-applications");
  });

  it("drops the page offset when the filter changes", async () => {
    // Page 3 of "Alle" has no meaning inside a narrower selection.
    const links = await renderLinks({ status: "ACCEPTED", page: "3" });

    expect(links).toContain("/challenge-applications?status=PENDING");
    expect(links.every((href) => !href.includes("status=PENDING&page"))).toBe(
      true
    );
  });

  it("ignores an unknown status instead of returning an empty list", async () => {
    const text = await render({ status: "NOT_A_STATUS" });

    expect(mockFindMany.mock.calls[0]![0]!.where).toEqual({});
    expect(text).toContain("Alle Bewerbungen (2)");
  });

  it("shows the status totals independently of the active filter", async () => {
    mockCount.mockResolvedValue(1 as never);
    mockFindMany.mockResolvedValue([APPLICATIONS[0]] as never);

    const text = await render({ status: "PENDING" });

    // groupBy is unfiltered, so the chips keep showing the full picture.
    expect(mockGroupBy.mock.calls[0]![0]!).not.toHaveProperty("where");
    expect(text).toContain("Angenommen (1)");
  });
});

describe("empty states", () => {
  beforeEach(() => signIn("ADMIN"));

  it("invites the team to the challenges when nothing was ever submitted", async () => {
    mockGroupBy.mockResolvedValue([] as never);
    mockCount.mockResolvedValue(0 as never);
    mockFindMany.mockResolvedValue([] as never);

    const text = await render();

    expect(text).toContain("Noch keine Bewerbungen");
    expect(text).toContain("Challenges öffnen");
  });

  it("offers to reset the filter when only the current selection is empty", async () => {
    mockCount.mockResolvedValue(0 as never);
    mockFindMany.mockResolvedValue([] as never);

    const text = await render({ status: "REJECTED" });

    expect(text).toContain("Keine Bewerbungen in dieser Auswahl");
    expect(text).toContain("Filter zurücksetzen");
  });
});

describe("discoverability", () => {
  const HREF = "/challenge-applications";

  const hrefsFor = (role: "ADMIN" | "MEMBER") =>
    ROLE_NAV[role].flatMap((section) => section.items.map((i) => i.href));

  for (const role of ["ADMIN", "MEMBER"] as const) {
    it(`is in the ${role} nav, so it is reachable without knowing the URL`, () => {
      expect(hrefsFor(role)).toContain(HREF);
    });
  }

  for (const role of ["STARTUP", "BUSINESS_PARTNER", "INVESTOR"] as const) {
    it(`is absent from the ${role} nav and command palette`, () => {
      const hrefs = ROLE_NAV[role].flatMap((s) => s.items.map((i) => i.href));
      expect(hrefs).not.toContain(HREF);
    });
  }
});

describe("/applications stays the startup's own view", () => {
  const mockStartupFindUnique = vi.mocked(prisma.startup.findUnique);

  async function renderApplications(): Promise<unknown> {
    mockStartupFindUnique.mockResolvedValue(null as never);
    return ApplicationsPage();
  }

  it("points the team at the overview instead of a permanent empty list", async () => {
    // The team has no Startup row, so this page can only ever be empty for them.
    signIn("ADMIN");

    const tree = await renderApplications();

    expect(textOf(tree).join("")).toContain("Startup-Sicht ohne eigenes Startup");
    expect(hrefsOf(tree)).toContain("/challenge-applications");
  });

  it("still tells a startup without applications to go and pitch", async () => {
    signIn("STARTUP");

    const tree = await renderApplications();

    expect(textOf(tree).join("")).toContain("Noch keine Bewerbungen");
    expect(hrefsOf(tree)).not.toContain("/challenge-applications");
  });
});
