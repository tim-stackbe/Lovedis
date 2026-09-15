import { beforeEach, describe, expect, it, vi } from "vitest";

// A thrown redirect models Next's real `redirect()` (which throws to halt the
// server action). We record the destination so tests can assert on it.
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
  prisma: { user: { findUnique: vi.fn() } },
}));

import { auth } from "@/auth";
import { requireAuth, requireRole } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

const mockAuth = vi.mocked(auth);
const mockFindUnique = vi.mocked(prisma.user.findUnique);

beforeEach(() => {
  vi.clearAllMocks();
});

/** Runs a guard and returns the redirect URL it threw, or null if it returned. */
async function redirectUrlOf(fn: () => Promise<unknown>): Promise<string | null> {
  try {
    await fn();
    return null;
  } catch (err) {
    if (err instanceof RedirectSignal) return err.url;
    throw err;
  }
}

describe("requireAuth — session + DB freshness", () => {
  it("redirects to /login when there is no session", async () => {
    mockAuth.mockResolvedValue(null as never);
    expect(await redirectUrlOf(() => requireAuth())).toBe("/login");
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("clears the cookie when the session user no longer exists", async () => {
    mockAuth.mockResolvedValue({ user: { id: "gone", role: "ADMIN" } } as never);
    mockFindUnique.mockResolvedValue(null as never);
    expect(await redirectUrlOf(() => requireAuth())).toBe("/api/session-clear");
  });

  it("rejects an inactive user", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } } as never);
    mockFindUnique.mockResolvedValue({
      id: "u1",
      isActive: false,
      role: "ADMIN",
    } as never);
    expect(await redirectUrlOf(() => requireAuth())).toBe("/api/session-clear");
  });

  it("overwrites the JWT role snapshot with the fresh DB role", async () => {
    // JWT says ADMIN, but the DB row was demoted to MEMBER.
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } } as never);
    mockFindUnique.mockResolvedValue({
      id: "u1",
      isActive: true,
      role: "MEMBER",
    } as never);
    const session = await requireAuth();
    expect(session.user.role).toBe("MEMBER");
  });
});

describe("requireRole — authorizes against the fresh role", () => {
  it("redirects a demoted admin (JWT ADMIN, DB MEMBER) away from an admin-only gate", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } } as never);
    mockFindUnique.mockResolvedValue({
      id: "u1",
      isActive: true,
      role: "MEMBER",
    } as never);
    // Rejected → sent to the MEMBER role home, proving the DB role won.
    expect(await redirectUrlOf(() => requireRole(["ADMIN"]))).toBe(
      "/dashboard/member"
    );
  });

  it("lets an allowed role through without redirecting", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } } as never);
    mockFindUnique.mockResolvedValue({
      id: "u1",
      isActive: true,
      role: "ADMIN",
    } as never);
    const session = await requireRole(["ADMIN", "MEMBER"]);
    expect(session.user.role).toBe("ADMIN");
  });
});
