import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Who may flip `Startup.isPublished` — i.e. who may put a storefront live on
// Entdecke.
//
// Two paths write the flag, and they must stay disjoint:
//   * the admin form (`updateStartup`/`createStartup`), gated by
//     `requireScoutModule` → ADMIN + MEMBER only;
//   * startup self-service (`updatePublicProfile`), gated by
//     `requireRole(["STARTUP"])` and scoped to `ownerUserId`, so a startup can
//     only ever publish itself.
//
// The real guards run here (only `@/auth` and Prisma are mocked), so the test
// authorizes against the same DB-role lookup production uses.
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
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    startup: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { auth } from "@/auth";
import { updatePublicProfile } from "@/app/actions/discovery";
import { updateStartup } from "@/app/actions/startups";
import type { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

const mockAuth = vi.mocked(auth);
const mockUserFindUnique = vi.mocked(prisma.user.findUnique);
const mockStartupFindUnique = vi.mocked(prisma.startup.findUnique);
const mockStartupUpdate = vi.mocked(prisma.startup.update);

const OWN_STARTUP = "su_owned";
const OTHER_STARTUP = "su_someone_else";

/** Signs in a user whose DB row carries `role` (what the guards authorize on). */
function signIn(role: UserRole, id = "usr_1"): void {
  mockAuth.mockResolvedValue({ user: { id, role } } as never);
  mockUserFindUnique.mockResolvedValue({ id, isActive: true, role } as never);
}

/** A complete, valid admin startup form with the publish box ticked. */
function adminForm(isPublished: boolean): FormData {
  const form = new FormData();
  form.set("name", "EPINOIA");
  form.set("description", "Wissensmanagement für Industriebetriebe.");
  form.set("industry", "Knowledge Management");
  form.set("stage", "SEED");
  form.set("pipelineStage", "DISCOVERED");
  if (isPublished) form.set("isPublished", "on");
  return form;
}

/** Runs an action and returns the redirect it threw, or null if it returned. */
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
  mockStartupUpdate.mockResolvedValue({ id: OWN_STARTUP } as never);
});

describe("admin publish toggle — team roles", () => {
  for (const role of ["ADMIN", "MEMBER"] as const) {
    it(`lets a ${role} publish a startup and stamps publishedAt`, async () => {
      signIn(role);
      mockStartupFindUnique.mockResolvedValue({ publishedAt: null } as never);

      const state = await updateStartup(
        OTHER_STARTUP,
        undefined,
        adminForm(true)
      );

      expect(state.error).toBeUndefined();
      const data = mockStartupUpdate.mock.calls[0]![0].data as {
        isPublished: boolean;
        publishedAt?: Date;
      };
      expect(data.isPublished).toBe(true);
      expect(data.publishedAt).toBeInstanceOf(Date);
    });
  }

  it("keeps the original publishedAt when re-saving an already published startup", async () => {
    signIn("ADMIN");
    const firstPublish = new Date("2026-09-08T20:09:41.087Z");
    mockStartupFindUnique.mockResolvedValue({
      publishedAt: firstPublish,
    } as never);

    await updateStartup(OTHER_STARTUP, undefined, adminForm(true));

    // `undefined` = leave the stored timestamp alone.
    const data = mockStartupUpdate.mock.calls[0]![0].data as {
      publishedAt?: Date;
    };
    expect(data.publishedAt).toBeUndefined();
  });

  it("preserves publishedAt when unpublishing, so a re-publish keeps its order", async () => {
    signIn("ADMIN");
    const firstPublish = new Date("2026-09-08T20:09:41.087Z");
    mockStartupFindUnique.mockResolvedValue({
      publishedAt: firstPublish,
    } as never);

    await updateStartup(OTHER_STARTUP, undefined, adminForm(false));

    const data = mockStartupUpdate.mock.calls[0]![0].data as {
      isPublished: boolean;
      publishedAt?: Date;
    };
    expect(data.isPublished).toBe(false);
    expect(data.publishedAt).toBeUndefined();
  });
});

describe("admin publish toggle — non-team roles are rejected", () => {
  const HOMES: Record<string, string> = {
    STARTUP: "/dashboard/startup",
    BUSINESS_PARTNER: "/dashboard/partner",
    INVESTOR: "/dashboard/investor",
  };

  for (const role of ["STARTUP", "BUSINESS_PARTNER", "INVESTOR"] as const) {
    it(`denies a ${role} the admin publish path`, async () => {
      signIn(role);

      const url = await redirectUrlOf(() =>
        updateStartup(OTHER_STARTUP, undefined, adminForm(true))
      );

      expect(url).toBe(HOMES[role]);
      expect(mockStartupUpdate).not.toHaveBeenCalled();
    });
  }

  it("denies a startup publishing a startup it does not own", async () => {
    signIn("STARTUP", "usr_founder");

    await redirectUrlOf(() =>
      updateStartup(OTHER_STARTUP, undefined, adminForm(true))
    );

    // Not even a read of the foreign row happens — the guard bites first.
    expect(mockStartupFindUnique).not.toHaveBeenCalled();
    expect(mockStartupUpdate).not.toHaveBeenCalled();
  });
});

describe("startup self-service publish stays scoped to the own profile", () => {
  it("resolves the startup by ownerUserId and ignores a smuggled startupId", async () => {
    signIn("STARTUP", "usr_founder");
    mockStartupFindUnique.mockResolvedValue({
      id: OWN_STARTUP,
      publishedAt: null,
    } as never);

    const form = new FormData();
    form.set("isPublished", "on");
    form.set("startupId", OTHER_STARTUP); // attacker-supplied, must be ignored
    const state = await updatePublicProfile(undefined, form);

    expect(state.error).toBeUndefined();
    expect(mockStartupFindUnique.mock.calls[0]![0].where).toEqual({
      ownerUserId: "usr_founder",
    });
    expect(mockStartupUpdate.mock.calls[0]![0].where).toEqual({
      id: OWN_STARTUP,
    });
  });

  it("denies a non-startup role the self-service publish path", async () => {
    signIn("INVESTOR");

    const url = await redirectUrlOf(() =>
      updatePublicProfile(undefined, new FormData())
    );

    expect(url).toBe("/dashboard/investor");
    expect(mockStartupUpdate).not.toHaveBeenCalled();
  });
});
