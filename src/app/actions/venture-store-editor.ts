"use server";

import { revalidatePath } from "next/cache";
import type { SupportCategory } from "@/generated/prisma/enums";
import { firstZodError, type ActionState } from "@/lib/action-state";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import {
  EDITOR_PATH,
  offeringEditorSchema,
  offeringFormInput,
  programEditorSchema,
  programFormInput,
  reorderSortOrders,
  workshopsFromForm,
} from "@/lib/venture-store-editor";

// ---------------------------------------------------------------------------
// Venture Store editor (ADMIN only). The live database is the source of truth
// for the Venture Store catalog; every action here re-checks the ADMIN role.
// ---------------------------------------------------------------------------

function revalidateStore() {
  // "layout" also covers the program/support/mentor detail pages below it.
  revalidatePath("/venture/marketplace", "layout");
  revalidatePath("/venture");
  revalidatePath("/marketplace");
  revalidatePath(EDITOR_PATH, "layout");
}

// ---------------------------------------------------------------------------
// Support-Angebote
// ---------------------------------------------------------------------------

export async function saveOffering(
  offeringId: string | null,
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();
  const parsed = offeringEditorSchema.safeParse(offeringFormInput(formData));
  if (!parsed.success) return { error: firstZodError(parsed.error) };
  const data = parsed.data;

  if (offeringId) {
    const existing = await prisma.supportOffering.findUnique({
      where: { id: offeringId },
      select: { id: true, category: true },
    });
    if (!existing) return { error: "Angebot nicht gefunden." };
    const categoryChanged = existing.category !== data.category;
    await prisma.supportOffering.update({
      where: { id: offeringId },
      data: {
        ...data,
        ...(categoryChanged
          ? { sortOrder: await nextOfferingSortOrder(data.category) }
          : {}),
      },
    });
    revalidateStore();
    return { success: "Änderungen gespeichert." };
  }

  const created = await prisma.supportOffering.create({
    data: { ...data, sortOrder: await nextOfferingSortOrder(data.category) },
    select: { id: true },
  });
  revalidateStore();
  return {
    success: "Support-Angebot angelegt.",
    redirectTo: `${EDITOR_PATH}/offerings/${created.id}?created=1`,
  };
}

async function nextOfferingSortOrder(category: SupportCategory): Promise<number> {
  const last = await prisma.supportOffering.findFirst({
    where: { category },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  return (last?.sortOrder ?? 0) + 1;
}

export async function setOfferingActive(
  offeringId: string,
  isActive: boolean
): Promise<ActionState> {
  await requireAdmin();
  const result = await prisma.supportOffering.updateMany({
    where: { id: offeringId },
    data: { isActive },
  });
  if (result.count === 0) return { error: "Angebot nicht gefunden." };
  revalidateStore();
  return { success: isActive ? "Angebot ist sichtbar." : "Angebot ist ausgeblendet." };
}

export async function moveOffering(
  offeringId: string,
  direction: "up" | "down"
): Promise<ActionState> {
  await requireAdmin();
  const offering = await prisma.supportOffering.findUnique({
    where: { id: offeringId },
    select: { category: true },
  });
  if (!offering) return { error: "Angebot nicht gefunden." };
  const group = await prisma.supportOffering.findMany({
    where: { category: offering.category },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, sortOrder: true },
  });
  const updates = reorderSortOrders(group, offeringId, direction);
  await prisma.$transaction(
    updates.map((u) =>
      prisma.supportOffering.update({
        where: { id: u.id },
        data: { sortOrder: u.sortOrder },
      })
    )
  );
  revalidateStore();
  return { success: "Reihenfolge gespeichert." };
}

export async function deleteOffering(offeringId: string): Promise<ActionState> {
  await requireAdmin();
  const bookings = await prisma.marketplaceBooking.count({
    where: { offeringId },
  });
  if (bookings > 0) {
    return {
      error: `Löschen nicht möglich: Es gibt ${bookings} ${bookings === 1 ? "Buchung" : "Buchungen"} zu diesem Angebot. Blende es stattdessen aus.`,
    };
  }
  const result = await prisma.supportOffering.deleteMany({
    where: { id: offeringId },
  });
  if (result.count === 0) return { error: "Angebot nicht gefunden." };
  revalidateStore();
  return { success: "Angebot gelöscht.", redirectTo: EDITOR_PATH };
}

// ---------------------------------------------------------------------------
// Programme
// ---------------------------------------------------------------------------

export async function saveProgram(
  programId: string | null,
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const session = await requireAdmin();
  const parsed = programEditorSchema.safeParse(programFormInput(formData));
  if (!parsed.success) return { error: firstZodError(parsed.error) };
  const workshops = workshopsFromForm(formData.get("workshops"));
  if (!workshops.ok) return { error: workshops.error };

  const data = {
    ...parsed.data,
    workshops: workshops.workshops,
    sessions: workshops.sessions,
  };

  if (programId) {
    const result = await prisma.program.updateMany({
      where: { id: programId },
      data,
    });
    if (result.count === 0) return { error: "Programm nicht gefunden." };
    revalidateStore();
    return { success: "Änderungen gespeichert." };
  }

  const last = await prisma.program.findFirst({
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  const created = await prisma.program.create({
    data: {
      ...data,
      sortOrder: (last?.sortOrder ?? 0) + 1,
      createdById: session.user.id,
    },
    select: { id: true },
  });
  revalidateStore();
  return {
    success: "Programm angelegt.",
    redirectTo: `${EDITOR_PATH}/programs/${created.id}?created=1`,
  };
}

export async function moveProgram(
  programId: string,
  direction: "up" | "down"
): Promise<ActionState> {
  await requireAdmin();
  const group = await prisma.program.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, sortOrder: true },
  });
  const updates = reorderSortOrders(group, programId, direction);
  await prisma.$transaction(
    updates.map((u) =>
      prisma.program.update({
        where: { id: u.id },
        data: { sortOrder: u.sortOrder },
      })
    )
  );
  revalidateStore();
  return { success: "Reihenfolge gespeichert." };
}

export async function deleteProgram(programId: string): Promise<ActionState> {
  await requireAdmin();
  const bookings = await prisma.marketplaceBooking.count({
    where: { programId },
  });
  if (bookings > 0) {
    return {
      error: `Löschen nicht möglich: Es gibt ${bookings} ${bookings === 1 ? "Anmeldung" : "Anmeldungen"} zu diesem Programm. Setze den Status stattdessen auf Entwurf oder Geschlossen.`,
    };
  }
  const result = await prisma.program.deleteMany({ where: { id: programId } });
  if (result.count === 0) return { error: "Programm nicht gefunden." };
  revalidateStore();
  return { success: "Programm gelöscht.", redirectTo: EDITOR_PATH };
}
