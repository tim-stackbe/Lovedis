import type {
  ApplicationStatus,
  IntroStatus,
  PoCStatus,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { APPLICATION_STATUS_LABELS, POC_STATUS_LABELS } from "@/lib/constants";
import { listPartnersWithSignals, type PartnerListEntry } from "@/lib/partners";
import { daysSince } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Read-only scouting funnel & throughput analytics (Feature 3). Everything is
// aggregated from existing data; all queries fan out via Promise.all.
// ---------------------------------------------------------------------------

export interface FunnelStep {
  name: string;
  value: number;
}

export interface ScoutingAnalytics {
  funnel: FunnelStep[];
  applicationStatus: FunnelStep[];
  pocStatus: FunnelStep[];
  totals: {
    challenges: number;
    openChallenges: number;
    startups: number;
    applications: number;
    evaluations: number;
    introRequests: number;
    pocs: number;
  };
  rates: {
    /** Accepted ÷ decided applications, in %. */
    acceptanceRate: number;
    /** PoCs ÷ accepted applications, in %. */
    pocConversion: number;
    /** Distinct evaluated startups ÷ all startups, in %. */
    evaluationCoverage: number;
    /** Connected intros ÷ all intros, in %. */
    introConnectRate: number;
  };
  throughput: {
    /** Avg. days from intro request to a team decision. */
    avgIntroResponseDays: number | null;
    /** Running PoCs that have not been updated in a while. */
    stalePoCs: number;
    pendingApplications: number;
    openIntros: number;
  };
  partners: PartnerListEntry[];
}

export async function getScoutingAnalytics(): Promise<ScoutingAnalytics> {
  const [
    challenges,
    openChallenges,
    startups,
    applications,
    appGroups,
    evaluations,
    evaluatedStartups,
    introGroups,
    introRequests,
    handledIntros,
    pocs,
    pocGroups,
    runningPoCs,
    partners,
  ] = await Promise.all([
    prisma.challenge.count(),
    prisma.challenge.count({ where: { status: "OPEN" } }),
    prisma.startup.count(),
    prisma.challengeApplication.count(),
    prisma.challengeApplication.groupBy({ by: ["status"], _count: true }),
    prisma.evaluation.count(),
    prisma.evaluation.findMany({
      distinct: ["startupId"],
      select: { startupId: true },
    }),
    prisma.introRequest.groupBy({ by: ["status"], _count: true }),
    prisma.introRequest.count(),
    prisma.introRequest.findMany({
      where: { status: { not: "PENDING" } },
      select: { createdAt: true, updatedAt: true },
    }),
    prisma.poCPerformance.count(),
    prisma.poCPerformance.groupBy({ by: ["status"], _count: true }),
    prisma.poCPerformance.findMany({
      where: { status: "RUNNING" },
      select: { updatedAt: true },
    }),
    listPartnersWithSignals(),
  ]);

  const appCount = (s: ApplicationStatus) =>
    appGroups.find((g) => g.status === s)?._count ?? 0;
  const introCount = (s: IntroStatus) =>
    introGroups.find((g) => g.status === s)?._count ?? 0;
  const pocCount = (s: PoCStatus) =>
    pocGroups.find((g) => g.status === s)?._count ?? 0;

  const accepted = appCount("ACCEPTED");
  const rejected = appCount("REJECTED");
  const decided = accepted + rejected;

  const avgIntroResponseDays =
    handledIntros.length > 0
      ? Math.round(
          (handledIntros.reduce(
            (sum, i) =>
              sum +
              (new Date(i.updatedAt).getTime() -
                new Date(i.createdAt).getTime()),
            0
          ) /
            handledIntros.length /
            (1000 * 60 * 60 * 24)) *
            10
        ) / 10
      : null;

  return {
    funnel: [
      { name: "Bewerbungen", value: applications },
      { name: "Bewertungen", value: evaluations },
      { name: "Intro-Anfragen", value: introRequests },
      { name: "PoCs", value: pocs },
    ],
    applicationStatus: (
      ["PENDING", "ACCEPTED", "REJECTED"] as ApplicationStatus[]
    ).map((s) => ({ name: APPLICATION_STATUS_LABELS[s], value: appCount(s) })),
    pocStatus: (
      ["PLANNED", "RUNNING", "COMPLETED", "CANCELLED"] as PoCStatus[]
    ).map((s) => ({ name: POC_STATUS_LABELS[s], value: pocCount(s) })),
    totals: {
      challenges,
      openChallenges,
      startups,
      applications,
      evaluations,
      introRequests,
      pocs,
    },
    rates: {
      acceptanceRate: decided > 0 ? Math.round((accepted / decided) * 100) : 0,
      pocConversion: accepted > 0 ? Math.round((pocs / accepted) * 100) : 0,
      evaluationCoverage:
        startups > 0
          ? Math.round((evaluatedStartups.length / startups) * 100)
          : 0,
      introConnectRate:
        introRequests > 0
          ? Math.round((introCount("CONNECTED") / introRequests) * 100)
          : 0,
    },
    throughput: {
      avgIntroResponseDays,
      stalePoCs: runningPoCs.filter((p) => daysSince(p.updatedAt) >= 7).length,
      pendingApplications: appCount("PENDING"),
      openIntros: introCount("PENDING") + introCount("APPROVED"),
    },
    partners,
  };
}
