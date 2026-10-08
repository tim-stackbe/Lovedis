/**
 * Data migration: two-sided Match-Matrix (feature: two-sided-matrix).
 *
 * This project manages its schema with `prisma db push` (no migrations/ folder),
 * so this script mirrors prisma/migrate-company-accounts.ts: it first pushes the
 * additive schema, then backfills. Additive only — no columns/data are dropped.
 *
 * New schema (all additive):
 *   • PartnerStartupMatch.startup*  (self-service startup side)
 *   • PartnerStartupMatch.partner*  (self-service partner side)
 *   • PartnerCompany.companyId (→ Company, unique, SetNull)
 *   • model MatrixShare (team → single partner longlist share)
 *
 * Backfill (idempotent — safe to re-run):
 *   The pre-existing team-curated columns (useCaseTypes / useCaseNote /
 *   contactStatus) were captured from the startup-perspective master sheet, so
 *   we seed the STARTUP side from them where the startup side is still empty.
 *   Nothing on the partner side is invented (partners fill it themselves).
 *
 * Run order for an existing (local/dev or Neon) database:
 *   1. Deploy the updated prisma/schema.prisma + src code.
 *   2. DATABASE_URL=<target> npx tsx prisma/migrate-two-sided-matrix.ts
 *
 * Fresh installs don't need this: `prisma db push` already adds the columns.
 */
import { execSync } from "node:child_process";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Two-sided-Matrix-Migration wird angewandt…");

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL is required.");

  // 1) Push the additive schema (new columns + MatrixShare).
  // --accept-data-loss: the only "warning" is adding a UNIQUE on the brand-new,
  // all-null PartnerCompany.companyId column, which is safe. All other changes
  // are purely additive (new nullable columns + new MatrixShare table).
  console.log("→ prisma db push (fügt Matrix-Spalten + MatrixShare hinzu)…");
  execSync(`npx prisma db push --accept-data-loss --url "${dbUrl}"`, {
    stdio: "inherit",
    env: process.env,
  });

  // 2) Backfill the startup side from the team-curated master columns, but only
  //    where the startup side is still empty (so re-runs never clobber input).
  const cells = await prisma.partnerStartupMatch.findMany({
    select: {
      id: true,
      useCaseTypes: true,
      useCaseNote: true,
      contactStatus: true,
      startupUseCaseTypes: true,
      startupUseCaseNote: true,
      startupContacted: true,
    },
  });

  let seeded = 0;
  for (const c of cells) {
    const needsSeed =
      c.startupUseCaseTypes.length === 0 &&
      c.startupUseCaseNote === null &&
      c.startupContacted === null;
    if (!needsSeed) continue;

    await prisma.partnerStartupMatch.update({
      where: { id: c.id },
      data: {
        startupUseCaseTypes: c.useCaseTypes,
        startupUseCaseNote: c.useCaseNote,
        startupContacted: c.contactStatus !== "NONE",
      },
    });
    seeded++;
  }

  console.log(`Fertig: ${seeded}/${cells.length} Zellen mit Startup-Seite befüllt.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
