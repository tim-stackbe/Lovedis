import { prisma } from "@/lib/prisma";
import { isSurveyOpen, type FundingDataset } from "@/lib/insights/funding";

// Read-only loader for the Verwendungsnachweis. Existing tables (Program,
// MarketplaceBooking, MentorProfile, Startup) are only read; free-text answers
// of the feedback survey are not loaded here.

export async function loadFundingDataset(): Promise<FundingDataset> {
  const [scope, programs, programBookings, activeMentors, foundedYears, events, surveys, responses] =
    await Promise.all([
      prisma.fundingScopeItem.findMany({ select: { kind: true, refId: true, format: true } }),
      prisma.program.findMany({
        select: { id: true, title: true, status: true },
        orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      }),
      prisma.marketplaceBooking.findMany({
        where: { programId: { not: null } },
        select: { programId: true, startupId: true, status: true },
      }),
      prisma.mentorProfile.count({ where: { isActive: true } }),
      prisma.startup.findMany({ select: { id: true, foundedYear: true } }),
      prisma.fundingEventCount.findMany({
        select: { id: true, kind: true, title: true, heldOn: true, attendees: true, source: true },
        orderBy: { heldOn: "asc" },
      }),
      prisma.feedbackSurvey.findMany({
        select: {
          id: true,
          title: true,
          scopeKind: true,
          refId: true,
          closesOn: true,
          closedAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.feedbackResponse.findMany({
        select: { surveyId: true, startupId: true, recommend: true, overall: true },
      }),
    ]);

  return {
    scope,
    programs,
    programBookings: programBookings.map((b) => ({ ...b, programId: b.programId! })),
    activeMentors,
    foundedYears: foundedYears.map((s) => ({ startupId: s.id, foundedYear: s.foundedYear })),
    events,
    surveys,
    responses,
  };
}

export interface StartupSurvey {
  id: string;
  title: string;
  scopeName: string;
  open: boolean;
  answered: boolean;
}

/** Surveys the startup takes part in (batch member or program participant). */
export async function surveysForStartup(startupId: string, today: Date = new Date()): Promise<StartupSurvey[]> {
  const [batchLinks, bookings] = await Promise.all([
    prisma.batchStartup.findMany({
      where: { startupId },
      select: { batch: { select: { id: true, name: true } } },
    }),
    prisma.marketplaceBooking.findMany({
      where: { startupId, programId: { not: null }, status: { in: ["CONFIRMED", "COMPLETED"] } },
      select: { program: { select: { id: true, title: true } } },
    }),
  ]);
  const names = new Map<string, string>();
  for (const l of batchLinks) names.set(`BATCH:${l.batch.id}`, l.batch.name);
  for (const b of bookings) if (b.program) names.set(`PROGRAM:${b.program.id}`, b.program.title);
  if (names.size === 0) return [];

  const surveys = await prisma.feedbackSurvey.findMany({
    where: { refId: { in: [...names.keys()].map((k) => k.split(":")[1]) } },
    orderBy: { createdAt: "desc" },
  });
  const inScope = surveys.filter((s) => names.has(`${s.scopeKind}:${s.refId}`));
  const answered = new Set(
    (
      await prisma.feedbackResponse.findMany({
        where: { startupId, surveyId: { in: inScope.map((s) => s.id) } },
        select: { surveyId: true },
      })
    ).map((r) => r.surveyId)
  );
  return inScope.map((s) => ({
    id: s.id,
    title: s.title,
    scopeName: names.get(`${s.scopeKind}:${s.refId}`)!,
    open: isSurveyOpen(s, today),
    answered: answered.has(s.id),
  }));
}
