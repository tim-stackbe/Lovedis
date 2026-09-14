import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Who may ACCEPT / REJECT an incoming challenge application.
//
// The product rule is emphatic: ONLY an ADMIN decides. Not the internal
// MEMBER (who may still READ the pitches), and above all not the owning
// BUSINESS_PARTNER — nor any INVESTOR or STARTUP. The single mutation path is
// `decideApplication`, guarded by `requireRole(["ADMIN"])`, so the guard must
// bite BEFORE any DB write for every non-admin role.
//
// The REAL guards run here (only `@/auth`, Prisma, `next/navigation` and
// `next/cache` are mocked), so each case authorizes against the same DB-role
// lookup production uses. The two surfaces that render the controls
// (/challenge-applications overview + /challenges/[id] detail) are exercised
// too, to prove the accept/reject affordance is shown to ADMIN alone.
// ---------------------------------------------------------------------------

class RedirectSignal extends Error {
  constructor(public url: string) {
    super(`REDIRECT:${url}`);
  }
}

class NotFoundSignal extends Error {}

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new RedirectSignal(url);
  }),
  notFound: vi.fn(() => {
    throw new NotFoundSignal();
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn(), findMany: vi.fn() },
    challengeApplication: {
      groupBy: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    challenge: { findUnique: vi.fn() },
    startup: { findUnique: vi.fn() },
    poCPerformance: { create: vi.fn() },
  },
}));

// The detail page pulls in "use client" components; stub them so the server
// component under test can be awaited in plain Node without their runtime.
vi.mock("@/components/challenges/ApplyForm", () => ({ ApplyForm: () => null }));
vi.mock("@/components/challenges/ChallengeDescription", () => ({
  ChallengeDescription: () => null,
}));
vi.mock("@/components/challenges/ChallengeForm", () => ({
  ChallengeForm: () => null,
}));
vi.mock("@/components/challenges/ShareChallengeButton", () => ({
  ShareChallengeButton: () => null,
}));

import { auth } from "@/auth";
import { decideApplication } from "@/app/actions/challenges";
import ChallengeApplicationsPage from "@/app/(main)/challenge-applications/page";
import ChallengeDetailPage from "@/app/(main)/challenges/[id]/page";
import type { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

const mockAuth = vi.mocked(auth);
const mockUserFindUnique = vi.mocked(prisma.user.findUnique);
const mockUserFindMany = vi.mocked(prisma.user.findMany);
const mockGroupBy = vi.mocked(prisma.challengeApplication.groupBy);
const mockCount = vi.mocked(prisma.challengeApplication.count);
const mockAppFindMany = vi.mocked(prisma.challengeApplication.findMany);
const mockAppFindUnique = vi.mocked(prisma.challengeApplication.findUnique);
const mockAppUpdate = vi.mocked(prisma.challengeApplication.update);
const mockChallengeFindUnique = vi.mocked(prisma.challenge.findUnique);
const mockPoCCreate = vi.mocked(prisma.poCPerformance.create);

/** Signs in a user whose DB row carries `role` (what the guards authorize on). */
function signIn(role: UserRole, id = "usr_1"): void {
  mockAuth.mockResolvedValue({ user: { id, role } } as never);
  mockUserFindUnique.mockResolvedValue({ id, isActive: true, role } as never);
}

const ROLE_HOMES: Record<string, string> = {
  MEMBER: "/dashboard/member",
  BUSINESS_PARTNER: "/dashboard/partner",
  INVESTOR: "/dashboard/investor",
  STARTUP: "/dashboard/startup",
};

/** Runs an action/page and returns the redirect it threw, or null. */
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
  mockAppFindUnique.mockResolvedValue({
    id: "app_1",
    poc: null,
    challenge: { id: "ch_1", title: "Wartung ohne Stillstand", createdById: "partner_1" },
    startup: { name: "EPINOIA" },
  } as never);
  mockAppUpdate.mockResolvedValue({ id: "app_1" } as never);
  mockPoCCreate.mockResolvedValue({ id: "poc_1" } as never);
});

// ---------------------------------------------------------------------------
// The mutation guard — the security boundary.
// ---------------------------------------------------------------------------

describe("decideApplication — ADMIN may decide", () => {
  it("accepts an application, writes ACCEPTED and does NOT spawn a PoC", async () => {
    signIn("ADMIN");

    const state = await decideApplication("app_1", "ACCEPTED");

    expect(state.error).toBeUndefined();
    expect(mockAppUpdate).toHaveBeenCalledOnce();
    expect(mockAppUpdate.mock.calls[0]![0]).toEqual({
      where: { id: "app_1" },
      data: { status: "ACCEPTED" },
    });
    // Accepting only moves the status. The PoC is created later as a separate,
    // deliberate step — accepting must never put one down as a side effect.
    expect(mockPoCCreate).not.toHaveBeenCalled();
  });

  it("rejects an application, writes REJECTED and opens no PoC", async () => {
    signIn("ADMIN");

    const state = await decideApplication("app_1", "REJECTED");

    expect(state.error).toBeUndefined();
    expect(mockAppUpdate.mock.calls[0]![0]).toEqual({
      where: { id: "app_1" },
      data: { status: "REJECTED" },
    });
    expect(mockPoCCreate).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// The side effect that must NOT happen — accepting must never create a PoC.
//
// A PoC is only ever created later, as a separate deliberate step, once the
// partner and startup have informed the team. `decideApplication` must not
// call the PoC-create for ANY role or ANY decision.
// ---------------------------------------------------------------------------

describe("decideApplication — never creates a PoC", () => {
  for (const role of [
    "ADMIN",
    "MEMBER",
    "BUSINESS_PARTNER",
    "INVESTOR",
    "STARTUP",
  ] as const) {
    for (const decision of ["ACCEPTED", "REJECTED"] as const) {
      it(`does not create a PoC for a ${role} ${decision.toLowerCase()}`, async () => {
        signIn(role);

        // Non-admins redirect home before any write; admins run the mutation.
        // Either way, the PoC-create must never fire.
        await redirectUrlOf(() => decideApplication("app_1", decision));

        expect(mockPoCCreate).not.toHaveBeenCalled();
      });
    }
  }
});

describe("decideApplication — every non-admin role is blocked before any write", () => {
  for (const role of [
    "MEMBER",
    "BUSINESS_PARTNER",
    "INVESTOR",
    "STARTUP",
  ] as const) {
    it(`redirects a ${role} home and never touches the application`, async () => {
      signIn(role);

      const url = await redirectUrlOf(() =>
        decideApplication("app_1", "ACCEPTED")
      );

      expect(url).toBe(ROLE_HOMES[role]);
      // Guard bites first: no read, no status write, no PoC.
      expect(mockAppFindUnique).not.toHaveBeenCalled();
      expect(mockAppUpdate).not.toHaveBeenCalled();
      expect(mockPoCCreate).not.toHaveBeenCalled();
    });

    it(`also blocks a ${role} from rejecting`, async () => {
      signIn(role);

      const url = await redirectUrlOf(() =>
        decideApplication("app_1", "REJECTED")
      );

      expect(url).toBe(ROLE_HOMES[role]);
      expect(mockAppUpdate).not.toHaveBeenCalled();
    });
  }

  it("sends a request without a session to /login", async () => {
    mockAuth.mockResolvedValue(null as never);

    const url = await redirectUrlOf(() =>
      decideApplication("app_1", "ACCEPTED")
    );

    expect(url).toBe("/login");
    expect(mockAppUpdate).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// UI affordance — the accept/reject controls follow the same ADMIN-only rule.
// ---------------------------------------------------------------------------

/** Collects the text a user sees, prop-carried strings included. */
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

/** Every `applicationId` prop in the tree — one per rendered decision control. */
function decisionTargetsOf(node: unknown, out: string[] = []): string[] {
  if (node == null || typeof node !== "object") return out;
  if (Array.isArray(node)) {
    for (const child of node) decisionTargetsOf(child, out);
    return out;
  }
  const props = (node as { props?: Record<string, unknown> }).props;
  if (!props) return out;
  if (typeof props.applicationId === "string") out.push(props.applicationId);
  for (const value of Object.values(props)) decisionTargetsOf(value, out);
  return out;
}

const OVERVIEW_ROWS = [
  {
    id: "app_pending",
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
    id: "app_accepted",
    pitch: "Digitaler Zwilling für die Endmontage.",
    status: "ACCEPTED",
    createdAt: new Date("2026-08-30T09:00:00Z"),
    startup: { id: "su_twinly", name: "Twinly", industry: "Simulation" },
    challenge: {
      id: "ch_montage",
      title: "Montage-Takt erhöhen",
      createdBy: { name: "Jonas Ritter", company: null },
    },
    poc: null,
  },
];

describe("/challenge-applications — decision controls are ADMIN-only", () => {
  beforeEach(() => {
    mockGroupBy.mockResolvedValue([
      { status: "PENDING", _count: 1 },
      { status: "ACCEPTED", _count: 1 },
    ] as never);
    mockCount.mockResolvedValue(OVERVIEW_ROWS.length as never);
    mockAppFindMany.mockResolvedValue(OVERVIEW_ROWS as never);
  });

  async function renderOverview(): Promise<unknown> {
    return ChallengeApplicationsPage({ searchParams: Promise.resolve({}) });
  }

  it("renders a control for each PENDING application when an ADMIN opens it", async () => {
    signIn("ADMIN");

    const targets = decisionTargetsOf(await renderOverview());

    // Exactly the pending row gets accept/reject; the decided one does not.
    expect(targets).toContain("app_pending");
    expect(targets).not.toContain("app_accepted");
  });

  it("renders NO decision control for a MEMBER (view-only)", async () => {
    signIn("MEMBER");

    const tree = await renderOverview();

    // MEMBER still sees the list…
    expect(textOf(tree).join("")).toContain("EPINOIA");
    // …but no accept/reject affordance anywhere.
    expect(decisionTargetsOf(tree)).toHaveLength(0);
  });
});

describe("/challenges/[id] — the pitch review section decides ADMIN-only", () => {
  beforeEach(() => {
    mockChallengeFindUnique.mockResolvedValue({
      id: "ch_1",
      title: "Wartung ohne Stillstand",
      description: "Ungeplante Stillstände runter.",
      status: "OPEN",
      deadline: null,
      tags: [],
      createdBy: {
        id: "partner_1",
        name: "Mara Klein",
        company: "Nordwerk AG",
        role: "BUSINESS_PARTNER",
      },
    } as never);
    mockAppFindMany.mockResolvedValue([
      {
        id: "app_1",
        pitch: "Predictive Maintenance auf Basis von Vibrationsdaten.",
        status: "PENDING",
        createdAt: new Date("2026-09-12T09:00:00Z"),
        startup: { id: "su_epinoia", name: "EPINOIA", industry: "Knowledge" },
        poc: null,
      },
    ] as never);
    mockUserFindMany.mockResolvedValue([] as never);
  });

  async function renderDetail(): Promise<unknown> {
    return ChallengeDetailPage({ params: Promise.resolve({ id: "ch_1" }) });
  }

  it("shows Annehmen/Ablehnen to an ADMIN", async () => {
    signIn("ADMIN");

    const text = textOf(await renderDetail()).join("");

    expect(text).toContain("EPINOIA");
    expect(text).toContain("Annehmen");
    expect(text).toContain("Ablehnen");
  });

  it("shows the pitch to a MEMBER but no accept/reject buttons", async () => {
    signIn("MEMBER");

    const text = textOf(await renderDetail()).join("");

    // MEMBER may READ the confidential pitch…
    expect(text).toContain("Predictive Maintenance");
    // …but the decision buttons are gone.
    expect(text).not.toContain("Annehmen");
    expect(text).not.toContain("Ablehnen");
  });
});
