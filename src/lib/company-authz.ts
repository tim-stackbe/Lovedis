import type { CompanyRole, UserRole } from "@/generated/prisma/enums";
import { isCompanyManager } from "@/lib/company-roles";

// ---------------------------------------------------------------------------
// Pure company-management authorization rules — NO IO (no session, DB, or
// framework imports) so they can be unit-tested in isolation and reused by both
// the async server guards and the UI.
// ---------------------------------------------------------------------------

/** The internal LOVEDIS superadmin is the platform-level ADMIN role. */
export function isPlatformAdmin(role: UserRole | null | undefined): boolean {
  return role === "ADMIN";
}

/** The minimal set of actor facts the decision depends on. */
export interface CompanyActorFacts {
  isPlatformAdmin: boolean;
  companyId: string | null;
  companyRole: CompanyRole | null;
  isActive: boolean;
}

/**
 * An actor may manage a given company iff they are an active platform admin OR
 * an active OWNER/ADMIN of that very same company. Everything else is denied —
 * in particular a manager of a *different* company and any MEMBER.
 */
export function canManageCompany(
  actor: CompanyActorFacts,
  targetCompanyId: string
): boolean {
  if (!actor.isActive) return false;
  if (actor.isPlatformAdmin) return true;
  if (!actor.companyId || actor.companyId !== targetCompanyId) return false;
  return isCompanyManager(actor.companyRole);
}
