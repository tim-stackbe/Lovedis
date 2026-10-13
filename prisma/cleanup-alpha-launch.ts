/**
 * Alpha launch cutover: removes all partner and startup accounts plus their
 * dependent data from the platform.
 *
 * Removed:
 *   • BUSINESS_PARTNER / STARTUP users except the QA test accounts
 *   • All Startup records except the QA test startup
 *   • All Company / PartnerCompany records except "Test Partner (QA)"
 *   • All matrix, collaboration, marketplace, messaging, evaluation data
 *     tied to removed partners/startups (full dependent wipe first)
 *
 * Kept:
 *   • ADMIN, MEMBER, and INVESTOR users (internal team + investors)
 *   • partner.test@lovedis.de + startup.test@lovedis.de (QA test logins)
 *   • "Test Partner (QA)" company + "Test Startup (QA)" profile
 *
 * SAFETY: no-op unless CONFIRM_ALPHA_CLEANUP=1. Always back up first (pg_dump)
 * before running against production.
 *
 * Usage:
 *   CONFIRM_ALPHA_CLEANUP=1 DATABASE_URL=<target> npx tsx prisma/cleanup-alpha-launch.ts
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const ROLES_TO_REMOVE = ["BUSINESS_PARTNER", "STARTUP"] as const;

const KEEP_USER_EMAILS = new Set([
  "partner.test@lovedis.de",
  "startup.test@lovedis.de",
]);

const KEEP_COMPANY_NAME = "Test Partner (QA)";
const KEEP_STARTUP_NAME = "Test Startup (QA)";

async function wipeDependentContent() {
  // Bookings/credits (reference startups/programs/users).
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

  // Ecosystem + scoring + challenges.
  await prisma.introRequest.deleteMany({});
  await prisma.startupFollow.deleteMany({});
  await prisma.startupUpdate.deleteMany({});
  await prisma.sharedScoring.deleteMany({});
  await prisma.score.deleteMany({});
  await prisma.evaluation.deleteMany({});
  await prisma.poCPerformance.deleteMany({});
  await prisma.challengeApplication.deleteMany({});
  await prisma.challenge.deleteMany({});

  // Partner/startup collaboration signals.
  await prisma.checkInReminder.deleteMany({});
  await prisma.startupPush.deleteMany({});
  await prisma.partnerStartupReview.deleteMany({});
  await prisma.engagement.deleteMany({});

  // Match-matrix data (partner columns + cells + votes + batch links).
  await prisma.partnerVote.deleteMany({});
  await prisma.partnerStartupMatch.deleteMany({});
  await prisma.batchPartner.deleteMany({});
  await prisma.batchStartup.deleteMany({});
  await prisma.partnerCompany.deleteMany({
    where: { name: { not: KEEP_COMPANY_NAME } },
  });

  // SSOT content library.
  await prisma.roadmapItem.deleteMany({});
  await prisma.contentPage.deleteMany({});
  await prisma.mediaAsset.deleteMany({});
  await prisma.knowledgeResource.deleteMany({});

  // Startup children not covered above.
  await prisma.contact.deleteMany({});
  await prisma.attachment.deleteMany({});
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  if (process.env.CONFIRM_ALPHA_CLEANUP !== "1") {
    console.log(
      "Abbruch: destruktiver Alpha-Cleanup. Setze CONFIRM_ALPHA_CLEANUP=1, um wirklich zu löschen."
    );
    return;
  }

  console.log("Alpha-Cleanup: entferne Partner- und Startup-Konten (Admin bleibt)…");

  const [usersToRemove, usersToKeep] = await Promise.all([
    prisma.user.findMany({
      where: {
        role: { in: [...ROLES_TO_REMOVE] },
        email: { notIn: [...KEEP_USER_EMAILS] },
      },
      select: { id: true, email: true, role: true },
    }),
    prisma.user.findMany({
      where: {
        OR: [
          { role: { notIn: [...ROLES_TO_REMOVE] } },
          { email: { in: [...KEEP_USER_EMAILS] } },
        ],
      },
      select: { id: true, email: true, role: true },
    }),
  ]);

  console.log(
    `Lösche ${usersToRemove.length} Nutzer (${ROLES_TO_REMOVE.join(", ")}). ` +
      `Behalte ${usersToKeep.length} Nutzer (ADMIN/MEMBER/INVESTOR).`
  );
  for (const u of usersToRemove) {
    console.log(`  - ${u.role.padEnd(16)} ${u.email}`);
  }
  for (const u of usersToKeep) {
    console.log(`  ✓ ${u.role.padEnd(16)} ${u.email}`);
  }

  await wipeDependentContent();

  const deletedStartups = await prisma.startup.deleteMany({
    where: { name: { not: KEEP_STARTUP_NAME } },
  });
  const deletedCompanies = await prisma.company.deleteMany({
    where: { name: { not: KEEP_COMPANY_NAME } },
  });
  const deletedCampaigns = await prisma.scoutingCampaign.deleteMany({});
  const deletedUsers = await prisma.user.deleteMany({
    where: {
      role: { in: [...ROLES_TO_REMOVE] },
      email: { notIn: [...KEEP_USER_EMAILS] },
    },
  });

  console.log(
    `Gelöscht: ${deletedUsers.count} Nutzer, ${deletedStartups.count} Startups, ` +
      `${deletedCompanies.count} Partner-Firmen, ${deletedCampaigns.count} Batches/Kampagnen.`
  );

  const [users, startups, companies, partnerCols] = await Promise.all([
    prisma.user.findMany({
      select: { email: true, role: true },
      orderBy: { role: "asc" },
    }),
    prisma.startup.count(),
    prisma.company.count(),
    prisma.partnerCompany.count(),
  ]);

  console.log(
    `Verbleibend: ${users.length} Nutzer, ${startups} Startups, ${companies} Firmen, ${partnerCols} Matrix-Spalten.`
  );
  for (const u of users) {
    console.log(`  ✓ ${u.role.padEnd(16)} ${u.email}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
