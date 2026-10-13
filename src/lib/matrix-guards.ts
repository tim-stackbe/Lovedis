import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import type { BatchType } from "@/generated/prisma/enums";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ROLE_HOMES } from "@/lib/roles";

// ---------------------------------------------------------------------------
// Match-Matrix self-service authorization.
//
// Two self-service audiences fill their OWN side of the matrix:
//   • Partner (BUSINESS_PARTNER) — resolves to the PartnerCompany that their
//     Company login account is linked to (PartnerCompany.companyId). They edit
//     ONLY their column and never see another partner's votes.
//   • Startup (STARTUP) — resolves to the Startup they own (Startup.ownerUserId
//     = their user id). They edit ONLY their row.
//
// Page guards redirect to the role home when the account isn't wired up yet;
// action guards return a discriminated result so the UI can show a friendly
// message. All checks are enforced server-side.
// ---------------------------------------------------------------------------

export interface PartnerMatrixContext {
  session: Session;
  partnerCompany: { id: string; name: string; slug: string };
}

export interface StartupMatrixContext {
  session: Session;
  startup: { id: string; name: string };
}

/**
 * Resolves the PartnerCompany (matrix column) the current partner user owns,
 * via their Company → PartnerCompany link. Returns null when unauthenticated,
 * not a partner, or the account isn't linked to a matrix column yet.
 */
async function resolvePartnerCompany(): Promise<{
  session: Session;
  partnerCompany: { id: string; name: string; slug: string } | null;
} | null> {
  const session = await auth();
  if (!session?.user) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      role: true,
      isActive: true,
      companyRel: {
        select: {
          matrixColumn: { select: { id: true, name: true, slug: true } },
        },
      },
    },
  });
  if (!user || !user.isActive || user.role !== "BUSINESS_PARTNER") {
    return { session, partnerCompany: null };
  }
  return { session, partnerCompany: user.companyRel?.matrixColumn ?? null };
}

/** Page guard: partner must be linked to a matrix column. */
export async function requireMatrixPartner(): Promise<PartnerMatrixContext> {
  const resolved = await resolvePartnerCompany();
  if (!resolved) redirect("/login");
  const { session, partnerCompany } = resolved;
  if (!partnerCompany) redirect(ROLE_HOMES[session.user.role]);
  return { session, partnerCompany };
}

/** Resolves the Startup owned by the current startup user (or null). */
async function resolveOwnStartup(): Promise<{
  session: Session;
  startup: { id: string; name: string } | null;
} | null> {
  const session = await auth();
  if (!session?.user) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      role: true,
      isActive: true,
      ownedStartup: { select: { id: true, name: true } },
    },
  });
  if (!user || !user.isActive || user.role !== "STARTUP") {
    return { session, startup: null };
  }
  return { session, startup: user.ownedStartup ?? null };
}

/** Page guard: startup user must own a Startup profile. */
export async function requireMatrixStartup(): Promise<StartupMatrixContext> {
  const resolved = await resolveOwnStartup();
  if (!resolved) redirect("/login");
  const { session, startup } = resolved;
  if (!startup) redirect(ROLE_HOMES[session.user.role]);
  return { session, startup };
}

export type MatrixActorResult<T> =
  | { ok: true; ctx: T }
  | { ok: false; error: string };

/** Action guard mirroring requireMatrixPartner (no redirect). */
export async function authorizeMatrixPartner(): Promise<
  MatrixActorResult<PartnerMatrixContext>
> {
  const resolved = await resolvePartnerCompany();
  if (!resolved?.session?.user) return { ok: false, error: "Nicht angemeldet." };
  if (!resolved.partnerCompany) {
    return {
      ok: false,
      error: "Dein Konto ist noch keinem Matrix-Partner zugeordnet.",
    };
  }
  return {
    ok: true,
    ctx: { session: resolved.session, partnerCompany: resolved.partnerCompany },
  };
}

/** Action guard mirroring requireMatrixStartup (no redirect). */
export async function authorizeMatrixStartup(): Promise<
  MatrixActorResult<StartupMatrixContext>
> {
  const resolved = await resolveOwnStartup();
  if (!resolved?.session?.user) return { ok: false, error: "Nicht angemeldet." };
  if (!resolved.startup) {
    return { ok: false, error: "Kein Startup-Profil mit deinem Konto verknüpft." };
  }
  return {
    ok: true,
    ctx: { session: resolved.session, startup: resolved.startup },
  };
}

// --- Batch membership -------------------------------------------------------
//
// A batch defines its own matrix: only its assigned startups (BatchStartup) are
// evaluated by its assigned partner companies (BatchPartner). Membership is the
// single authorization gate for every self-service cell edit.

export interface BatchSummary {
  id: string;
  name: string;
  type: BatchType;
}

/** Batches (programs) a partner company participates in, oldest first. */
export async function batchesForPartner(
  partnerCompanyId: string
): Promise<BatchSummary[]> {
  return prisma.scoutingCampaign.findMany({
    where: { batchPartners: { some: { partnerCompanyId } } },
    orderBy: [{ createdAt: "asc" }],
    select: { id: true, name: true, type: true },
  });
}

/** Batches (programs) a startup is assigned to, oldest first. */
export async function batchesForStartup(
  startupId: string
): Promise<BatchSummary[]> {
  return prisma.scoutingCampaign.findMany({
    where: { batchStartups: { some: { startupId } } },
    orderBy: [{ createdAt: "asc" }],
    select: { id: true, name: true, type: true },
  });
}

/** True when the partner company is a column of the given batch's matrix. */
export async function batchHasPartner(
  batchId: string,
  partnerCompanyId: string
): Promise<boolean> {
  const hit = await prisma.batchPartner.findUnique({
    where: { batchId_partnerCompanyId: { batchId, partnerCompanyId } },
    select: { id: true },
  });
  return Boolean(hit);
}

/** True when the startup is a row of the given batch's matrix. */
export async function batchHasStartup(
  batchId: string,
  startupId: string
): Promise<boolean> {
  const hit = await prisma.batchStartup.findUnique({
    where: { batchId_startupId: { batchId, startupId } },
    select: { id: true },
  });
  return Boolean(hit);
}
