/**
 * Backfill migration for partner multi-employee voting.
 *
 * Context: the partner side of the matrix used to be a single set of
 * `partner*` fields on PartnerStartupMatch. It is now an AGGREGATE of individual
 * PartnerVote rows (one per voting employee). This script converts every
 * existing partner-side entry into a first vote attributed to the partner
 * company's owner (or first member), then recomputes the aggregate cache.
 *
 * Prerequisites: the schema must already be in sync (run `prisma db push`
 * first) so the PartnerVote table + partnerInterested/partnerVotesYes/No columns
 * exist. The script is idempotent — an existing vote is never overwritten.
 *
 * Usage: pnpm tsx prisma/migrate-partner-votes.ts
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import type { RelevanceLevel } from "../src/generated/prisma/enums";
import { recomputePartnerAggregate } from "../src/lib/partner-votes";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function hasPartnerData(m: {
  partnerRelevance: RelevanceLevel | null;
  partnerUseCaseTypes: string[];
  partnerUseCaseNote: string | null;
  partnerFollowUp: boolean | null;
  partnerOpenQuestions: string | null;
  partnerNotes: string | null;
  partnerContacted: boolean | null;
}): boolean {
  return (
    m.partnerRelevance !== null ||
    m.partnerUseCaseTypes.length > 0 ||
    Boolean(m.partnerUseCaseNote) ||
    m.partnerFollowUp !== null ||
    Boolean(m.partnerOpenQuestions) ||
    Boolean(m.partnerNotes) ||
    m.partnerContacted !== null
  );
}

// The legacy partner side had no explicit "Interesse"; derive it from Relevanz:
// HIGH/MEDIUM = interested (Ja), LOW = not interested (Nein), none = offen.
function interestedFrom(rel: RelevanceLevel | null): boolean | null {
  if (rel === null) return null;
  return rel !== "LOW";
}

async function main() {
  const matches = await prisma.partnerStartupMatch.findMany({
    select: {
      batchId: true,
      partnerId: true,
      startupId: true,
      partnerRelevance: true,
      partnerUseCaseTypes: true,
      partnerUseCaseNote: true,
      partnerFollowUp: true,
      partnerOpenQuestions: true,
      partnerNotes: true,
      partnerContacted: true,
      partner: {
        select: {
          name: true,
          company: {
            select: {
              members: {
                select: { id: true, companyRole: true },
                orderBy: { createdAt: "asc" },
              },
            },
          },
        },
      },
    },
  });

  let created = 0;
  let recomputed = 0;
  let skippedNoData = 0;
  let skippedNoUser = 0;

  for (const m of matches) {
    if (!hasPartnerData(m)) {
      skippedNoData++;
      continue;
    }
    const members = m.partner.company?.members ?? [];
    if (members.length === 0) {
      skippedNoUser++;
      console.warn(
        `  ⚠︎  Kein Login-Account für Partner "${m.partner.name}" — Alt-Daten bleiben als Aggregat erhalten.`
      );
      continue;
    }
    const voter = members.find((u) => u.companyRole === "OWNER") ?? members[0];

    const key = {
      batchId: m.batchId,
      partnerId: m.partnerId,
      startupId: m.startupId,
    };

    await prisma.partnerVote.upsert({
      where: { batchId_partnerId_startupId_voterId: { ...key, voterId: voter.id } },
      update: {}, // never clobber an already-cast real vote
      create: {
        ...key,
        voterId: voter.id,
        interested: interestedFrom(m.partnerRelevance),
        relevance: m.partnerRelevance,
        useCaseTypes: m.partnerUseCaseTypes,
        useCaseNote: m.partnerUseCaseNote,
        followUp: m.partnerFollowUp,
        openQuestions: m.partnerOpenQuestions,
        notes: m.partnerNotes,
        contacted: m.partnerContacted,
      },
    });
    created++;

    await recomputePartnerAggregate(prisma, key);
    recomputed++;
  }

  console.log("\nPartner-Vote-Backfill abgeschlossen:");
  console.log(`  • Stimmen angelegt/vorhanden: ${created}`);
  console.log(`  • Aggregate neu berechnet:    ${recomputed}`);
  console.log(`  • Übersprungen (keine Daten): ${skippedNoData}`);
  console.log(`  • Übersprungen (kein Login):  ${skippedNoUser}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
