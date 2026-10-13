import { prisma } from "@/lib/prisma";
import { resolvePartnerCompany, type InsightsDataset } from "@/lib/insights/metrics";

// ---------------------------------------------------------------------------
// Read-only loader for KPI-Insights. Pulls the KPI-relevant columns from the
// existing tools in one go; the metric functions in ./metrics.ts do the rest
// in memory (the data volume is a few hundred rows per table). Free-text notes
// are deliberately NOT selected so they can never leak into exports.
// ---------------------------------------------------------------------------

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
