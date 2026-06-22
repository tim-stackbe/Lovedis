import type {
  ApplicationStatus,
  ChallengeStatus,
  PoCStatus,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { daysSince, daysUntil } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Partner success aggregation — shared by the Partner-Cockpit (Feature 1) and
// the Scouting-Analytics dashboard (Feature 3). A "partner" is a User with
// role BUSINESS_PARTNER; everything about them is derived from the challenges
// they created and the applications / PoCs hanging off those challenges.
// ---------------------------------------------------------------------------

/** A running PoC older than this (days since last update) is flagged stale. */
export const STALE_POC_DAYS = 7;
/** An active challenge whose deadline is within this window is "expiring". */
export const CHALLENGE_EXPIRY_DAYS = 14;

export type ActionTone = "attention" | "warn" | "info" | "success";
export type ActionMarker = "yellow" | "orange" | "blue" | "mint";

export interface NextAction {
  tone: ActionTone;
  marker: ActionMarker;
  text: string;
  href?: string;
}

export interface PartnerSignals {
  totalChallenges: number;
  openChallenges: number;
  pendingApplications: number;
  runningPoCs: number;
  stalePoCs: number;
  expiringChallenges: number;
}

// Minimal shapes the pure computation depends on (decoupled from Prisma).
interface PocLike {
  title: string;
  status: PoCStatus;
  updatedAt: Date;
}
interface AppLike {
  status: ApplicationStatus;
  poc: PocLike | null;
}
interface ChallengeLike {
  id: string;
  title: string;
  status: ChallengeStatus;
  deadline: Date | null;
  applications: AppLike[];
}

const ACTIVE_STATUSES: ChallengeStatus[] = ["OPEN", "IN_REVIEW"];

export function computePartnerSignals(challenges: ChallengeLike[]): PartnerSignals {
  let pendingApplications = 0;
  let runningPoCs = 0;
  let stalePoCs = 0;
  let expiringChallenges = 0;

  for (const c of challenges) {
    for (const a of c.applications) {
      if (a.status === "PENDING") pendingApplications += 1;
      if (a.poc?.status === "RUNNING") {
        runningPoCs += 1;
        if (daysSince(a.poc.updatedAt) >= STALE_POC_DAYS) stalePoCs += 1;
      }
    }
    if (ACTIVE_STATUSES.includes(c.status) && c.deadline) {
      const until = daysUntil(c.deadline);
      if (until !== null && until >= 0 && until <= CHALLENGE_EXPIRY_DAYS) {
        expiringChallenges += 1;
      }
    }
  }

  return {
    totalChallenges: challenges.length,
    openChallenges: challenges.filter((c) => c.status === "OPEN").length,
    pendingApplications,
    runningPoCs,
    stalePoCs,
    expiringChallenges,
  };
}

/** Builds the prioritised "Nächste Aktion"-Liste for a single partner. */
export function buildNextActions(challenges: ChallengeLike[]): NextAction[] {
  const actions: NextAction[] = [];

  for (const c of challenges) {
    const pending = c.applications.filter((a) => a.status === "PENDING").length;
    if (pending > 0) {
      actions.push({
        tone: "attention",
        marker: "yellow",
        text:
          pending === 1
            ? `1 Bewerbung wartet auf Sichtung — „${c.title}“`
            : `${pending} Bewerbungen warten auf Sichtung — „${c.title}“`,
        href: `/challenges/${c.id}`,
      });
    }
  }

  for (const c of challenges) {
    for (const a of c.applications) {
      if (a.poc?.status === "RUNNING") {
        const stale = daysSince(a.poc.updatedAt);
        if (stale >= STALE_POC_DAYS) {
          actions.push({
            tone: "warn",
            marker: "orange",
            text: `PoC „${a.poc.title}“ seit ${stale} Tagen ohne Update`,
          });
        }
      }
    }
  }

  for (const c of challenges) {
    if (ACTIVE_STATUSES.includes(c.status) && c.deadline) {
      const until = daysUntil(c.deadline);
      if (until !== null && until >= 0 && until <= CHALLENGE_EXPIRY_DAYS) {
        actions.push({
          tone: "info",
          marker: "blue",
          text:
            until === 0
              ? `Challenge „${c.title}“ läuft heute ab`
              : `Challenge „${c.title}“ läuft in ${until} ${until === 1 ? "Tag" : "Tagen"} ab`,
          href: `/challenges/${c.id}`,
        });
      }
    }
  }

  return actions;
}

export type PartnerCockpit = NonNullable<
  Awaited<ReturnType<typeof getPartnerCockpit>>
>;

/** Full per-partner command-center payload, or null if not a partner. */
export async function getPartnerCockpit(partnerId: string) {
  const partner = await prisma.user.findFirst({
    where: { id: partnerId, role: "BUSINESS_PARTNER" },
    select: { id: true, name: true, company: true, email: true, createdAt: true },
  });
  if (!partner) return null;

  const challenges = await prisma.challenge.findMany({
    where: { createdById: partnerId },
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { applications: true } },
      applications: {
        orderBy: { createdAt: "desc" },
        include: {
          startup: {
            select: { id: true, name: true, industry: true, logoUrl: true },
          },
          poc: true,
        },
      },
    },
  });

  // Intro-requests "tied to" the partner: intros for any startup that has
  // applied to one of this partner's challenges (if applicable).
  const startupIds = [
    ...new Set(
      challenges.flatMap((c) => c.applications.map((a) => a.startupId))
    ),
  ];
  const intros = startupIds.length
    ? await prisma.introRequest.findMany({
        where: { startupId: { in: startupIds } },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        select: {
          id: true,
          status: true,
          createdAt: true,
          conversationId: true,
          investor: { select: { name: true, company: true } },
          startup: { select: { id: true, name: true, logoUrl: true } },
        },
      })
    : [];

  const signals = computePartnerSignals(challenges);
  const nextActions = buildNextActions(challenges);

  return { partner, challenges, intros, signals, nextActions };
}

export interface PartnerListEntry {
  id: string;
  name: string;
  company: string | null;
  signals: PartnerSignals;
  openActions: number;
}

/** Overview of every partner with rolled-up signals (used by the list + analytics). */
export async function listPartnersWithSignals(): Promise<PartnerListEntry[]> {
  const partners = await prisma.user.findMany({
    where: { role: "BUSINESS_PARTNER" },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      company: true,
      challenges: {
        select: {
          id: true,
          title: true,
          status: true,
          deadline: true,
          applications: {
            select: { status: true, poc: { select: { title: true, status: true, updatedAt: true } } },
          },
        },
      },
    },
  });

  return partners.map((p) => {
    const signals = computePartnerSignals(p.challenges);
    return {
      id: p.id,
      name: p.name,
      company: p.company,
      signals,
      openActions:
        signals.pendingApplications + signals.stalePoCs + signals.expiringChallenges,
    };
  });
}
