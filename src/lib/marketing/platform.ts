import { prisma } from "@/lib/prisma";
import type { Window } from "./metrics";

// ---------------------------------------------------------------------------
// Platform KPIs for the Marketing Dashboard: what marketing ultimately drives
// (new accounts, applications, bookings), counted straight from our own DB.
// Counts only, no names or contact data.
// ---------------------------------------------------------------------------

export const PLATFORM_KPI_KEYS = [
  "accounts",
  "activeUsers",
  "startups",
  "applications",
  "bookings",
  "updates",
] as const;
export type PlatformKpiKey = (typeof PLATFORM_KPI_KEYS)[number];

export const PLATFORM_KPI_LABELS: Record<PlatformKpiKey, { label: string; hint: string }> = {
  accounts: { label: "Neue Konten", hint: "Startups, Partner und Investoren, ohne LOVEDIS-Team" },
  activeUsers: { label: "Aktive Nutzer", hint: "mindestens ein Login im Zeitraum (externe Konten)" },
  startups: { label: "Neue Startups", hint: "neu angelegte Startup-Profile" },
  applications: { label: "Challenge-Bewerbungen", hint: "eingegangene Bewerbungen auf Challenges" },
  bookings: { label: "Venture-Store-Anfragen", hint: "Buchungsanfragen für Programme, Mentoring und Support" },
  updates: { label: "Startup-Updates", hint: "von Startups veröffentlichte Updates" },
};

export interface PlatformKpi {
  key: PlatformKpiKey;
  current: number;
  /** null when the previous window cannot be counted (last login is overwritten). */
  previous: number | null;
}

const EXTERNAL_ROLES = ["STARTUP", "BUSINESS_PARTNER", "INVESTOR"] as const;

function range(w: Window) {
  return { gt: w.from, lte: w.to };
}

async function countWindow(w: Window) {
  const created = range(w);
  const [accounts, startups, applications, bookings, updates] = await Promise.all([
    prisma.user.count({ where: { createdAt: created, role: { in: [...EXTERNAL_ROLES] } } }),
    prisma.startup.count({ where: { createdAt: created } }),
    prisma.challengeApplication.count({ where: { createdAt: created } }),
    prisma.marketplaceBooking.count({ where: { createdAt: created } }),
    prisma.startupUpdate.count({ where: { createdAt: created } }),
  ]);
  return { accounts, startups, applications, bookings, updates };
}

export async function loadPlatformKpis(current: Window, previous: Window): Promise<PlatformKpi[]> {
  const [now, before, activeUsers] = await Promise.all([
    countWindow(current),
    countWindow(previous),
    prisma.user.count({
      where: { lastLoginAt: range(current), role: { in: [...EXTERNAL_ROLES] }, isActive: true },
    }),
  ]);
  return [
    { key: "accounts", current: now.accounts, previous: before.accounts },
    { key: "activeUsers", current: activeUsers, previous: null },
    { key: "startups", current: now.startups, previous: before.startups },
    { key: "applications", current: now.applications, previous: before.applications },
    { key: "bookings", current: now.bookings, previous: before.bookings },
    { key: "updates", current: now.updates, previous: before.updates },
  ];
}
