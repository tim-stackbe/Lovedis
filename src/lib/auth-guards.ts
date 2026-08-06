import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import { auth } from "@/auth";
import type { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
  FEED_ROLES,
  MARKETPLACE_ROLES,
  PARTNER_VIEW_ROLES,
  ROLE_HOMES,
  VENTURE_SCOUT_ROLES,
  VENTURE_VIEW_ROLES,
} from "@/lib/roles";

/**
 * Ensures a valid session; redirects to /login otherwise.
 *
 * Beyond checking the JWT cookie, this verifies that the session's user id
 * still references an existing, active row in the database. JWT sessions
 * survive a DB re-seed (which mints fresh user ids), so a stale cookie can
 * otherwise carry an id that no longer exists — any downstream write keyed on
 * `session.user.id` would then crash with a foreign-key violation.
 *
 * An invalid session is sent to /api/session-clear (not straight to /login):
 * the cookie is still cryptographically valid, so middleware would bounce a
 * bare /login redirect back to the role home and loop forever. The clear
 * route deletes the cookie first, so the subsequent /login lands cleanly.
 */
export async function requireAuth(): Promise<Session> {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, isActive: true, role: true },
  });
  if (!user || !user.isActive) redirect("/api/session-clear");

  // The JWT carries a role snapshot from login and only refreshes on re-login.
  // Overwrite it with the freshly-read DB role so privilege changes (e.g. an
  // admin demoted to member) take effect immediately, on the very next request
  // — every downstream `requireRole` then authorizes against the current role.
  session.user.role = user.role;

  return session;
}

/**
 * App-shell gate for the main authenticated layout. On top of `requireAuth`,
 * this blocks self-registered business partners whose account is still pending
 * admin approval (`approvedAt` null) from reaching any partner-facing data and
 * sends them to `/pending`. Kept OUT of `requireAuth` itself so the standalone
 * `/pending` page (which uses `requireAuth`) never redirect-loops.
 */
export async function requireApprovedAccess(): Promise<Session> {
  const session = await requireAuth();
  if (session.user.role === "BUSINESS_PARTNER") {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { approvedAt: true },
    });
    if (!user?.approvedAt) redirect("/pending");
  }
  return session;
}

/**
 * Defense-in-depth check for partner-write actions: returns true unless the
 * user is a business partner still awaiting approval. Non-partners always pass
 * (they are approved at creation).
 */
export async function isPartnerApproved(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { approvedAt: true },
  });
  return user?.approvedAt != null;
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

/** Ecosystem marketplace gate (investors, partners + internal team preview). */
export async function requireMarketplace(): Promise<Session> {
  return requireRole(MARKETPLACE_ROLES);
}

/**
 * Shared ecosystem Feed gate. Same audience as the marketplace PLUS startups —
 * startups may read the feed (official broadcasts + followed-startup updates)
 * but this does NOT grant the other marketplace surfaces (Discover, follow
 * toggle, intro requests), which keep using `requireMarketplace`.
 */
export async function requireFeed(): Promise<Session> {
  return requireRole(FEED_ROLES);
}

/**
 * Internal Lovedis team gate (ADMIN + MEMBER). Used for the screening/SSOT
 * back-office surfaces (longlist, pushes, SSOT-Pflege, credits) that own the
 * curated data partners and startups consume. Distinct from the partner- and
 * startup-facing low-overload views.
 */
export async function requireTeam(): Promise<Session> {
  return requireRole(VENTURE_SCOUT_ROLES);
}

/** Business-partner-only gate (curated, low-overload partner views). */
export async function requirePartner(): Promise<Session> {
  return requireRole(["BUSINESS_PARTNER"]);
}

/** Startup-only gate (venture platform / self-service). */
export async function requireStartup(): Promise<Session> {
  return requireRole(["STARTUP"]);
}

/**
 * Startup-facing Venture Platform / Marktplatz VIEW gate. Startups see it as
 * self-service; the internal team (ADMIN + MEMBER) gets the identical surfaces
 * as a fully-visible "Admin-Sicht" preview and may act on behalf of a startup.
 * Admin must always be able to see everything that is "for startups".
 */
export async function requireVentureView(): Promise<Session> {
  return requireRole(VENTURE_VIEW_ROLES);
}

/**
 * Partner-facing feedback/screening VIEW gate (BUSINESS_PARTNER + ADMIN +
 * MEMBER). Partners use these masks to give feedback (their own verdict); the
 * internal team gets the identical surfaces as a fully-visible "Partner-Sicht –
 * Vorschau". Submission stays partner-only (see `requirePartner` on the verdict
 * action) — the team preview is view-only. Investors and startups stay out.
 */
export async function requirePartnerView(): Promise<Session> {
  return requireRole(PARTNER_VIEW_ROLES);
}
