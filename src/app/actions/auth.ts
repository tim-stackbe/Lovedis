"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth, signIn, signOut } from "@/auth";
import type { UserRole } from "@/generated/prisma/enums";
import { firstZodError, type ActionState } from "@/lib/action-state";
import {
  findRedeemableResetToken,
  hashResetToken,
  issuePasswordResetToken,
} from "@/lib/password-reset";
import { sendPasswordResetEmail } from "@/lib/password-reset-email";
import { sendRegistrationConfirmationEmail } from "@/lib/registration-email";
import { prisma } from "@/lib/prisma";
import {
  APPROVAL_GATED_ROLES,
  isAwaitingApproval,
  PENDING_APPROVAL_PATH,
  ROLE_HOMES,
} from "@/lib/roles";

const loginSchema = z.object({
  email: z.email("Bitte gib eine gültige E-Mail-Adresse ein"),
  password: z.string().min(1, "Passwort ist erforderlich"),
});

/**
 * The concrete URL a freshly signed-in user can land on WITHOUT a guard
 * immediately sending them elsewhere.
 *
 * Any hop added after a Server Action redirect (by middleware or a layout
 * guard) is a *chained* redirect, and that aborts the first client-side
 * navigation after sign-in in Next.js 16 — the landing page fails to load and
 * only a manual reload recovers ("reload error"). So the destination has to
 * already satisfy every gate that would otherwise redirect.
 *
 * Precedence mirrors the order the gates run in:
 *   1. `mustChangePassword` — middleware forces /change-password from anywhere,
 *      so it wins even over an explicit callbackUrl.
 *   2. The approval gate — the `(main)` app-shell guard forces /pending. Read
 *      from `isAwaitingApproval`, the SAME predicate `requireApprovedAccess`
 *      enforces, so the destination cannot drift from the gate when another
 *      role becomes approval-gated.
 *   3. The requested callbackUrl, else the role home.
 */
function postAuthDestination(
  user: {
    role: UserRole;
    mustChangePassword: boolean;
    approvedAt: Date | null;
  } | null,
  callbackUrl: string | null
): string {
  // No row (unknown email) — sign-in fails before any redirect happens.
  if (!user) return callbackUrl ?? "/";
  if (user.mustChangePassword) return "/change-password";
  if (isAwaitingApproval(user)) return PENDING_APPROVAL_PATH;
  // /pending bounces everyone who is NOT awaiting approval back to their role
  // home, so honouring it as a callback would add exactly the hop we avoid.
  if (callbackUrl && callbackUrl !== PENDING_APPROVAL_PATH) return callbackUrl;
  return ROLE_HOMES[user.role];
}

export async function login(
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  // Resolve a CONCRETE post-login destination so sign-in triggers exactly one
  // redirect — see `postAuthDestination` for why a second hop breaks the first
  // navigation after login.
  const callbackUrl = formData.get("callbackUrl");
  const safeCallback =
    typeof callbackUrl === "string" &&
    callbackUrl.startsWith("/") &&
    callbackUrl !== "/"
      ? callbackUrl
      : null;

  // Single lookup feeding every gate the destination has to satisfy: the role
  // home, the first-login gate AND the approval gate.
  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
    select: { role: true, mustChangePassword: true, approvedAt: true },
  });

  const redirectTo = postAuthDestination(user, safeCallback);

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo,
    });
    return {};
  } catch (error) {
    if (isRedirectError(error)) throw error;
    if (error instanceof AuthError) {
      return { error: "Ungültige E-Mail oder ungültiges Passwort." };
    }
    throw error;
  }
}

export async function logout(): Promise<void> {
  // Route through /api/session-clear instead of /login directly. signOut clears
  // the session cookie, but the Server Action's client-side redirect to /login
  // can still race the cookie update — middleware then sees a valid JWT on /login
  // and bounces to the role home (pending partners: /login → /dashboard/partner →
  // /pending). That chained redirect aborts the first navigation in Next.js 16
  // ("This page couldn't load"; manual reload works). session-clear is public
  // even with a JWT, deletes the cookie, then HTTP-redirects to /login in one
  // clean chain — same pattern as requireAuth() for stale sessions.
  await signOut({ redirectTo: "/api/session-clear" });
}

const changePasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Passwort muss mindestens 8 Zeichen lang sein")
      .max(200),
    confirm: z.string().min(1, "Bitte bestätige dein neues Passwort"),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Die Passwörter stimmen nicht überein",
    path: ["confirm"],
  });

/**
 * First-login (or self-service) password change. Requires a valid session,
 * writes the new bcrypt hash, clears the `mustChangePassword` gate and stamps
 * `passwordChangedAt`. Re-authenticates with the new password so the JWT is
 * reissued WITHOUT the stale `mustChangePassword` flag (otherwise middleware
 * would keep bouncing the user back to /change-password), then lands them in a
 * single redirect on whichever destination their remaining gates allow.
 */
export async function changePassword(
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.email) {
    return { error: "Nicht angemeldet. Bitte melde dich erneut an." };
  }

  const parsed = changePasswordSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  const email = session.user.email.toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, isActive: true, role: true, approvedAt: true },
  });
  if (!user || !user.isActive) {
    return { error: "Konto nicht gefunden. Bitte melde dich erneut an." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      mustChangePassword: false,
      passwordChangedAt: new Date(),
    },
  });

  // `mustChangePassword` is cleared above, so this is the role home unless the
  // approval gate still applies — an approval-gated account (e.g. an invited
  // partner awaiting approval) must land on /pending directly, or the app-shell
  // guard would add the second, navigation-breaking hop.
  const redirectTo = postAuthDestination(
    { ...user, mustChangePassword: false },
    null
  );

  try {
    await signIn("credentials", {
      email,
      password: parsed.data.password,
      redirectTo,
    });
    return {};
  } catch (error) {
    if (isRedirectError(error)) throw error;
    // The password was already updated; if re-auth hiccups, sending the user to
    // /login lets them sign in cleanly with the new password.
    if (error instanceof AuthError) {
      return { success: "Passwort geändert. Bitte melde dich erneut an." };
    }
    throw error;
  }
}

const signupSchema = z.object({
  name: z.string().min(2, "Name muss mindestens 2 Zeichen lang sein").max(120),
  email: z.email("Bitte gib eine gültige E-Mail-Adresse ein"),
  password: z.string().min(8, "Passwort muss mindestens 8 Zeichen lang sein"),
  company: z.string().max(160).optional(),
});

async function signup(
  formData: FormData,
  role: Extract<UserRole, "BUSINESS_PARTNER" | "STARTUP">
): Promise<ActionState> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    company: formData.get("company") || undefined,
  });
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing)
    return { error: "Ein Konto mit dieser E-Mail existiert bereits." };

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  // A self-signup in an approval-gated role lands in the approval queue
  // (approvedAt null = pending); every other role is approved immediately so it
  // is never gated. Derived from the gate itself, so creation and routing below
  // always agree.
  const approvedAt = APPROVAL_GATED_ROLES.includes(role) ? null : new Date();
  await prisma.user.create({
    data: {
      email,
      name: parsed.data.name,
      company: parsed.data.company,
      passwordHash,
      role,
      approvedAt,
    },
  });
  await sendRegistrationConfirmationEmail({ to: email, name: parsed.data.name });

  // Land directly on the concrete destination (single redirect) — same reason
  // as `login` above.
  const redirectTo = postAuthDestination(
    { role, mustChangePassword: false, approvedAt },
    null
  );
  try {
    await signIn("credentials", {
      email,
      password: parsed.data.password,
      redirectTo,
    });
    return {};
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { success: "Konto erstellt. Bitte melde dich an." };
  }
}

export async function signupPartner(
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  return signup(formData, "BUSINESS_PARTNER");
}

export async function signupStartup(
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  return signup(formData, "STARTUP");
}

// ---------------------------------------------------------------------------
// Self-service password reset ("Passwort vergessen")
// ---------------------------------------------------------------------------

const forgotPasswordSchema = z.object({
  email: z.email("Bitte gib eine gültige E-Mail-Adresse ein"),
});

/** Neutral response shown for EVERY forgot-password submission (see below). */
const NEUTRAL_RESET_MESSAGE =
  "Falls ein Konto mit dieser E-Mail existiert, haben wir dir einen Link zum " +
  "Zurücksetzen des Passworts geschickt. Bitte prüfe dein Postfach.";

/**
 * Step 1 of the reset flow. Takes an email and — ONLY if it maps to an active
 * account — issues a single-use, short-lived token and emails the reset link.
 * The response is ALWAYS the same neutral success message regardless of whether
 * the account exists, so this endpoint cannot be used to enumerate users. Token
 * issuance is throttled and replaces any earlier outstanding token for the user.
 */
export async function requestPasswordReset(
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, isActive: true },
  });

  // Only issue + send for a real, active account. Everything below is silent so
  // the caller learns nothing about account existence.
  if (user && user.isActive) {
    const hdrs = await headers();
    const requestIp =
      hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
    const userAgent = hdrs.get("user-agent");

    const issued = await issuePasswordResetToken({
      userId: user.id,
      requestIp,
      userAgent,
    });
    if (issued) {
      // Best-effort send: never surface delivery outcome (would leak existence).
      await sendPasswordResetEmail({
        to: email,
        name: user.name,
        rawToken: issued.rawToken,
      }).catch(() => {});
    }
  }

  return { success: NEUTRAL_RESET_MESSAGE };
}

const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: z
      .string()
      .min(8, "Passwort muss mindestens 8 Zeichen lang sein")
      .max(200),
    confirm: z.string().min(1, "Bitte bestätige dein neues Passwort"),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Die Passwörter stimmen nicht überein",
    path: ["confirm"],
  });

/**
 * Step 2 of the reset flow. Verifies the raw token server-side (exists, unused,
 * unexpired), writes the new bcrypt(10) hash, stamps `passwordChangedAt`, clears
 * any `mustChangePassword` gate, marks the token single-use spent, and drops
 * every other outstanding token for that user. On success we redirect to /login
 * with a success flash rather than auto-signing-in: a password reset is a
 * security-sensitive event, so forcing a fresh credential login with the NEW
 * password is the cleaner, safer UX (and sidesteps reissuing a session for a
 * flow that may have been initiated by someone other than the account owner).
 */
export async function resetPassword(
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  const rawToken = parsed.data.token;
  const valid = await findRedeemableResetToken(rawToken);
  if (!valid) {
    return {
      error:
        "Dieser Link ist ungültig oder abgelaufen. Bitte fordere einen neuen an.",
    };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const tokenHash = hashResetToken(rawToken);

  // Consume the token and update the password atomically. The updateMany guard
  // on the token (usedAt still null) makes redemption idempotent/race-safe: a
  // concurrent second submit updates 0 rows and we bail out below.
  const consumed = await prisma.$transaction(async (tx) => {
    const mark = await tx.passwordResetToken.updateMany({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (mark.count === 0) return false;

    await tx.user.update({
      where: { id: valid.userId },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
        mustChangePassword: false,
      },
    });
    // Invalidate any other outstanding tokens for this user (single-use, plus
    // no lingering links after a successful reset).
    await tx.passwordResetToken.deleteMany({
      where: { userId: valid.userId, usedAt: null },
    });
    return true;
  });

  if (!consumed) {
    return {
      error:
        "Dieser Link ist ungültig oder abgelaufen. Bitte fordere einen neuen an.",
    };
  }

  redirect("/login?reset=success");
}
