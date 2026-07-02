import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth-guards", () => ({
  requireRole: vi.fn(),
  requireAuth: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { update: vi.fn(), findUnique: vi.fn() } },
}));

import { updateUserRole } from "@/app/actions/users";
import { firstZodError } from "@/lib/action-state";
import { requireRole } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { isRecordNotFoundError } from "@/lib/prisma-errors";

const mockRequireRole = vi.mocked(requireRole);
const mockUser = vi.mocked(prisma.user);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("firstZodError — clean message, no path prefix", () => {
  it("returns the raw zod message without a 'field:' / 'path:' prefix", async () => {
    const schema = z.object({ email: z.email("Bitte gib eine gültige E-Mail an.") });
    const parsed = schema.safeParse({ email: "not-an-email" });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;

    const msg = firstZodError(parsed.error);
    expect(msg).toBe("Bitte gib eine gültige E-Mail an.");
    // No leading "path:" / "email:" style prefix.
    expect(msg).not.toMatch(/^[\w.[\]]+:\s/);
  });

  it("falls back to a generic message when there are no issues", () => {
    expect(firstZodError({ issues: [] })).toBe("Ungültige Eingabe.");
  });
});

describe("isRecordNotFoundError — duck-typed P2025 detection", () => {
  it("is true only for a P2025 code", () => {
    expect(isRecordNotFoundError({ code: "P2025" })).toBe(true);
    expect(isRecordNotFoundError({ code: "P2002" })).toBe(false);
    expect(isRecordNotFoundError(new Error("boom"))).toBe(false);
    expect(isRecordNotFoundError(null)).toBe(false);
    expect(isRecordNotFoundError(undefined)).toBe(false);
  });
});

describe("updateUserRole — validation + P2025 mapping", () => {
  it("rejects an invalid role with a clean error", async () => {
    mockRequireRole.mockResolvedValue({
      user: { id: "admin", role: "ADMIN" },
    } as never);

    const res = await updateUserRole("someone-else", "SUPERUSER");

    expect(res.error).toBe("Ungültige Rolle.");
    expect(mockUser.update).not.toHaveBeenCalled();
  });

  it("refuses to change your own role", async () => {
    mockRequireRole.mockResolvedValue({
      user: { id: "admin", role: "ADMIN" },
    } as never);

    const res = await updateUserRole("admin", "MEMBER");

    expect(res.error).toContain("eigene Rolle");
    expect(mockUser.update).not.toHaveBeenCalled();
  });

  it("maps a missing user (P2025) to a friendly error", async () => {
    mockRequireRole.mockResolvedValue({
      user: { id: "admin", role: "ADMIN" },
    } as never);
    mockUser.update.mockRejectedValue({ code: "P2025" } as never);

    const res = await updateUserRole("gone", "MEMBER");

    expect(res.error).toBe("Nutzer nicht gefunden.");
  });
});
