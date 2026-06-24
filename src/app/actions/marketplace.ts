"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type {
  MarketplaceOfferingType,
  SupportCategory,
} from "@/generated/prisma/enums";
import { firstZodError, type ActionState } from "@/lib/action-state";
import { requireRole, requireStartup, requireTeam } from "@/lib/auth-guards";
import { MARKETPLACE_OFFERING_TYPES, SUPPORT_CATEGORIES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Startup-Marktplatz. Startups fragen Programme/Mentor-Sessions/Support-Angebote
// an; das LOVEDIS-Team koordiniert und bestätigt. Credits werden — gemäß der
// Plan-Entscheidung „redeem-on-confirm" — ausschließlich beim Übergang nach
// CONFIRMED über den bestehenden Mara-Credit-Ledger eingelöst (SPEND), und bei
// Storno nach CONFIRMED per ADJUSTMENT zurückgebucht. Der Ledger bleibt Single
// Source of Truth; die Buchung hält nur einen Preis-Snapshot + Tx-Link.
// ---------------------------------------------------------------------------

const REVALIDATE_PATHS = [
  "/venture/marketplace",
  "/venture/marketplace/requests",
  "/venture/credits",
  "/marketplace",
];

function revalidateMarketplace() {
  for (const p of REVALIDATE_PATHS) revalidatePath(p);
}

/** Sentinel thrown inside the confirm transaction when the balance is too low. */
class InsufficientCreditsError extends Error {}

// ---------------------------------------------------------------------------
// Startup: request a booking
// ---------------------------------------------------------------------------

const requestSchema = z.object({
  offeringType: z.enum(
    MARKETPLACE_OFFERING_TYPES as [
      MarketplaceOfferingType,
      ...MarketplaceOfferingType[],
    ]
  ),
  targetId: z.string().min(1, "Angebot ist erforderlich."),
  message: z
    .string()
    .trim()
    .min(10, "Bitte beschreibe dein Anliegen in mindestens 10 Zeichen.")
    .max(2000, "Nachricht ist zu lang."),
  contactName: z.string().trim().min(2, "Bitte gib einen Kontaktnamen an.").max(160),
  contactEmail: z.email("Bitte gib eine gültige E-Mail an."),
  preferredAt: z.string().trim().max(280).optional(),
});

/**
 * Resolves the catalog target for an offering type and returns the target id
 * field + the (snapshotted) credit cost. Programs always cost 0.
 */
async function resolveTarget(
  offeringType: MarketplaceOfferingType,
  targetId: string
): Promise<
  | { ok: true; data: { creditCost: number; field: "programId" | "mentorId" | "offeringId" } }
  | { ok: false; error: string }
> {
  if (offeringType === "PROGRAM") {
    const program = await prisma.program.findUnique({
      where: { id: targetId },
      select: { status: true },
    });
    if (!program || program.status !== "OPEN") {
      return { ok: false, error: "Programm nicht gefunden." };
    }
    return { ok: true, data: { creditCost: 0, field: "programId" } };
  }
  if (offeringType === "MENTOR_SESSION") {
    const mentor = await prisma.mentorProfile.findUnique({
      where: { id: targetId },
      select: { isActive: true, creditCost: true },
    });
    if (!mentor || !mentor.isActive) {
      return { ok: false, error: "Mentor:in nicht gefunden." };
    }
    return { ok: true, data: { creditCost: mentor.creditCost, field: "mentorId" } };
  }
  const offering = await prisma.supportOffering.findUnique({
    where: { id: targetId },
    select: { isActive: true, creditCost: true },
  });
  if (!offering || !offering.isActive) {
    return { ok: false, error: "Angebot nicht gefunden." };
  }
  return { ok: true, data: { creditCost: offering.creditCost, field: "offeringId" } };
}

export async function requestBooking(
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const session = await requireStartup();

  const parsed = requestSchema.safeParse({
    offeringType: formData.get("offeringType"),
    targetId: formData.get("targetId"),
    message: formData.get("message"),
    contactName: formData.get("contactName"),
    contactEmail: formData.get("contactEmail"),
    preferredAt: formData.get("preferredAt") || undefined,
  });
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  const startup = await prisma.startup.findUnique({
    where: { ownerUserId: session.user.id },
    select: { id: true, creditAccount: { select: { balance: true } } },
  });
  if (!startup) return { error: "Lege zuerst dein Startup-Profil an." };

  const resolved = await resolveTarget(parsed.data.offeringType, parsed.data.targetId);
  if (!resolved.ok) return { error: resolved.error };

  const { creditCost, field } = resolved.data;

  // Soft balance check at request time (no charge yet). Credits are only
  // redeemed on CONFIRMED; the final, authoritative check happens there.
  if (creditCost > 0) {
    const balance = startup.creditAccount?.balance ?? 0;
    if (balance < creditCost) {
      return {
        error: `Dein Guthaben (${balance}) reicht für dieses Angebot (${creditCost} Credits) nicht aus.`,
      };
    }
  }

  await prisma.marketplaceBooking.create({
    data: {
      offeringType: parsed.data.offeringType,
      startupId: startup.id,
      requestedById: session.user.id,
      [field]: parsed.data.targetId,
      message: parsed.data.message,
      contactName: parsed.data.contactName,
      contactEmail: parsed.data.contactEmail,
      preferredAt: parsed.data.preferredAt ?? null,
      creditCost,
    },
  });

  revalidateMarketplace();
  return {
    success:
      creditCost > 0
        ? "Anfrage gesendet — Credits werden erst nach Bestätigung eingelöst."
        : "Anfrage gesendet — das Lovedis-Team meldet sich.",
  };
}

// ---------------------------------------------------------------------------
// Team: lifecycle transitions
// ---------------------------------------------------------------------------

export async function takeBookingIntoCoordination(
  bookingId: string
): Promise<ActionState> {
  const session = await requireTeam();
  const booking = await prisma.marketplaceBooking.findUnique({
    where: { id: bookingId },
    select: { status: true },
  });
  if (!booking) return { error: "Buchung nicht gefunden." };
  if (booking.status !== "REQUESTED") {
    return { error: "Nur offene Anfragen können in Koordination genommen werden." };
  }

  await prisma.marketplaceBooking.update({
    where: { id: bookingId },
    data: { status: "IN_COORDINATION", handledById: session.user.id },
  });
  revalidateMarketplace();
  return { success: "Anfrage in Koordination genommen." };
}

/**
 * Confirms a booking and — for paid offerings — redeems the credits atomically:
 * a SPEND CreditTransaction is created, the cached account balance is
 * decremented, and the transaction is linked back to the booking, all in one
 * Prisma transaction. Guards against double-charging (only confirms from
 * IN_COORDINATION) and against confirming with an insufficient balance.
 */
export async function confirmBooking(bookingId: string): Promise<ActionState> {
  const session = await requireTeam();

  const booking = await prisma.marketplaceBooking.findUnique({
    where: { id: bookingId },
    include: {
      program: { select: { title: true } },
      mentor: { select: { name: true } },
      offering: { select: { title: true } },
    },
  });
  if (!booking) return { error: "Buchung nicht gefunden." };
  if (booking.status !== "IN_COORDINATION") {
    return { error: "Nur Anfragen in Koordination können bestätigt werden." };
  }
  if (booking.creditTransactionId) {
    return { error: "Diese Buchung wurde bereits abgerechnet." };
  }

  // Programs (cost 0) confirm without touching the ledger.
  if (booking.creditCost <= 0) {
    await prisma.marketplaceBooking.update({
      where: { id: bookingId },
      data: { status: "CONFIRMED", handledById: session.user.id },
    });
    revalidateMarketplace();
    return { success: "Buchung bestätigt." };
  }

  const targetName =
    booking.mentor?.name ?? booking.offering?.title ?? booking.program?.title ?? "Angebot";

  try {
    await prisma.$transaction(async (tx) => {
      // Re-read the status inside the transaction to avoid a double-confirm race.
      const current = await tx.marketplaceBooking.findUnique({
        where: { id: bookingId },
        select: { status: true, creditTransactionId: true },
      });
      if (!current || current.status !== "IN_COORDINATION" || current.creditTransactionId) {
        throw new Error("STALE");
      }

      const account =
        (await tx.creditAccount.findUnique({
          where: { startupId: booking.startupId },
        })) ??
        (await tx.creditAccount.create({ data: { startupId: booking.startupId } }));

      if (account.balance < booking.creditCost) {
        throw new InsufficientCreditsError();
      }

      const creditTx = await tx.creditTransaction.create({
        data: {
          accountId: account.id,
          type: "SPEND",
          amount: -booking.creditCost,
          reason: `Marktplatz-Buchung: ${targetName}`,
          createdById: session.user.id,
        },
      });
      await tx.creditAccount.update({
        where: { id: account.id },
        data: { balance: { decrement: booking.creditCost } },
      });
      await tx.marketplaceBooking.update({
        where: { id: bookingId },
        data: {
          status: "CONFIRMED",
          handledById: session.user.id,
          creditTransactionId: creditTx.id,
        },
      });
    });
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return { error: "Guthaben des Startups reicht nicht aus — Bestätigung abgebrochen." };
    }
    if (err instanceof Error && err.message === "STALE") {
      return { error: "Status hat sich geändert. Bitte neu laden." };
    }
    throw err;
  }

  revalidateMarketplace();
  return {
    success: `Bestätigt — ${booking.creditCost} Credits eingelöst.`,
  };
}

export async function completeBooking(bookingId: string): Promise<ActionState> {
  await requireTeam();
  const booking = await prisma.marketplaceBooking.findUnique({
    where: { id: bookingId },
    select: { status: true },
  });
  if (!booking) return { error: "Buchung nicht gefunden." };
  if (booking.status !== "CONFIRMED") {
    return { error: "Nur bestätigte Buchungen können abgeschlossen werden." };
  }
  await prisma.marketplaceBooking.update({
    where: { id: bookingId },
    data: { status: "COMPLETED" },
  });
  revalidateMarketplace();
  return { success: "Buchung abgeschlossen." };
}

export async function declineBooking(
  bookingId: string,
  note?: string
): Promise<ActionState> {
  const session = await requireTeam();
  const booking = await prisma.marketplaceBooking.findUnique({
    where: { id: bookingId },
    select: { status: true },
  });
  if (!booking) return { error: "Buchung nicht gefunden." };
  if (booking.status === "CONFIRMED" || booking.status === "COMPLETED") {
    return { error: "Bereits bestätigte Buchungen können nicht abgelehnt werden." };
  }
  if (booking.status === "DECLINED" || booking.status === "CANCELLED") {
    return { error: "Diese Anfrage wurde bereits abgeschlossen." };
  }
  await prisma.marketplaceBooking.update({
    where: { id: bookingId },
    data: {
      status: "DECLINED",
      handledById: session.user.id,
      coordinatorNote: note?.trim() || undefined,
    },
  });
  revalidateMarketplace();
  return { success: "Anfrage abgelehnt." };
}

/**
 * Cancels a booking. A startup may cancel its own booking before it is
 * confirmed; the team may cancel at any time. If a confirmed booking with a
 * redeemed credit cost is cancelled, the credits are refunded as a positive
 * ADJUSTMENT (atomic with the balance update). Refund policy: 100 %.
 */
export async function cancelBooking(bookingId: string): Promise<ActionState> {
  const session = await requireRole(["ADMIN", "MEMBER", "STARTUP"]);
  const isTeam = session.user.role === "ADMIN" || session.user.role === "MEMBER";

  const booking = await prisma.marketplaceBooking.findUnique({
    where: { id: bookingId },
    include: { startup: { select: { ownerUserId: true } } },
  });
  if (!booking) return { error: "Buchung nicht gefunden." };

  if (!isTeam) {
    if (booking.startup.ownerUserId !== session.user.id) {
      return { error: "Keine Berechtigung." };
    }
    if (booking.status === "CONFIRMED" || booking.status === "COMPLETED") {
      return {
        error: "Bestätigte Buchungen kann nur das Lovedis-Team stornieren.",
      };
    }
  }

  if (booking.status === "CANCELLED" || booking.status === "DECLINED") {
    return { error: "Diese Buchung ist bereits abgeschlossen." };
  }

  const needsRefund =
    booking.status === "CONFIRMED" &&
    booking.creditCost > 0 &&
    booking.creditTransactionId !== null;

  if (!needsRefund) {
    await prisma.marketplaceBooking.update({
      where: { id: bookingId },
      data: { status: "CANCELLED", handledById: isTeam ? session.user.id : undefined },
    });
    revalidateMarketplace();
    return { success: "Buchung storniert." };
  }

  await prisma.$transaction(async (tx) => {
    const account = await tx.creditAccount.findUnique({
      where: { startupId: booking.startupId },
      select: { id: true },
    });
    if (account) {
      await tx.creditTransaction.create({
        data: {
          accountId: account.id,
          type: "ADJUSTMENT",
          amount: booking.creditCost,
          reason: "Storno-Rückbuchung: Marktplatz-Buchung",
          createdById: session.user.id,
        },
      });
      await tx.creditAccount.update({
        where: { id: account.id },
        data: { balance: { increment: booking.creditCost } },
      });
    }
    await tx.marketplaceBooking.update({
      where: { id: bookingId },
      data: { status: "CANCELLED", handledById: session.user.id },
    });
  });

  revalidateMarketplace();
  return { success: `Storniert — ${booking.creditCost} Credits zurückgebucht.` };
}

// ---------------------------------------------------------------------------
// Team: catalog maintenance (Programme, Mentor:innen, Support-Angebote)
// ---------------------------------------------------------------------------

const programSchema = z.object({
  title: z.string().trim().min(3, "Titel ist zu kurz.").max(160),
  summary: z.string().trim().min(3, "Teaser ist zu kurz.").max(280),
  description: z.string().trim().min(10, "Beschreibung ist zu kurz.").max(4000),
  focusTags: z.string().trim().max(280).optional(),
});

export async function createProgram(
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const session = await requireTeam();
  const parsed = programSchema.safeParse({
    title: formData.get("title"),
    summary: formData.get("summary"),
    description: formData.get("description"),
    focusTags: formData.get("focusTags") || undefined,
  });
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  await prisma.program.create({
    data: {
      title: parsed.data.title,
      summary: parsed.data.summary,
      description: parsed.data.description,
      focusTags: splitTags(parsed.data.focusTags),
      status: "OPEN",
      createdById: session.user.id,
    },
  });
  revalidateMarketplace();
  revalidatePath("/marketplace/catalog");
  return { success: "Programm angelegt." };
}

const mentorSchema = z.object({
  name: z.string().trim().min(2, "Name ist erforderlich.").max(160),
  company: z.string().trim().max(160).optional(),
  role: z.string().trim().max(160).optional(),
  expertise: z.string().trim().max(280).optional(),
  bio: z.string().trim().max(2000).optional(),
  creditCost: z.coerce.number().int().min(0).max(1_000_000),
});

export async function createMentor(
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  await requireTeam();
  const parsed = mentorSchema.safeParse({
    name: formData.get("name"),
    company: formData.get("company") || undefined,
    role: formData.get("role") || undefined,
    expertise: formData.get("expertise") || undefined,
    bio: formData.get("bio") || undefined,
    creditCost: formData.get("creditCost") ?? 0,
  });
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  await prisma.mentorProfile.create({
    data: {
      name: parsed.data.name,
      company: parsed.data.company ?? null,
      role: parsed.data.role ?? null,
      expertise: splitTags(parsed.data.expertise),
      bio: parsed.data.bio ?? null,
      creditCost: parsed.data.creditCost,
    },
  });
  revalidateMarketplace();
  revalidatePath("/marketplace/catalog");
  return { success: "Mentor:in angelegt." };
}

const offeringSchema = z.object({
  title: z.string().trim().min(3, "Titel ist zu kurz.").max(160),
  category: z.enum(SUPPORT_CATEGORIES as [SupportCategory, ...SupportCategory[]]),
  summary: z.string().trim().min(3, "Teaser ist zu kurz.").max(280),
  description: z.string().trim().min(10, "Beschreibung ist zu kurz.").max(4000),
  format: z.string().trim().max(80).optional(),
  creditCost: z.coerce.number().int().min(0).max(1_000_000),
});

export async function createOffering(
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  await requireTeam();
  const parsed = offeringSchema.safeParse({
    title: formData.get("title"),
    category: formData.get("category"),
    summary: formData.get("summary"),
    description: formData.get("description"),
    format: formData.get("format") || undefined,
    creditCost: formData.get("creditCost") ?? 0,
  });
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  await prisma.supportOffering.create({
    data: {
      title: parsed.data.title,
      category: parsed.data.category,
      summary: parsed.data.summary,
      description: parsed.data.description,
      format: parsed.data.format ?? null,
      creditCost: parsed.data.creditCost,
    },
  });
  revalidateMarketplace();
  revalidatePath("/marketplace/catalog");
  return { success: "Support-Angebot angelegt." };
}

export async function toggleMentorActive(mentorId: string): Promise<void> {
  await requireTeam();
  const mentor = await prisma.mentorProfile.findUnique({
    where: { id: mentorId },
    select: { isActive: true },
  });
  if (!mentor) return;
  await prisma.mentorProfile.update({
    where: { id: mentorId },
    data: { isActive: !mentor.isActive },
  });
  revalidateMarketplace();
  revalidatePath("/marketplace/catalog");
}

export async function toggleOfferingActive(offeringId: string): Promise<void> {
  await requireTeam();
  const offering = await prisma.supportOffering.findUnique({
    where: { id: offeringId },
    select: { isActive: true },
  });
  if (!offering) return;
  await prisma.supportOffering.update({
    where: { id: offeringId },
    data: { isActive: !offering.isActive },
  });
  revalidateMarketplace();
  revalidatePath("/marketplace/catalog");
}

export async function toggleProgramOpen(programId: string): Promise<void> {
  await requireTeam();
  const program = await prisma.program.findUnique({
    where: { id: programId },
    select: { status: true },
  });
  if (!program) return;
  await prisma.program.update({
    where: { id: programId },
    data: { status: program.status === "OPEN" ? "CLOSED" : "OPEN" },
  });
  revalidateMarketplace();
  revalidatePath("/marketplace/catalog");
}

function splitTags(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 12);
}
