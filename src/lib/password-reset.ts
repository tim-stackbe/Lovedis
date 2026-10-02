// ---------------------------------------------------------------------------
// Self-service password-reset token core.
//
// Security model:
//   * The RAW token is a 32-byte cryptographically random value, base64url
//     encoded. It is emailed to the user and never persisted.
//   * Only the SHA-256 HASH of the raw token is stored (PasswordResetToken.
//     tokenHash, unique). Lookup happens by hash, so a leaked DB row cannot be
//     turned back into a working link, and the unique-index lookup is the
//     "comparison" (no raw-token string compare, no timing side channel).
//   * Tokens are single-use (usedAt) and short-lived (PASSWORD_RESET_TTL_MINUTES).
//   * Requesting a new reset invalidates every earlier outstanding token for the
//     same user, so at most one token is ever live per user.
//   * A short frequency cap (PASSWORD_RESET_THROTTLE_SECONDS) prevents email
//     bombing / unbounded token generation from rapid repeat requests.
// ---------------------------------------------------------------------------

import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

/** Token lifetime. Kept short so a leaked link is only briefly useful. */
export const PASSWORD_RESET_TTL_MINUTES = 60;

/**
 * Minimum spacing between reset emails for the same account. Rapid repeat
 * requests inside this window are treated as no-ops (still shown the neutral
 * success message) so we never fire a burst of emails or tokens.
 */
export const PASSWORD_RESET_THROTTLE_SECONDS = 60;

/** Generates a fresh, URL-safe raw token (never stored; only emailed). */
export function generateResetToken(): string {
  return randomBytes(32).toString("base64url");
}

/** SHA-256 hex digest of a raw token — the only form persisted / looked up. */
export function hashResetToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export interface IssueResult {
  /** The raw token to embed in the reset link (only present when issued). */
  rawToken: string;
}

/**
 * Issues a reset token for a user, enforcing the single-live-token invariant and
 * the frequency cap. Returns the raw token on success, or `null` when the
 * request is throttled (a valid token was just issued) — callers show the same
 * neutral message either way.
 */
export async function issuePasswordResetToken(opts: {
  userId: string;
  requestIp?: string | null;
  userAgent?: string | null;
}): Promise<IssueResult | null> {
  const now = new Date();

  // Frequency cap: if a still-valid, unused token was issued very recently, do
  // nothing (avoids email bursts / unbounded token creation).
  const throttleFloor = new Date(
    now.getTime() - PASSWORD_RESET_THROTTLE_SECONDS * 1000
  );
  const recent = await prisma.passwordResetToken.findFirst({
    where: {
      userId: opts.userId,
      usedAt: null,
      expiresAt: { gt: now },
      createdAt: { gt: throttleFloor },
    },
    select: { id: true },
  });
  if (recent) return null;

  const rawToken = generateResetToken();
  const tokenHash = hashResetToken(rawToken);
  const expiresAt = new Date(
    now.getTime() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000
  );

  // Single live token per user: drop any earlier outstanding (unused) tokens,
  // then create the new one.
  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({
      where: { userId: opts.userId, usedAt: null },
    }),
    prisma.passwordResetToken.create({
      data: {
        userId: opts.userId,
        tokenHash,
        expiresAt,
        requestIp: opts.requestIp ?? null,
        userAgent: opts.userAgent ?? null,
      },
    }),
  ]);

  return { rawToken };
}

export interface ValidResetToken {
  id: string;
  userId: string;
}

/**
 * Looks up a token by the hash of its raw value and returns it only if it is
 * still redeemable (exists, not used, not expired). Returns `null` otherwise —
 * callers must not distinguish "unknown" from "expired/used" to the point of
 * leaking account existence, but here an invalid link is simply invalid.
 */
export async function findRedeemableResetToken(
  rawToken: string
): Promise<ValidResetToken | null> {
  if (!rawToken) return null;
  const tokenHash = hashResetToken(rawToken);
  const token = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, usedAt: true, expiresAt: true },
  });
  if (!token) return null;
  if (token.usedAt) return null;
  if (token.expiresAt.getTime() <= Date.now()) return null;
  return { id: token.id, userId: token.userId };
}
