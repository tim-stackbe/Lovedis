/**
 * Destructive real-data cutover: removes ALL demo/fake data, keeping ONLY:
 *   • the real admin  (admin@lovedis.dev)
 *   • the real partner Company accounts (those linked to a match-matrix column)
 *     and any real members already invited into them
 *   • the real match-matrix: PartnerCompany columns, the imported Startups that
 *     appear in the matrix, their two-sided PartnerStartupMatch cells and any
 *     MatrixShare longlists
 *
 * Everything else — demo users, demo startups + all their dependent records
 * (evaluations, challenges, applications, PoCs, reviews, pushes, reminders,
 * engagements, follows, intros, messages, credits, bookings), the seeded
 * marketplace catalog and SSOT content, and demo Companies — is deleted. Most
 * of it cascades from the demo User/Startup deletes; the standalone content
 * tables (which hold only demo rows) are wiped explicitly.
 *
 * SAFETY: no-op unless CONFIRM_CLEANUP=1 is set. Always back up first
 * (pg_dump) before running against production.
 *
 * Usage:
 *   CONFIRM_CLEANUP=1 DATABASE_URL=<target> npx tsx prisma/cleanup-demo-data.ts
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const REAL_ADMIN_EMAIL = process.env.REAL_ADMIN_EMAIL ?? "admin@lovedis.dev";

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  if (process.env.CONFIRM_CLEANUP !== "1") {
    console.log(
      "Abbruch: destruktiver Cleanup. Setze CONFIRM_CLEANUP=1, um wirklich zu löschen."
    );
    return;
  }

  console.log("Real-Data-Cutover: entferne alle Demo-Daten…");

  // --- Compute the keep-sets ------------------------------------------------
  const admin = await prisma.user.findFirst({
    where: { email: REAL_ADMIN_EMAIL },
    select: { id: true },
  });
  if (!admin) {
    throw new Error(
      `Real-Admin ${REAL_ADMIN_EMAIL} nicht gefunden — Abbruch (nichts gelöscht).`
    );
  }

  // Real partner Companies = those linked to a match-matrix column.
  const realCompanies = await prisma.company.findMany({
    where: { matrixColumn: { isNot: null } },
    select: { id: true },
  });
  const realCompanyIds = realCompanies.map((c) => c.id);

  const realMembers = await prisma.user.findMany({
    where: { companyId: { in: realCompanyIds } },
    select: { id: true },
  });

  const keepUserIds = new Set<string>([
    admin.id,
    ...realMembers.map((m) => m.id),
  ]);

  // Real startups = those present in the matrix (a cell or a batch membership)
  // plus any owned by a kept user (future real startup accounts).
  const [matchStartups, batchStartups, ownedStartups] = await Promise.all([
    prisma.partnerStartupMatch.findMany({
      select: { startupId: true },
      distinct: ["startupId"],
    }),
    prisma.batchStartup.findMany({
      select: { startupId: true },
      distinct: ["startupId"],
    }),
    prisma.startup.findMany({
      where: { ownerUserId: { in: [...keepUserIds] } },
      select: { id: true },
    }),
  ]);
  const keepStartupIds = new Set<string>([
    ...matchStartups.map((m) => m.startupId),
    ...batchStartups.map((s) => s.startupId),
    ...ownedStartups.map((s) => s.id),
  ]);

  console.log(
    `Behalte: 1 Admin + ${realMembers.length} Partner-Mitglieder, ${realCompanyIds.length} Partner-Firmen, ${keepStartupIds.size} Startups.`
  );

  // --- Wipe the demo-only content tables (no real rows in any of them) ------
  // Bookings/credits first (reference startups/programs/users), then catalog.
  await prisma.marketplaceBooking.deleteMany({});
  await prisma.creditTransaction.deleteMany({});
  await prisma.creditAccount.deleteMany({});
  await prisma.program.deleteMany({});
  await prisma.mentorProfile.deleteMany({});
  await prisma.supportOffering.deleteMany({});

  // Messaging.
  await prisma.message.deleteMany({});
  await prisma.conversationParticipant.deleteMany({});
  await prisma.conversation.deleteMany({});

  // Ecosystem + scoring + challenges (all demo).
  await prisma.introRequest.deleteMany({});
  await prisma.startupFollow.deleteMany({});
  await prisma.startupUpdate.deleteMany({});
  await prisma.sharedScoring.deleteMany({});
  await prisma.score.deleteMany({});
  await prisma.evaluation.deleteMany({});
  await prisma.poCPerformance.deleteMany({});
  await prisma.challengeApplication.deleteMany({});
  await prisma.challenge.deleteMany({});

  // Partner/Startup-SSOT collaboration signals (all demo).
  await prisma.checkInReminder.deleteMany({});
  await prisma.startupPush.deleteMany({});
  await prisma.partnerStartupReview.deleteMany({});
  await prisma.engagement.deleteMany({});

  // SSOT content library (all demo — team re-creates real content later).
  await prisma.roadmapItem.deleteMany({});
  await prisma.contentPage.deleteMany({});
  await prisma.mediaAsset.deleteMany({});
  await prisma.knowledgeResource.deleteMany({});

  // Startup children not covered above.
  await prisma.contact.deleteMany({});
  await prisma.attachment.deleteMany({});

  // --- Delete non-kept startups (cascades any remaining dependents) ---------
  const deletedStartups = await prisma.startup.deleteMany({
    where: { id: { notIn: [...keepStartupIds] } },
  });

  // --- Delete non-kept users (cascades their remaining demo content) --------
  const deletedUsers = await prisma.user.deleteMany({
    where: { id: { notIn: [...keepUserIds] } },
  });

  // --- Delete demo Companies. Real ones are kept. --------------------------
  const deletedCompanies = await prisma.company.deleteMany({
    where: { matrixColumn: { is: null } },
  });

  // Demo scouting campaigns (Startup.campaignId already SetNull).
  const deletedCampaigns = await prisma.scoutingCampaign.deleteMany({});

  console.log(
    `Gelöscht: ${deletedStartups.count} Startups, ${deletedUsers.count} Nutzer, ` +
      `${deletedCompanies.count} Demo-Firmen, ${deletedCampaigns.count} Kampagnen.`
  );

  // --- Verify the real core survived ---------------------------------------
  const [users, companies, startups, matches] = await Promise.all([
    prisma.user.count(),
    prisma.company.count(),
    prisma.startup.count(),
    prisma.partnerStartupMatch.count(),
  ]);
  console.log(
    `Verbleibend: ${users} Nutzer, ${companies} Firmen, ${startups} Startups, ${matches} Matrix-Zellen.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
