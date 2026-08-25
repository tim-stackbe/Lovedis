"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { z } from "zod";
import { auth, signIn, signOut } from "@/auth";
import type { UserRole } from "@/generated/prisma/enums";
import { firstZodError, type ActionState } from "@/lib/action-state";
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

  let redirectTo = safeCallback ?? "/";
  if (!safeCallback) {
    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email.toLowerCase() },
      select: { role: true },
    });
    if (user) redirectTo = ROLE_HOMES[user.role];
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
