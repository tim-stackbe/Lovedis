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
import { ROLE_HOMES } from "@/lib/roles";

const loginSchema = z.object({
  email: z.email("Bitte gib eine gültige E-Mail-Adresse ein"),
  password: z.string().min(1, "Passwort ist erforderlich"),
});

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
  // redirect. Redirecting to "/" and letting middleware bounce "/" → the role
  // home is a *chained* redirect (Server Action redirect + middleware redirect)
  // which aborts the first client-side navigation after login in Next.js 16 —
  // the landing page fails to load and only a manual reload recovers. Landing
  // directly on the final URL avoids that second hop entirely.
  const callbackUrl = formData.get("callbackUrl");
  const safeCallback =
    typeof callbackUrl === "string" &&
    callbackUrl.startsWith("/") &&
    callbackUrl !== "/"
      ? callbackUrl
      : null;

  // Single lookup for BOTH the role home and the first-login gate.
  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
    select: { role: true, mustChangePassword: true },
  });

  // First-login accounts (admin-provisioned, temporary password) MUST land on
  // /change-password. Sending them to their role home first would make
  // middleware bounce role-home → /change-password — the same chained redirect
  // that breaks the first navigation in Next.js 16. So force /change-password
  // directly, taking precedence over any callbackUrl (middleware would bounce a
  // non-exempt callback for these users anyway).
  let redirectTo: string;
  if (user?.mustChangePassword) {
    redirectTo = "/change-password";
  } else {
    redirectTo = safeCallback ?? (user ? ROLE_HOMES[user.role] : "/");
  }

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
  await signOut({ redirectTo: "/login" });
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
 * would keep bouncing the user back to /change-password), then lands them on
 * their role home in a single redirect.
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
    select: { id: true, isActive: true },
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

  try {
    await signIn("credentials", {
      email,
      password: parsed.data.password,
      redirectTo: ROLE_HOMES[session.user.role],
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
  // Self-registered partners land in the approval queue (approvedAt null =
  // pending); every other self-signup role is approved immediately so it is
  // never gated.
  await prisma.user.create({
    data: {
      email,
      name: parsed.data.name,
      company: parsed.data.company,
      passwordHash,
      role,
      approvedAt: role === "BUSINESS_PARTNER" ? null : new Date(),
    },
  });
  await sendRegistrationConfirmationEmail({ to: email, name: parsed.data.name });

  // Land directly on the concrete destination (single redirect) — same reason
  // as `login` above. A freshly self-registered partner is still pending
  // approval, so the app-shell guard would bounce their role home → /pending;
  // send them straight to /pending to keep it a single hop.
  const redirectTo =
    role === "BUSINESS_PARTNER" ? "/pending" : ROLE_HOMES[role];
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
