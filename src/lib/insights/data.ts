import type { EngagementStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { resolvePartnerCompany, type InsightsDataset } from "@/lib/insights/metrics";

// ---------------------------------------------------------------------------
// Read-only loader for KPI-Insights. Pulls the KPI-relevant columns from the
// existing tools in one go; the metric functions in ./metrics.ts do the rest
// in memory (the data volume is a few hundred rows per table). Free-text notes
// are deliberately NOT selected so they can never leak into exports.
// ---------------------------------------------------------------------------

/** PipelineTracking columns used for KPIs; free-text fields stay out. */
export const TRACKING_STRUCTURED_SELECT = {
  id: true,
  track: true,
  startupId: true,
  partnerCompanyId: true,
  batchId: true,
  challengeId: true,
  engagementId: true,
  stage: true,
  introByLovedisOn: true,
  pilotStartOn: true,
  loiOn: true,
  contractOn: true,
  firstRevenueOn: true,
  revenueEur: true,
  supportIntensity: true,
  ndaSigned: true,
  ipAgreement: true,
  coInnovationAgreement: true,
  startOn: true,
  endOn: true,
  costPartnerEur: true,
  costLovedisEur: true,
  costStartupEur: true,
  outcome: true,
} as const;

export async function loadInsightsDataset(): Promise<InsightsDataset> {
  const [
    batches,
    batchStartups,
    batchPartners,
    partners,
    startups,
    matches,
    engagements,
    challenges,
    applications,
    bookings,
    reportingMeta,
    tracking,
    batchChallenges,
  ] = await Promise.all([
    prisma.scoutingCampaign.findMany({
      select: { id: true, name: true, type: true, startDate: true, endDate: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.batchStartup.findMany({ select: { batchId: true, startupId: true } }),
    prisma.batchPartner.findMany({
      select: { batchId: true, partnerCompanyId: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.partnerCompany.findMany({
      select: { id: true, name: true, slug: true, companyId: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.startup.findMany({
      select: {
        id: true,
        name: true,
        industry: true,
        city: true,
        teamSize: true,
        sourceType: true,
      },
    }),
    prisma.partnerStartupMatch.findMany({
      select: {
        batchId: true,
        partnerId: true,
        startupId: true,
        startupRelevance: true,
        partnerRelevance: true,
        contactStatus: true,
        useCaseTypes: true,
        startupFollowUp: true,
        partnerFollowUp: true,
      },
    }),
    prisma.engagement.findMany({
      select: {
        id: true,
        title: true,
        startupId: true,
        status: true,
        startDate: true,
        createdAt: true,
        partner: { select: { companyId: true, company: true } },
      },
    }),
    prisma.challenge.findMany({
      select: {
        id: true,
        title: true,
        status: true,
        createdBy: { select: { companyId: true, company: true } },
      },
    }),
    prisma.challengeApplication.findMany({
      select: {
        challengeId: true,
        startupId: true,
        status: true,
        poc: { select: { status: true } },
      },
    }),
    prisma.marketplaceBooking.findMany({
      select: {
        startupId: true,
        status: true,
        offeringType: true,
        creditCost: true,
        fixCreditCost: true,
        createdAt: true,
      },
    }),
    prisma.startupReportingMeta.findMany({
      select: {
        startupId: true,
        hessenBased: true,
        foundersTotal: true,
        foundersFemale: true,
        teamTotal: true,
        teamFemale: true,
        fteBaseline: true,
        fteBaselineOn: true,
        fteCurrent: true,
        fteCurrentOn: true,
        maturityStart: true,
        maturityCurrent: true,
        preFounding: true,
        followOnRound: true,
        followOnRoundOn: true,
        evidence: true,
      },
    }),
    prisma.pipelineTracking.findMany({ select: TRACKING_STRUCTURED_SELECT }),
    prisma.batchChallengeLink.findMany({ select: { batchId: true, challengeId: true } }),
  ]);

  return {
    batches,
    batchStartups,
    batchPartners: batchPartners.map((bp) => ({
      batchId: bp.batchId,
      partnerId: bp.partnerCompanyId,
    })),
    partners: partners.map(({ id, name, slug }) => ({ id, name, slug })),
    startups,
    matches,
    engagements: engagements.map(({ partner, ...e }) => ({
      ...e,
      ...resolvePartnerCompany(partner, partners),
    })),
    challenges: challenges.map(({ createdBy, ...c }) => ({
      ...c,
      ...resolvePartnerCompany(createdBy, partners),
    })),
    applications: applications.map(({ poc, ...a }) => ({
      ...a,
      pocStatus: poc?.status ?? null,
    })),
    bookings: bookings.map(({ creditCost, fixCreditCost, ...b }) => ({
      ...b,
      credits: creditCost + fixCreditCost,
    })),
    reportingMeta,
    tracking,
    batchChallenges,
  };
}

export interface InsightsFormOptions {
  startups: { id: string; name: string }[];
  partners: { id: string; name: string }[];
  batches: { id: string; name: string }[];
  challenges: { id: string; title: string }[];
  engagements: { id: string; title: string; startupId: string }[];
}

/** Select options for the Phase 2 forms (read-only). */
export async function loadInsightsFormOptions(): Promise<InsightsFormOptions> {
  const [startups, partners, batches, challenges, engagements] = await Promise.all([
    prisma.startup.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.partnerCompany.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.scoutingCampaign.findMany({ select: { id: true, name: true }, orderBy: { createdAt: "desc" } }),
    prisma.challenge.findMany({ select: { id: true, title: true }, orderBy: { createdAt: "desc" } }),
    prisma.engagement.findMany({
      select: { id: true, title: true, startupId: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return { startups, partners, batches, challenges, engagements };
}

/** Full tracking row including free text, for the edit form only. */
export async function loadTrackingEntry(id: string) {
  return prisma.pipelineTracking.findUnique({ where: { id } });
}

export interface LinkedEngagement {
  id: string;
  title: string;
  status: EngagementStatus;
  startDate: Date | null;
  endDate: Date | null;
  kpis: { name: string; target: string; current: string; unit: string }[];
  milestones: { title: string; dueDate: string; done: boolean }[];
}

function jsonList(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((v): v is Record<string, unknown> => Boolean(v) && typeof v === "object")
    : [];
}

const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));

/** Read-only view of a linked engagement (shown, never edited, in tracking). */
export async function loadLinkedEngagement(id: string): Promise<LinkedEngagement | null> {
  const e = await prisma.engagement.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      status: true,
      startDate: true,
      endDate: true,
      kpis: true,
      milestones: true,
    },
  });
  if (!e) return null;
  return {
    ...e,
    kpis: jsonList(e.kpis).map((k) => ({
      name: str(k.name),
      target: str(k.target),
      current: str(k.current),
      unit: str(k.unit),
    })),
    milestones: jsonList(e.milestones).map((m) => ({
      title: str(m.title),
      dueDate: str(m.dueDate),
      done: m.done === true,
    })),
  };
}

/** Latest snapshot day and number of stored rows (history indicator). */
export async function loadSnapshotStatus(): Promise<{
  lastTakenOn: Date | null;
  firstTakenOn: Date | null;
  rows: number;
}> {
  const [last, first, rows] = await Promise.all([
    prisma.metricSnapshot.findFirst({
      orderBy: { takenOn: "desc" },
      select: { takenOn: true },
    }),
    prisma.metricSnapshot.findFirst({
      orderBy: { takenOn: "asc" },
      select: { takenOn: true },
    }),
    prisma.metricSnapshot.count(),
  ]);
  return {
    lastTakenOn: last?.takenOn ?? null,
    firstTakenOn: first?.takenOn ?? null,
    rows,
  };
}
