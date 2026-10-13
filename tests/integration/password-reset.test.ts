import bcrypt from "bcryptjs";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the framework/session edges; the DB layer is exercised for real against
// the local _test database (same harness as the other integration suites).
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}));
// actions/auth.ts imports `AuthError` from next-auth at module scope; the real
// package pulls in `next/server` which is unavailable in the vitest node env.
// A minimal stub keeps the import graph loadable (the reset actions never throw
// AuthError anyway).
vi.mock("next-auth", () => ({
  AuthError: class AuthError extends Error {},
}));
vi.mock("@/auth", () => ({
  auth: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue({ ok: true, id: "test-message-id" }),
}));

import { requestPasswordReset, resetPassword } from "@/app/actions/auth";
import { sendEmail } from "@/lib/email";
import {
  findRedeemableResetToken,
  generateResetToken,
  hashResetToken,
  issuePasswordResetToken,
  PASSWORD_RESET_TTL_MINUTES,
} from "@/lib/password-reset";
import { prisma, resetDb } from "../helpers/db";

const mockSendEmail = vi.mocked(sendEmail);

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

let seq = 0;
async function makeUser(opts: {
  email?: string;
  isActive?: boolean;
  mustChangePassword?: boolean;
  password?: string;
} = {}) {
  seq += 1;
  const email = opts.email ?? `reset${seq}-${Math.random().toString(36).slice(2, 7)}@test.local`;
  const passwordHash = await bcrypt.hash(opts.password ?? "OldPassw0rd!", 10);
  return prisma.user.create({
    data: {
      email: email.toLowerCase(),
      name: `Reset User ${seq}`,
      passwordHash,
      role: "STARTUP",
      isActive: opts.isActive ?? true,
      approvedAt: new Date(),
      mustChangePassword: opts.mustChangePassword ?? false,
    },
  });
}

beforeEach(async () => {
  await resetDb();
  vi.clearAllMocks();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("token core — hashing, TTL, single-use, expiry", () => {
  it("stores only the SHA-256 HASH of the token, never the raw value", async () => {
    const user = await makeUser();
    const issued = await issuePasswordResetToken({ userId: user.id });
    expect(issued).not.toBeNull();
    const raw = issued!.rawToken;

    const row = await prisma.passwordResetToken.findFirstOrThrow({
      where: { userId: user.id },
    });
    // The stored hash matches sha256(raw) and is NOT the raw token itself.
    expect(row.tokenHash).toBe(hashResetToken(raw));
    expect(row.tokenHash).not.toBe(raw);
    expect(row.usedAt).toBeNull();
    // TTL is in the configured window (allow a little slack for exec time).
    const ttlMs = row.expiresAt.getTime() - row.createdAt.getTime();
    expect(ttlMs).toBeGreaterThan((PASSWORD_RESET_TTL_MINUTES - 1) * 60 * 1000);
    expect(ttlMs).toBeLessThanOrEqual(
      (PASSWORD_RESET_TTL_MINUTES + 1) * 60 * 1000
    );
  });

  it("finds a fresh token but rejects an expired one", async () => {
    const user = await makeUser();
    const raw = generateResetToken();
    // Fresh token.
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashResetToken(raw),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });
    expect(await findRedeemableResetToken(raw)).toMatchObject({
      userId: user.id,
    });

    // Back-date the expiry — now it must be rejected.
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    expect(await findRedeemableResetToken(raw)).toBeNull();
  });

  it("rejects an already-used (single-use) token and an unknown token", async () => {
    const user = await makeUser();
    const raw = generateResetToken();
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashResetToken(raw),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        usedAt: new Date(),
      },
    });
    expect(await findRedeemableResetToken(raw)).toBeNull();
    expect(await findRedeemableResetToken("totally-unknown-token")).toBeNull();
  });

  it("replaces any earlier outstanding token when a new one is issued", async () => {
    const user = await makeUser();
    const first = await issuePasswordResetToken({ userId: user.id });
    // Bypass the throttle window by back-dating the first token's createdAt.
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id },
      data: { createdAt: new Date(Date.now() - 5 * 60 * 1000) },
    });
    const second = await issuePasswordResetToken({ userId: user.id });
    expect(second).not.toBeNull();

    const rows = await prisma.passwordResetToken.findMany({
      where: { userId: user.id },
    });
    // Exactly one live token remains — the newest.
    expect(rows).toHaveLength(1);
    expect(await findRedeemableResetToken(first!.rawToken)).toBeNull();
    expect(await findRedeemableResetToken(second!.rawToken)).toMatchObject({
      userId: user.id,
    });
  });

  it("throttles rapid repeat issuance (no second token, no burst)", async () => {
    const user = await makeUser();
    const first = await issuePasswordResetToken({ userId: user.id });
    expect(first).not.toBeNull();
    // Immediate second request within the throttle window → no-op.
    const second = await issuePasswordResetToken({ userId: user.id });
    expect(second).toBeNull();
    expect(
      await prisma.passwordResetToken.count({ where: { userId: user.id } })
    ).toBe(1);
  });
});

describe("requestPasswordReset — no user enumeration", () => {
  it("issues a token + sends the email for an existing active account", async () => {
    const user = await makeUser({ email: "exists@test.local" });
    const res = await requestPasswordReset(undefined, form({ email: "Exists@test.local" }));

    // Neutral success message.
    expect(res.success).toBeTruthy();
    expect(res.error).toBeUndefined();
    // A token row was created and the email was sent once.
    expect(
      await prisma.passwordResetToken.count({ where: { userId: user.id } })
    ).toBe(1);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    // The email must NOT be sent with the raw token stored in the DB.
    const [msg] = mockSendEmail.mock.calls[0];
    const row = await prisma.passwordResetToken.findFirstOrThrow({
      where: { userId: user.id },
    });
    expect(msg.text).not.toContain(row.tokenHash);
    expect(msg.to).toBe("exists@test.local");
  });

  it("returns the SAME neutral message for a NON-existent email and creates NO token", async () => {
    const res = await requestPasswordReset(
      undefined,
      form({ email: "nobody@test.local" })
    );
    expect(res.success).toBeTruthy();
    expect(res.error).toBeUndefined();
    expect(await prisma.passwordResetToken.count()).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("stays silent (neutral, no token, no email) for a deactivated account", async () => {
    const user = await makeUser({ isActive: false });
    const res = await requestPasswordReset(
      undefined,
      form({ email: user.email })
    );
    expect(res.success).toBeTruthy();
    expect(await prisma.passwordResetToken.count({ where: { userId: user.id } })).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("rejects a malformed email before doing any work", async () => {
    const res = await requestPasswordReset(undefined, form({ email: "not-an-email" }));
    expect(res.error).toBeTruthy();
    expect(await prisma.passwordResetToken.count()).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});

describe("resetPassword — redemption, single-use, invalidation", () => {
  it("sets a new hash, stamps passwordChangedAt, clears mustChangePassword, marks token used", async () => {
    const user = await makeUser({ mustChangePassword: true, password: "OldPassw0rd!" });
    const issued = await issuePasswordResetToken({ userId: user.id });
    const raw = issued!.rawToken;

    await expect(
      resetPassword(
        undefined,
        form({ token: raw, password: "BrandNewPass1", confirm: "BrandNewPass1" })
      )
    ).rejects.toThrow("REDIRECT:/login?reset=success");

    const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    // New password verifies; old one no longer does.
    expect(await bcrypt.compare("BrandNewPass1", after.passwordHash)).toBe(true);
    expect(await bcrypt.compare("OldPassw0rd!", after.passwordHash)).toBe(false);
    expect(after.mustChangePassword).toBe(false);
    expect(after.passwordChangedAt).not.toBeNull();

    // Token is now single-use spent and cannot be reused.
    const token = await prisma.passwordResetToken.findFirstOrThrow({
      where: { userId: user.id },
    });
    expect(token.usedAt).not.toBeNull();
    expect(await findRedeemableResetToken(raw)).toBeNull();

    const reuse = await resetPassword(
      undefined,
      form({ token: raw, password: "AnotherPass9", confirm: "AnotherPass9" })
    );
    expect(reuse.error).toContain("ungültig");
  });

  it("rejects an invalid / unknown token", async () => {
    const res = await resetPassword(
      undefined,
      form({ token: "bogus-token", password: "BrandNewPass1", confirm: "BrandNewPass1" })
    );
    expect(res.error).toContain("ungültig");
  });

  it("rejects an expired token", async () => {
    const user = await makeUser();
    const raw = generateResetToken();
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashResetToken(raw),
        expiresAt: new Date(Date.now() - 1000),
      },
    });
    const res = await resetPassword(
      undefined,
      form({ token: raw, password: "BrandNewPass1", confirm: "BrandNewPass1" })
    );
    expect(res.error).toContain("ungültig");
    // Password unchanged.
    const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(await bcrypt.compare("OldPassw0rd!", after.passwordHash)).toBe(true);
  });

  it("rejects mismatched / too-short passwords", async () => {
    const user = await makeUser();
    const issued = await issuePasswordResetToken({ userId: user.id });
    const raw = issued!.rawToken;

    const mismatch = await resetPassword(
      undefined,
      form({ token: raw, password: "BrandNewPass1", confirm: "different" })
    );
    expect(mismatch.error).toContain("stimmen nicht überein");

    const tooShort = await resetPassword(
      undefined,
      form({ token: raw, password: "short", confirm: "short" })
    );
    expect(tooShort.error).toContain("mindestens 8");

    // Token must still be unused after failed attempts.
    expect(await findRedeemableResetToken(raw)).toMatchObject({
      userId: user.id,
    });
  });

  it("invalidates any other outstanding tokens for the user on success", async () => {
    const user = await makeUser();
    // One redeemable token plus a second, manually-created outstanding token.
    const issued = await issuePasswordResetToken({ userId: user.id });
    const raw = issued!.rawToken;
    const strayRaw = generateResetToken();
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashResetToken(strayRaw),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });

    await expect(
      resetPassword(
        undefined,
        form({ token: raw, password: "BrandNewPass1", confirm: "BrandNewPass1" })
      )
    ).rejects.toThrow("REDIRECT:/login?reset=success");

    // The stray outstanding token is gone; only the spent one remains.
    expect(await findRedeemableResetToken(strayRaw)).toBeNull();
    const remaining = await prisma.passwordResetToken.findMany({
      where: { userId: user.id },
    });
    expect(remaining).toHaveLength(1);
    expect(remaining[0].usedAt).not.toBeNull();
  });
});
