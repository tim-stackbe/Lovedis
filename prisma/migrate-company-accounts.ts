/**
 * Data migration: introduce Company accounts + company-scoped roles +
 * employee Invitations (feature: company-accounts).
 *
 * This project manages its schema with `prisma db push` (no migrations/ folder),
 * so this script mirrors prisma/migrate-credit-buckets.ts: it first pushes the
 * additive schema, then backfills existing Partner users into a real Company
 * they own. Additive only — no data is dropped.
 *
 * New schema (all additive):
 *   • enum CompanyRole      { OWNER, ADMIN, MEMBER }
 *   • enum InvitationStatus { PENDING, ACCEPTED, REVOKED, EXPIRED }
 *   • model Company, model Invitation
 *   • User.companyId / companyRole / lastLoginAt
 *
 * Backfill (idempotent — safe to re-run):
 *   For every BUSINESS_PARTNER user not yet linked to a Company:
 *     – Group by their legacy free-text `company` (case-insensitive). Partners
 *       sharing a company name land in the SAME Company; partners without a
 *       company text get their own solo Company (named after the user).
 *     – Find-or-create the Company (by name), link the users.
 *     – Guarantee ≥1 OWNER: the earliest-created member becomes OWNER, the rest
 *       MEMBER (unless the company already has an active owner).
 *
 * Run order for an existing (local/dev or Neon test) database:
 *   1. Deploy the updated prisma/schema.prisma + src code.
 *   2. DATABASE_URL=<target> npx tsx prisma/migrate-company-accounts.ts
 *
 * Fresh installs don't need this: `prisma db push` + seed already produce the
 * new tables/columns.
 *
 * LOCAL ONLY for validation. Do NOT run against production without review.
 */
import { execSync } from "node:child_process";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

async function main() {
  console.log("Company-Accounts-Migration wird angewandt…");

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL is required.");

  // 1) Push the additive schema (enums + Company/Invitation + User columns).
  console.log("→ prisma db push (fügt Company/Invitation + neue Spalten hinzu)…");
  execSync(`npx prisma db push --url "${dbUrl}"`, {
    stdio: "inherit",
    env: process.env,
  });

  // 2) Backfill: every partner not yet linked to a Company.
  const partners = await prisma.user.findMany({
    where: { role: "BUSINESS_PARTNER", companyId: null },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, company: true, createdAt: true },
  });

  // Group partners: shared company text → one group; empty text → solo group.
  const groups = new Map<
    string,
    { displayName: string; userIds: string[] }
  >();
  for (const p of partners) {
    const text = p.company?.trim();
    if (text) {
      const key = `name:${normalizeName(text)}`;
      const g = groups.get(key);
      if (g) g.userIds.push(p.id);
      else groups.set(key, { displayName: text, userIds: [p.id] });
    } else {
      // Solo company, named after the user (kept unique by the userId key).
      groups.set(`solo:${p.id}`, {
        displayName: `${p.name} (Einzelkonto)`,
        userIds: [p.id],
      });
    }
  }

  let companiesCreated = 0;
  let usersLinked = 0;
  let ownersPromoted = 0;

  for (const { displayName, userIds } of groups.values()) {
    // Find-or-create the Company by name (idempotent across re-runs).
    let company = await prisma.company.findFirst({
      where: { name: displayName },
    });
    if (!company) {
      company = await prisma.company.create({ data: { name: displayName } });
      companiesCreated++;
    }

    // Link the still-unlinked users as MEMBER first.
    for (const userId of userIds) {
      await prisma.user.update({
        where: { id: userId },
        data: { companyId: company.id, companyRole: "MEMBER" },
      });
      usersLinked++;
    }

    // Guarantee ≥1 active OWNER for this company.
    const existingOwners = await prisma.user.count({
      where: { companyId: company.id, companyRole: "OWNER", isActive: true },
    });
    if (existingOwners === 0) {
      const earliest = await prisma.user.findFirst({
        where: { companyId: company.id },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });
      if (earliest) {
        await prisma.user.update({
          where: { id: earliest.id },
          data: { companyRole: "OWNER" },
        });
        ownersPromoted++;
      }
    }
  }

  console.log(
    `Fertig: ${companiesCreated} Unternehmen angelegt, ${usersLinked} Partner ` +
      `verknüpft, ${ownersPromoted} Inhaber:innen bestimmt.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
