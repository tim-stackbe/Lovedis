import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// A STARTUP account can exist without a `Startup` row: the row is created by
// the profile form, and admin/hand-provisioned accounts start without one.
// Every startup-facing surface keys its read on `ownerUserId`, so all of them
// see `null` for such a user and MUST render an empty state instead of
// dereferencing the missing row — a throw here surfaces to the user as a failed
// page load right after login, with no obvious cause in the logs.
//
// These render the real page components with `findUnique` returning null. Server
// components are plain async functions returning an element tree, so awaiting
// one exercises exactly the data handling in the page body (child components are
// only described, not invoked).
// ---------------------------------------------------------------------------

const findUnique = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    startup: { findUnique },
    challenge: { findMany: vi.fn().mockResolvedValue([]) },
  },
}));

const session = { user: { id: "usr_startup_no_profile", role: "STARTUP" } };

vi.mock("@/lib/auth-guards", () => ({
  requireRole: vi.fn().mockResolvedValue(session),
  requireVentureView: vi.fn().mockResolvedValue(session),
  requireStartup: vi.fn().mockResolvedValue(session),
  requireAuth: vi.fn().mockResolvedValue(session),
  requireApprovedAccess: vi.fn().mockResolvedValue(session),
}));

vi.mock("@/lib/ssot", () => ({
  audiencesForRole: () => ["STARTUP", "BOTH"],
  getHubContent: vi
    .fn()
    .mockResolvedValue({ pages: [], media: [], knowledge: [] }),
}));

/** Every string rendered anywhere in the returned element tree. */
function textOf(node: unknown, out: string[] = []): string[] {
  if (node == null || typeof node === "boolean") return out;
  if (typeof node === "string") {
    out.push(node);
    return out;
  }
  if (typeof node === "number") {
    out.push(String(node));
    return out;
  }
  if (Array.isArray(node)) {
    for (const child of node) textOf(child, out);
    return out;
  }
  if (typeof node === "object") {
    const props = (node as { props?: Record<string, unknown> }).props;
    if (props) for (const value of Object.values(props)) textOf(value, out);
  }
  return out;
}

async function renderWithoutStartup(
  importPage: () => Promise<{ default: () => Promise<unknown> }>
): Promise<string> {
  findUnique.mockResolvedValue(null);
  const tree = await (await importPage()).default();
  return textOf(tree).join(" ");
}

beforeEach(() => {
  findUnique.mockReset();
});

describe("startup surfaces render an empty state when the user has no Startup row", () => {
  it("/dashboard/startup offers profile setup instead of throwing", async () => {
    const text = await renderWithoutStartup(
      () => import("@/app/(main)/dashboard/startup/page")
    );
    expect(text).toContain("Lass uns dein Profil aufsetzen");
    expect(text).toContain("Profil anlegen");
    // Profile completeness must be a real 0%, not NaN% from a missing row.
    expect(text).toContain("0%");
    expect(text).not.toContain("NaN");
  });

  it("/dashboard/startup shows a zeroed credit budget, not a crash", async () => {
    const text = await renderWithoutStartup(
      () => import("@/app/(main)/dashboard/startup/page")
    );
    expect(text).toContain("0 von 12");
  });

  it("/applications renders the no-applications empty state", async () => {
    const text = await renderWithoutStartup(
      () => import("@/app/(main)/applications/page")
    );
    expect(text).toContain("Noch keine Bewerbungen");
  });

  it("/profile renders without dereferencing the missing row", async () => {
    const text = await renderWithoutStartup(
      () => import("@/app/(main)/profile/page")
    );
    expect(text).toContain("Dein Startup-Profil");
  });

  it("/venture renders with a zeroed budget", async () => {
    const text = await renderWithoutStartup(
      () => import("@/app/(main)/venture/page")
    );
    expect(text).toContain("Deine Accelerator Übersicht");
    expect(text).not.toContain("NaN");
  });

  it("/venture/credits renders an empty history", async () => {
    const text = await renderWithoutStartup(
      () => import("@/app/(main)/venture/credits/page")
    );
    expect(text).toContain("0 von 12");
    expect(text).not.toContain("NaN");
  });
});
