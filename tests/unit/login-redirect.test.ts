import { beforeEach, describe, expect, it, vi } from "vitest";

// The login action re-throws NextAuth/redirect signals; here signIn is mocked
// so it resolves without throwing and we can inspect the redirectTo it received.
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));
vi.mock("next-auth", () => ({ AuthError: class AuthError extends Error {} }));
vi.mock("@/auth", () => ({ auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: vi.fn() } },
}));

import { login } from "@/app/actions/auth";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";

const mockSignIn = vi.mocked(signIn);
const mockFindUnique = vi.mocked(prisma.user.findUnique);

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

/** Runs `login` and returns the `redirectTo` handed to signIn. */
async function redirectToFor(
  user: {
    role: string;
    mustChangePassword?: boolean;
    approvedAt?: Date | null;
  } | null,
  extra: Record<string, string> = {}
): Promise<string | undefined> {
  mockFindUnique.mockResolvedValue(user as never);
  await login(
    undefined,
    form({ email: "u@example.com", password: "supersecret", ...extra })
  );
  const call = mockSignIn.mock.calls[0];
  return (call?.[1] as { redirectTo?: string } | undefined)?.redirectTo;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("login — post-sign-in redirect target (single-hop, no chained redirect)", () => {
  it("sends an APPROVED partner straight to the partner role home", async () => {
    expect(
      await redirectToFor({
        role: "BUSINESS_PARTNER",
        mustChangePassword: false,
        approvedAt: new Date(),
      })
    ).toBe("/dashboard/partner");
  });

  it("sends a PENDING partner (approvedAt null) straight to /pending, not the role home", async () => {
    // Regression: routing a pending partner to /dashboard/partner makes the
    // app-shell guard bounce role-home → /pending — a chained redirect that
    // aborts the first client-side navigation in Next.js 16 (the login
    // "reload error").
    expect(
      await redirectToFor({
        role: "BUSINESS_PARTNER",
        mustChangePassword: false,
        approvedAt: null,
      })
    ).toBe("/pending");
  });

  it("keeps /change-password precedence for a first-login partner even if unapproved", async () => {
    expect(
      await redirectToFor({
        role: "BUSINESS_PARTNER",
        mustChangePassword: true,
        approvedAt: null,
      })
    ).toBe("/change-password");
  });

  it("ignores a callbackUrl for a PENDING partner (would just bounce to /pending)", async () => {
    expect(
      await redirectToFor(
        {
          role: "BUSINESS_PARTNER",
          mustChangePassword: false,
          approvedAt: null,
        },
        { callbackUrl: "/dashboard/partner" }
      )
    ).toBe("/pending");
  });

  it("sends an approved non-partner to its role home", async () => {
    expect(
      await redirectToFor({
        role: "STARTUP",
        mustChangePassword: false,
        approvedAt: new Date(),
      })
    ).toBe("/dashboard/startup");
  });

  it("honors a safe callbackUrl for an approved non-partner", async () => {
    expect(
      await redirectToFor(
        { role: "MEMBER", mustChangePassword: false, approvedAt: new Date() },
        { callbackUrl: "/settings" }
      )
    ).toBe("/settings");
  });
});
