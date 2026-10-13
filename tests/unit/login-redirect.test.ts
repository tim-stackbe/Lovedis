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
  prisma: { user: { findUnique: vi.fn(), update: vi.fn() } },
}));

import { changePassword, login } from "@/app/actions/auth";
import { auth, signIn } from "@/auth";
import type { UserRole } from "@/generated/prisma/enums";
import { requireApprovedAccess } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { ALL_ROLES, APPROVAL_GATED_ROLES, ROLE_HOMES } from "@/lib/roles";

const mockAuth = vi.mocked(auth);
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

/**
 * Where the `(main)` app-shell guard would send this user, or null if it lets
 * them through. Driven by the real `requireApprovedAccess` so the tests below
 * compare login against the gate as ENFORCED, not against a restatement of it.
 */
async function guardBounceFor(user: {
  role: UserRole;
  approvedAt: Date | null;
}): Promise<string | null> {
  mockAuth.mockResolvedValue({ user: { id: "u1", role: user.role } } as never);
  // requireAuth selects {id, isActive, role}, requireApprovedAccess selects
  // {approvedAt} — one object satisfies both reads.
  mockFindUnique.mockResolvedValue({
    id: "u1",
    isActive: true,
    ...user,
  } as never);
  try {
    await requireApprovedAccess();
    return null;
  } catch (err) {
    return (err as Error).message.replace("REDIRECT:", "");
  }
}

describe("login — destination matches the approval gate for EVERY role", () => {
  // The bug class this pins down: the destination used to be picked per-role by
  // hand while `requireApprovedAccess` enforces a predicate, so any role the
  // two disagreed on got login → role home → (guard) → /pending, the two-hop
  // chain that breaks the first navigation. Asserting login's target against
  // the guard's OWN runtime behaviour means a third approval-gated role cannot
  // reintroduce the mismatch.
  for (const role of ALL_ROLES) {
    it(`lands a ${role} with approvedAt null where the app-shell guard leaves them`, async () => {
      const bounce = await guardBounceFor({ role, approvedAt: null });
      vi.clearAllMocks();
      const destination = await redirectToFor({
        role,
        mustChangePassword: false,
        approvedAt: null,
      });
      // Either the guard would not move them (→ role home is safe) or login
      // must already send them to the exact URL the guard would.
      expect(destination).toBe(bounce ?? ROLE_HOMES[role]);
    });

    it(`sends an approved ${role} to its role home`, async () => {
      expect(
        await redirectToFor({
          role,
          mustChangePassword: false,
          approvedAt: new Date(),
        })
      ).toBe(ROLE_HOMES[role]);
    });

    it(`gives mustChangePassword precedence for a ${role}`, async () => {
      expect(
        await redirectToFor(
          { role, mustChangePassword: true, approvedAt: null },
          { callbackUrl: "/settings" }
        )
      ).toBe("/change-password");
    });
  }

  it("does NOT route an unapproved STARTUP to /pending", async () => {
    // A null approvedAt is meaningless for a non-gated role (only gated roles
    // are created pending). /pending bounces non-gated users back to their role
    // home, so sending a STARTUP there would CREATE the chained redirect.
    expect(APPROVAL_GATED_ROLES).not.toContain("STARTUP" as UserRole);
    expect(
      await redirectToFor({
        role: "STARTUP",
        mustChangePassword: false,
        approvedAt: null,
      })
    ).toBe("/dashboard/startup");
  });

  it("never honors /pending as a callbackUrl for a user who is not awaiting approval", async () => {
    // e.g. a partner whose session expired on /pending and was approved in the
    // meantime: /pending would bounce them to the role home (second hop).
    expect(
      await redirectToFor(
        {
          role: "BUSINESS_PARTNER",
          mustChangePassword: false,
          approvedAt: new Date(),
        },
        { callbackUrl: "/pending" }
      )
    ).toBe("/dashboard/partner");
  });
});

describe("changePassword — re-auth destination respects the approval gate", () => {
  /** Runs `changePassword` and returns the `redirectTo` handed to signIn. */
  async function reauthRedirectFor(user: {
    role: UserRole;
    approvedAt: Date | null;
  }): Promise<string | undefined> {
    mockAuth.mockResolvedValue({
      user: { id: "u1", email: "u@example.com", role: user.role },
    } as never);
    mockFindUnique.mockResolvedValue({
      id: "u1",
      isActive: true,
      ...user,
    } as never);
    await changePassword(
      undefined,
      form({ password: "supersecret", confirm: "supersecret" })
    );
    const call = mockSignIn.mock.calls[0];
    return (call?.[1] as { redirectTo?: string } | undefined)?.redirectTo;
  }

  it("sends an approved user to its role home", async () => {
    expect(
      await reauthRedirectFor({ role: "MEMBER", approvedAt: new Date() })
    ).toBe("/dashboard/member");
  });

  it("sends a still-unapproved partner to /pending, not the role home", async () => {
    // An invited/provisioned partner can owe a first-login password change AND
    // still be unapproved; the role home would be bounced to /pending by the
    // app-shell guard right after the re-auth redirect.
    expect(
      await reauthRedirectFor({ role: "BUSINESS_PARTNER", approvedAt: null })
    ).toBe("/pending");
  });

  it("sends an unapproved STARTUP to its role home (not approval-gated)", async () => {
    expect(
      await reauthRedirectFor({ role: "STARTUP", approvedAt: null })
    ).toBe("/dashboard/startup");
  });
});
