import type { PrismaClient } from "@/generated/prisma/client";
import type { MatchUseCaseType, RelevanceLevel } from "@/generated/prisma/enums";
import { MATCH_USE_CASE_TYPES } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Partner-side vote aggregation.
//
// Every active member of a partner company casts one vote per (batch, partner,
// startup). The individual votes are aggregated into the partner side of the
// PartnerStartupMatch cell shown across the matrix:
//   • outcome ("Interesse")  → majority of "Ja" (ties count as positiv)
//   • relevance (heatmap)    → the most-common Relevanz (ties favour the higher)
//   • use-cases              → the union of all voters' use-cases
//   • follow-up / contacted  → true if ANY voter marked it
// The pure `aggregatePartnerVotes` holds the rules (unit-tested); the
// `recompute…` helper persists the aggregate cache back onto the match row.
// ---------------------------------------------------------------------------

/** One partner member's vote, reduced to the fields that affect the aggregate. */
export interface PartnerVoteLike {
  interested: boolean | null;
  relevance: RelevanceLevel | null;
  useCaseTypes: MatchUseCaseType[];
  followUp: boolean | null;
  contacted: boolean | null;
}

export interface PartnerAggregate {
  votesYes: number;
  votesNo: number;
  /** Majority "Ja" (ties = positiv); null when nobody voted Ja/Nein yet. */
  interested: boolean | null;
  relevance: RelevanceLevel | null;
  useCaseTypes: MatchUseCaseType[];
  followUp: boolean | null;
  contacted: boolean | null;
}

// Highest → lowest, so ties in the relevance mode favour the higher level.
const RELEVANCE_ORDER: RelevanceLevel[] = ["HIGH", "MEDIUM", "LOW"];

export function aggregatePartnerVotes(
  votes: PartnerVoteLike[]
): PartnerAggregate {
  let votesYes = 0;
  let votesNo = 0;
  const relevanceCount: Partial<Record<RelevanceLevel, number>> = {};
  const useCaseSet = new Set<MatchUseCaseType>();
  let followUp = false;
  let contacted = false;

  for (const v of votes) {
    if (v.interested === true) votesYes++;
    else if (v.interested === false) votesNo++;
    if (v.relevance) {
      relevanceCount[v.relevance] = (relevanceCount[v.relevance] ?? 0) + 1;
    }
    for (const uc of v.useCaseTypes) useCaseSet.add(uc);
    if (v.followUp === true) followUp = true;
    if (v.contacted === true) contacted = true;
  }

  const decided = votesYes + votesNo;
  const interested = decided === 0 ? null : votesYes >= votesNo;

  let relevance: RelevanceLevel | null = null;
  let best = 0;
  for (const level of RELEVANCE_ORDER) {
    const count = relevanceCount[level] ?? 0;
    if (count > best) {
      best = count;
      relevance = level;
    }
  }

  return {
    votesYes,
    votesNo,
    interested,
    relevance,
    useCaseTypes: MATCH_USE_CASE_TYPES.filter((uc) => useCaseSet.has(uc)),
    followUp: votes.length ? followUp : null,
    contacted: votes.length ? contacted : null,
  };
}

/**
 * Recomputes the partner-side aggregate for one pairing from its PartnerVote
 * rows and persists it onto the PartnerStartupMatch cache (creating the match
 * row if it does not exist yet). Call after every vote insert/update/delete.
 */
export async function recomputePartnerAggregate(
  db: PrismaClient,
  key: { batchId: string; partnerId: string; startupId: string }
): Promise<PartnerAggregate> {
  const votes = await db.partnerVote.findMany({
    where: key,
    select: {
      interested: true,
      relevance: true,
      useCaseTypes: true,
      followUp: true,
      contacted: true,
      updatedAt: true,
    },
  });

  const agg = aggregatePartnerVotes(votes);
  const latest = votes.reduce<Date | null>(
    (acc, v) => (!acc || v.updatedAt > acc ? v.updatedAt : acc),
    null
  );

  const data = {
    partnerRelevance: agg.relevance,
    partnerUseCaseTypes: agg.useCaseTypes,
    partnerUseCaseNote: null,
    partnerFollowUp: agg.followUp,
    partnerOpenQuestions: null,
    partnerNotes: null,
    partnerContacted: agg.contacted,
    partnerInterested: agg.interested,
    partnerVotesYes: agg.votesYes,
    partnerVotesNo: agg.votesNo,
    partnerUpdatedAt: latest,
    partnerUpdatedById: null,
  };

  await db.partnerStartupMatch.upsert({
    where: { batchId_partnerId_startupId: key },
    update: data,
    create: { ...key, ...data },
  });

  return agg;
}
