import type { CompanyRole } from "@/generated/prisma/enums";

/** All company-scoped roles, highest → lowest. */
export const ALL_COMPANY_ROLES: CompanyRole[] = ["OWNER", "ADMIN", "MEMBER"];

/** Roles a company OWNER/ADMIN may hand out via invitation (never OWNER). */
export const INVITABLE_COMPANY_ROLES: CompanyRole[] = ["ADMIN", "MEMBER"];

/** Company roles that may manage employees + invitations. */
export const COMPANY_MANAGER_ROLES: CompanyRole[] = ["OWNER", "ADMIN"];

export const COMPANY_ROLE_LABELS: Record<CompanyRole, string> = {
  OWNER: "Inhaber:in",
  ADMIN: "Admin",
  MEMBER: "Mitglied",
};

/** True for company roles allowed to manage their company's team. */
export function isCompanyManager(
  role: CompanyRole | null | undefined
): role is CompanyRole {
  return role === "OWNER" || role === "ADMIN";
}
