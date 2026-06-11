import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import { auth } from "@/auth";
import type { UserRole } from "@/generated/prisma/enums";
import { ROLE_HOMES, VENTURE_SCOUT_ROLES } from "@/lib/roles";

/** Ensures a valid session; redirects to /login otherwise. */
export async function requireAuth(): Promise<Session> {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session;
}

/**
 * Ensures the session user has one of the given roles; redirects to the
 * user's role home otherwise.
 */
export async function requireRole(roles: UserRole[]): Promise<Session> {
  const session = await requireAuth();
  if (!roles.includes(session.user.role)) {
    redirect(ROLE_HOMES[session.user.role]);
  }
  return session;
}

/** Venture Scout module gate (ADMIN + MEMBER). */
export async function requireScoutModule(): Promise<Session> {
  return requireRole(VENTURE_SCOUT_ROLES);
}
