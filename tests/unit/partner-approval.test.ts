import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));
vi.mock("@/auth", () => ({ signIn: vi.fn(), signOut: vi.fn() }));
// next-auth pulls in `next/server` at import time, which doesn't resolve under
// the Vitest node runtime — stub the only symbol auth.ts references.
vi.mock("next-auth", () => ({ AuthError: class AuthError extends Error {} }));
vi.mock("@/lib/auth-guards", () => ({
  requireAuth: vi.fn(),
  requireRole: vi.fn(),
  requirePartner: vi.fn(),
  requireTeam: vi.fn(),
  isPartnerApproved: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    startup: { findUnique: vi.fn() },
    challenge: { create: vi.fn(), findFirst: vi.fn() },
    partnerStartupReview: { upsert: vi.fn() },
  },
}));

import { signupPartner, signupStartup } from "@/app/actions/auth";
import { createChallenge } from "@/app/actions/challenges";
import { submitPartnerVerdict } from "@/app/actions/screening";
import { approvePartner, createUser } from "@/app/actions/users";
import {
  isPartnerApproved,
  requirePartner,
  requireRole,
} from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

const mockRequireRole = vi.mocked(requireRole);
const mockRequirePartner = vi.mocked(requirePartner);
const mockIsApproved = vi.mocked(isPartnerApproved);
const mockUser = vi.mocked(prisma.user);
const mockChallenge = vi.mocked(prisma.challenge);
const mockReview = vi.mocked(prisma.partnerStartupReview);

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("signup — partner approval gate at account creation", () => {
  it("creates a self-registered partner as PENDING (approvedAt null)", async () => {
    mockUser.findUnique.mockResolvedValue(null as never);
    mockUser.create.mockResolvedValue({ id: "p1" } as never);

    await signupPartner(
      undefined,
      form({ name: "Partner Co", email: "P@Example.com", password: "supersecret" })
    );

    expect(mockUser.create).toHaveBeenCalledTimes(1);
    const data = mockUser.create.mock.calls[0][0].data;
    expect(data.role).toBe("BUSINESS_PARTNER");
    expect(data.approvedAt).toBeNull();
    expect(data.email).toBe("p@example.com");
  });

  it("approves a self-registered startup immediately (approvedAt set)", async () => {
    mockUser.findUnique.mockResolvedValue(null as never);
    mockUser.create.mockResolvedValue({ id: "s1" } as never);

    await signupStartup(
      undefined,
      form({ name: "Startup Co", email: "s@example.com", password: "supersecret" })
    );

    const data = mockUser.create.mock.calls[0][0].data;
    expect(data.role).toBe("STARTUP");
    expect(data.approvedAt).toBeInstanceOf(Date);
  });
});

describe("admin-created users are approved immediately", () => {
  it("sets approvedAt on an admin-created partner", async () => {
    mockRequireRole.mockResolvedValue({
      user: { id: "admin", role: "ADMIN" },
    } as never);
    mockUser.findUnique.mockResolvedValue(null as never);
    mockUser.create.mockResolvedValue({ id: "np" } as never);

    const res = await createUser(
      undefined,
      form({
        name: "Made By Admin",
        email: "np@example.com",
        password: "supersecret",
        role: "BUSINESS_PARTNER",
      })
    );

    expect(res.success).toBeTruthy();
    const data = mockUser.create.mock.calls[0][0].data;
    expect(data.approvedAt).toBeInstanceOf(Date);
  });
});

describe("write actions refuse unapproved partners", () => {
  it("createChallenge refuses a pending partner and creates nothing", async () => {
    mockRequireRole.mockResolvedValue({
      user: { id: "p1", role: "BUSINESS_PARTNER" },
    } as never);
    mockIsApproved.mockResolvedValue(false);

    const res = await createChallenge(
      undefined,
      form({
        title: "A valid title",
        description: "A description long enough to pass validation.",
        status: "DRAFT",
      })
    );

    expect(res.error).toContain("noch nicht freigegeben");
    expect(mockChallenge.create).not.toHaveBeenCalled();
  });

  it("submitPartnerVerdict refuses a pending partner and writes nothing", async () => {
    mockRequirePartner.mockResolvedValue({
      user: { id: "p1", role: "BUSINESS_PARTNER" },
    } as never);
    mockIsApproved.mockResolvedValue(false);

    const res = await submitPartnerVerdict(
      { startupId: "s1", challengeId: null },
      undefined,
      form({ verdict: "CONTINUE" })
    );

    expect(res.error).toContain("noch nicht freigegeben");
    expect(mockReview.upsert).not.toHaveBeenCalled();
  });
});

describe("approvePartner — ADMIN-only, sets approvedAt", () => {
  it("sets approvedAt for an existing user", async () => {
    mockRequireRole.mockResolvedValue({
      user: { id: "admin", role: "ADMIN" },
    } as never);
    mockUser.update.mockResolvedValue({ id: "p1" } as never);

    const res = await approvePartner("p1");

    expect(res.success).toBeTruthy();
    expect(mockRequireRole).toHaveBeenCalledWith(["ADMIN"]);
    const arg = mockUser.update.mock.calls[0][0];
    expect(arg.where).toEqual({ id: "p1" });
    expect(arg.data.approvedAt).toBeInstanceOf(Date);
  });

  it("maps a missing user (P2025) to a friendly error", async () => {
    mockRequireRole.mockResolvedValue({
      user: { id: "admin", role: "ADMIN" },
    } as never);
    mockUser.update.mockRejectedValue({ code: "P2025" } as never);

    const res = await approvePartner("gone");

    expect(res.error).toBe("Nutzer nicht gefunden.");
  });
});
