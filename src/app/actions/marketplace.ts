"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type {
  CreditBucket,
  MarketplaceOfferingType,
  SupportCategory,
} from "@/generated/prisma/enums";
import { firstZodError, type ActionState } from "@/lib/action-state";
import { requireRole, requireTeam } from "@/lib/auth-guards";
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
  // Set only when the internal team books on behalf of a startup ("Admin-Sicht").
  onBehalfStartupId: z.string().trim().min(1).optional(),
});

/**
 * Resolves the catalog target for an offering type and returns the target id
 * field + the snapshotted costs. `creditCost` is the FLEX price (mentor/support);
 * `fixCreditCost` is the FIX consumption (programs only, otherwise 0). Programs
 * never cost FLEX credits but consume from the reserved FIX bucket on enrolment.
 */
async function resolveTarget(
  offeringType: MarketplaceOfferingType,
  targetId: string
): Promise<
  | {
      ok: true;
      data: {
        creditCost: number;
        fixCreditCost: number;
        field: "programId" | "mentorId" | "offeringId";
      };
    }
  | { ok: false; error: string }
> {
  if (offeringType === "PROGRAM") {
    const program = await prisma.program.findUnique({
      where: { id: targetId },
      select: { status: true, fixCreditCost: true },
    });
    if (!program || program.status !== "OPEN") {
      return { ok: false, error: "Programm nicht gefunden." };
    }
    return {
      ok: true,
      data: { creditCost: 0, fixCreditCost: program.fixCreditCost, field: "programId" },
    };
  }
  if (offeringType === "MENTOR_SESSION") {
    const mentor = await prisma.mentorProfile.findUnique({
      where: { id: targetId },
      select: { isActive: true, creditCost: true },
    });
    if (!mentor || !mentor.isActive) {
      return { ok: false, error: "Mentor:in nicht gefunden." };
    }
    return {
      ok: true,
      data: { creditCost: mentor.creditCost, fixCreditCost: 0, field: "mentorId" },
    };
  }
  const offering = await prisma.supportOffering.findUnique({
    where: { id: targetId },
    select: { isActive: true, creditCost: true },
  });
  if (!offering || !offering.isActive) {
    return { ok: false, error: "Angebot nicht gefunden." };
  }
  return {
    ok: true,
    data: { creditCost: offering.creditCost, fixCreditCost: 0, field: "offeringId" },
  };
}

export async function requestBooking(
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  // Startups book for themselves; the internal team (ADMIN/MEMBER) books on
  // behalf of a selected startup from the "Admin-Sicht" preview.
  const session = await requireRole(["ADMIN", "MEMBER", "STARTUP"]);
  const isTeam = session.user.role === "ADMIN" || session.user.role === "MEMBER";

  const parsed = requestSchema.safeParse({
    offeringType: formData.get("offeringType"),
    targetId: formData.get("targetId"),
    message: formData.get("message"),
    contactName: formData.get("contactName"),
    contactEmail: formData.get("contactEmail"),
    preferredAt: formData.get("preferredAt") || undefined,
    onBehalfStartupId: formData.get("onBehalfStartupId") || undefined,
  });
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  const accountSelect = {
    balance: true,
    fixBalance: true,
    flexBalance: true,
  } as const;
  const startup = isTeam
    ? parsed.data.onBehalfStartupId
      ? await prisma.startup.findUnique({
          where: { id: parsed.data.onBehalfStartupId },
          select: { id: true, creditAccount: { select: accountSelect } },
        })
      : null
    : await prisma.startup.findUnique({
        where: { ownerUserId: session.user.id },
        select: { id: true, creditAccount: { select: accountSelect } },
      });
  if (!startup) {
    return {
      error: isTeam
        ? "Bitte wähle das Startup, für das du anfragst."
        : "Lege zuerst dein Startup-Profil an.",
    };
  }

  const resolved = await resolveTarget(parsed.data.offeringType, parsed.data.targetId);
  if (!resolved.ok) return { error: resolved.error };

  const { creditCost, fixCreditCost, field } = resolved.data;

  // Soft per-bucket balance check at request time (no charge yet). Credits are
  // only redeemed on CONFIRMED; the final, authoritative check happens there.
  // Mentor/Support draw FLEX; program enrolment draws the reserved FIX bucket.
  if (creditCost > 0) {
    const flex = startup.creditAccount?.flexBalance ?? 0;
    if (flex < creditCost) {
      return {
        error: `Dein flexibles Guthaben (${flex}) reicht für dieses Angebot (${creditCost} Credits) nicht aus.`,
      };
    }
  }
  if (fixCreditCost > 0) {
    const fix = startup.creditAccount?.fixBalance ?? 0;
    if (fix < fixCreditCost) {
      return {
        error: `Dein Fix-Kontingent (${fix}) reicht für die Anmeldung zu diesem Programm (${fixCreditCost} Credits) nicht aus.`,
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
      fixCreditCost,
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

  // Which bucket the redemption draws from + how much. Program enrolment
  // consumes the reserved FIX contingent; mentor/support draw flexible FLEX.
  const bucket: CreditBucket =
    booking.offeringType === "PROGRAM" ? "FIX" : "FLEX";
  const cost = bucket === "FIX" ? booking.fixCreditCost : booking.creditCost;

  // Cost 0 (inclusive program without a FIX contingent) confirms without ledger.
  if (cost <= 0) {
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
      // Atomically claim the IN_COORDINATION → CONFIRMED transition before
      // touching the ledger. updateMany takes a row lock under Read Committed,
      // so two concurrent confirms can't both pass this gate: the loser sees
      // the row already CONFIRMED (or already linked) and matches 0 rows.
      const claim = await tx.marketplaceBooking.updateMany({
        where: {
          id: bookingId,
          status: "IN_COORDINATION",
          creditTransactionId: null,
        },
        data: { status: "CONFIRMED", handledById: session.user.id },
      });
      if (claim.count !== 1) {
        throw new Error("STALE");
      }

      const account =
        (await tx.creditAccount.findUnique({
          where: { startupId: booking.startupId },
        })) ??
        (await tx.creditAccount.create({ data: { startupId: booking.startupId } }));

      // Atomic, guarded debit scoped to the target bucket: only decrement when
      // that bucket still covers the cost. Two concurrent confirms for the same
      // startup contend on this row; the conditional updateMany matches 0 rows
      // once the bucket would go negative, so credits can never be overspent.
      // The cached total `balance` is decremented in lock-step to preserve the
      // balance == fixBalance + flexBalance invariant.
      const debit = await tx.creditAccount.updateMany({
        where:
          bucket === "FIX"
            ? { id: account.id, fixBalance: { gte: cost } }
            : { id: account.id, flexBalance: { gte: cost } },
        data:
          bucket === "FIX"
            ? { fixBalance: { decrement: cost }, balance: { decrement: cost } }
            : { flexBalance: { decrement: cost }, balance: { decrement: cost } },
      });
      if (debit.count === 0) {
        throw new InsufficientCreditsError();
      }

      const creditTx = await tx.creditTransaction.create({
        data: {
          accountId: account.id,
          type: "SPEND",
          bucket,
          amount: -cost,
          reason: `Marktplatz-Buchung: ${targetName}`,
          createdById: session.user.id,
        },
      });
      // Status was already flipped to CONFIRMED by the atomic claim above; here
      // we only link the freshly created SPEND so the booking carries exactly
      // one ledger transaction.
      await tx.marketplaceBooking.update({
        where: { id: bookingId },
        data: { creditTransactionId: creditTx.id },
      });
    });
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return {
        error:
          bucket === "FIX"
            ? "Das Fix-Kontingent des Startups reicht nicht aus — Bestätigung abgebrochen."
            : "Guthaben des Startups reicht nicht aus — Bestätigung abgebrochen.",
      };
    }
    if (err instanceof Error && err.message === "STALE") {
      return { error: "Status hat sich geändert. Bitte neu laden." };
    }
    throw err;
  }

  revalidateMarketplace();
  return {
    success: `Bestätigt — ${cost} Credits eingelöst.`,
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
  // A completed booking's session already happened — cancelling it would keep
  // the spent credits with no refund path, so block it outright.
  if (booking.status === "COMPLETED") {
    return {
      error: "Abgeschlossene Buchungen können nicht storniert werden.",
    };
  }

  // The refund decision and the cancel transition must happen atomically, or
  // two concurrent cancels of a CONFIRMED booking could each create a refund
  // ADJUSTMENT. We re-read inside the transaction, atomically claim the cancel
  // scoped to the observed status (so only one cancel wins the row lock), and
  // only the winner — if it claimed a paid, CONFIRMED booking — refunds.
  let refunded = false;
  let refundedAmount = 0;
  try {
    await prisma.$transaction(async (tx) => {
      const current = await tx.marketplaceBooking.findUnique({
        where: { id: bookingId },
        select: {
          status: true,
          creditCost: true,
          creditTransactionId: true,
          // Read the linked SPEND to refund exactly what was spent, into the
          // same bucket it came from (FLEX for mentor/support, FIX for program).
          creditTransaction: { select: { bucket: true, amount: true } },
        },
      });
      if (!current) throw new Error("NOT_FOUND");
      if (current.status === "CANCELLED" || current.status === "DECLINED") {
        throw new Error("STALE");
      }
      // Re-checked under the race: never cancel a booking that completed in the
      // meantime (would strand the spent credits with no refund).
      if (current.status === "COMPLETED") {
        throw new Error("COMPLETED");
      }
      // A startup may only cancel before confirmation (re-checked under the
      // race); confirmed cancels are team-only. COMPLETED is already rejected
      // above for everyone.
      if (!isTeam && current.status === "CONFIRMED") {
        throw new Error("FORBIDDEN");
      }

      const claim = await tx.marketplaceBooking.updateMany({
        where: { id: bookingId, status: current.status },
        data: {
          status: "CANCELLED",
          handledById: isTeam ? session.user.id : undefined,
        },
      });
      if (claim.count !== 1) throw new Error("STALE");

      // Refund iff a CONFIRMED booking carries a linked SPEND (covers both the
      // FLEX mentor/support redemptions and the FIX program consumption).
      const spent = current.creditTransaction;
      const needsRefund =
        current.status === "CONFIRMED" &&
        current.creditTransactionId !== null &&
        spent !== null &&
        spent.amount < 0;
      if (needsRefund) {
        const bucket: CreditBucket = spent.bucket;
        const amount = Math.abs(spent.amount);
        const account = await tx.creditAccount.findUnique({
          where: { startupId: booking.startupId },
          select: { id: true },
        });
        if (account) {
          await tx.creditTransaction.create({
            data: {
              accountId: account.id,
              type: "ADJUSTMENT",
              bucket,
              amount,
              reason: "Storno-Rückbuchung: Marktplatz-Buchung",
              createdById: session.user.id,
            },
          });
          await tx.creditAccount.update({
            where: { id: account.id },
            data:
              bucket === "FIX"
                ? { fixBalance: { increment: amount }, balance: { increment: amount } }
                : { flexBalance: { increment: amount }, balance: { increment: amount } },
          });
        }
        refunded = true;
        refundedAmount = amount;
      }
    });
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return { error: "Buchung nicht gefunden." };
    }
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return { error: "Bestätigte Buchungen kann nur das Lovedis-Team stornieren." };
    }
    if (err instanceof Error && err.message === "COMPLETED") {
      return {
        error: "Abgeschlossene Buchungen können nicht storniert werden.",
      };
    }
    if (err instanceof Error && err.message === "STALE") {
      return { error: "Diese Buchung ist bereits abgeschlossen." };
    }
    throw err;
  }

  revalidateMarketplace();
  return refunded
    ? { success: `Storniert — ${refundedAmount} Credits zurückgebucht.` }
    : { success: "Buchung storniert." };
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
