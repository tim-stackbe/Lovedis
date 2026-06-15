"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { UserRole } from "@/generated/prisma/enums";
import { firstZodError, type ActionState } from "@/lib/action-state";
import { requireAuth, requireRole } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { ALL_ROLES } from "@/lib/roles";

const roleEnum = z.enum(ALL_ROLES as [UserRole, ...UserRole[]]);

const createUserSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.email("Bitte gib eine gültige E-Mail-Adresse ein"),
  password: z.string().min(8, "Passwort muss mindestens 8 Zeichen lang sein"),
  role: roleEnum,
  company: z.string().max(160).optional(),
});

export async function createUser(
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  await requireRole(["ADMIN"]);

  const parsed = createUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
    company: formData.get("company") || undefined,
  });
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing)
    return { error: "Ein Nutzer mit dieser E-Mail existiert bereits." };

  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email,
      passwordHash: await bcrypt.hash(parsed.data.password, 10),
      role: parsed.data.role,
      company: parsed.data.company,
    },
  });
  revalidatePath("/users");
  return { success: "Nutzer erstellt." };
}

export async function updateUserRole(
  userId: string,
  role: string
): Promise<ActionState> {
  const session = await requireRole(["ADMIN"]);
  if (userId === session.user.id) {
    return { error: "Du kannst deine eigene Rolle nicht ändern." };
  }
  const parsed = roleEnum.safeParse(role);
  if (!parsed.success) return { error: "Ungültige Rolle." };

  await prisma.user.update({
    where: { id: userId },
    data: { role: parsed.data },
  });
  revalidatePath("/users");
  return {};
}

export async function toggleUserActive(userId: string): Promise<ActionState> {
  const session = await requireRole(["ADMIN"]);
  if (userId === session.user.id) {
    return { error: "Du kannst dein eigenes Konto nicht deaktivieren." };
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isActive: true },
  });
  if (!user) return { error: "Nutzer nicht gefunden." };

  await prisma.user.update({
    where: { id: userId },
    data: { isActive: !user.isActive },
  });
  revalidatePath("/users");
  return {};
}

// ---------------------------------------------------------------------------
// Own profile (all roles, /settings)
// ---------------------------------------------------------------------------

const profileSchema = z.object({
  name: z.string().min(2).max(120),
  company: z.string().max(160).optional(),
});

export async function updateOwnProfile(
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const session = await requireAuth();
  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    company: formData.get("company") || undefined,
  });
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  await prisma.user.update({
    where: { id: session.user.id },
    data: { name: parsed.data.name, company: parsed.data.company ?? null },
  });
  revalidatePath("/settings");
  return { success: "Profil aktualisiert." };
}

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Aktuelles Passwort ist erforderlich"),
  newPassword: z
    .string()
    .min(8, "Neues Passwort muss mindestens 8 Zeichen lang sein"),
});

export async function changeOwnPassword(
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const session = await requireAuth();
  const parsed = passwordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
  });
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });
  if (!user) return { error: "Nutzer nicht gefunden." };

  const matches = await bcrypt.compare(
    parsed.data.currentPassword,
    user.passwordHash
  );
  if (!matches) return { error: "Aktuelles Passwort ist falsch." };

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 10) },
  });
  return { success: "Passwort geändert." };
}
