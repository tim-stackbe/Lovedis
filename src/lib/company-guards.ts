import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import { auth } from "@/auth";
import type { CompanyRole, UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { canManageCompany, isPlatformAdmin } from "@/lib/company-authz";
import { isCompanyManager } from "@/lib/company-roles";
import { ROLE_HOMES } from "@/lib/roles";

// ---------------------------------------------------------------------------
// Company-management authorization (session-aware guards).
//
// Two orthogonal dimensions decide access:
//   • Platform role  (UserRole.ADMIN = internal LOVEDIS superadmin)  → all companies.
//   • Company role   (CompanyRole OWNER/ADMIN of the SAME company)   → own company only.
//
// The pure decision rules live in `@/lib/company-authz` (`canManageCompany`,
// `isPlatformAdmin`) and are unit-tested without any DB/session. The helpers
// below wrap them with the real session + membership lookup and are what the
// server actions call. All checks are enforced server-side; the UI mirrors them.
// ---------------------------------------------------------------------------

export { canManageCompany, isPlatformAdmin };

export interface ActorContext {
  userId: string;
  platformRole: UserRole;
  isPlatformAdmin: boolean;
  companyId: string | null;
  companyRole: CompanyRole | null;
  isActive: boolean;
}

/**
 * Loads the current session's actor context (platform role + company
 * membership). Redirects to /login when unauthenticated. Unlike `requireAuth`
 * we read the company fields too, and re-check `isActive` so a just-removed
 * employee is denied on their next request.
 */
export async function loadActor(): Promise<ActorContext> {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      role: true,
      isActive: true,
      companyId: true,
      companyRole: true,
    },
  });
  if (!user || !user.isActive) redirect("/api/session-clear");

  return {
    userId: user.id,
    platformRole: user.role,
    isPlatformAdmin: isPlatformAdmin(user.role),
    companyId: user.companyId,
    companyRole: user.companyRole,
    isActive: user.isActive,
  };
}

/** Result of an action-level authorization check. */
export type CompanyAuthzResult =
  | { ok: true; actor: ActorContext }
  | { ok: false; error: string };

/**
 * Action guard: authorizes managing `targetCompanyId`. Returns a discriminated
 * result instead of redirecting, so server actions can surface a friendly 403
 * message via `ActionState`.
 */
export async function authorizeCompanyManagement(
  targetCompanyId: string
): Promise<CompanyAuthzResult> {
  const actor = await loadActor();
  if (!canManageCompany(actor, targetCompanyId)) {
    return {
      ok: false,
      error: "Keine Berechtigung, dieses Unternehmen zu verwalten.",
    };
  }
  return { ok: true, actor };
}

/** Platform-admin-only action guard (manage ALL companies). */
export async function authorizePlatformAdmin(): Promise<CompanyAuthzResult> {
  const actor = await loadActor();
  if (!actor.isPlatformAdmin) {
    return { ok: false, error: "Nur Plattform-Admins dürfen das." };
  }
  return { ok: true, actor };
}

/**
 * Page guard for the Partner "/team" area: the actor must manage their OWN
 * company (OWNER/ADMIN with a companyId). Platform admins are sent to the
 * cross-company /companies view; everyone else to their role home.
 */
export async function requireOwnCompanyManager(): Promise<{
  session: Session;
  actor: ActorContext & { companyId: string };
}> {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const actor = await loadActor();

  if (actor.isPlatformAdmin) redirect("/companies");
  if (!actor.companyId || !isCompanyManager(actor.companyRole)) {
    redirect(ROLE_HOMES[actor.platformRole]);
  }
  return {
    session,
    actor: { ...actor, companyId: actor.companyId as string },
  };
}

/**
 * Counts the OTHER active owners of a company (excluding `excludeUserId`). Used
 * to enforce the "a company must always keep at least one OWNER" invariant
 * before a remove/demote/deactivate touches the last owner.
 */
export async function countOtherOwners(
  companyId: string,
  excludeUserId: string
): Promise<number> {
  return prisma.user.count({
    where: {
      companyId,
      companyRole: "OWNER",
      isActive: true,
      id: { not: excludeUserId },
    },
  });
}
