"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { z } from "zod";
import { signIn, signOut } from "@/auth";
import type { UserRole } from "@/generated/prisma/enums";
import { firstZodError, type ActionState } from "@/lib/action-state";
import { prisma } from "@/lib/prisma";

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

  const callbackUrl = formData.get("callbackUrl");
  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo:
        typeof callbackUrl === "string" && callbackUrl.startsWith("/")
          ? callbackUrl
          : "/",
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
  await prisma.user.create({
    data: {
      email,
      name: parsed.data.name,
      company: parsed.data.company,
      passwordHash,
      role,
    },
  });

  try {
    await signIn("credentials", {
      email,
      password: parsed.data.password,
      redirectTo: "/",
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
