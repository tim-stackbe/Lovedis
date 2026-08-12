/**
 * Data migration: batch-scoped Match-Matrices (feature: batch-matrices).
 *
 * Turns the single global matrix into one matrix per batch. Existing data (the
 * global PartnerStartupMatch cells) is wrapped into ONE default batch so nothing
 * is lost, and every partner/startup that appears in those cells becomes a
 * member of that batch.
 *
 * This project manages its schema with `prisma db push` (no migrations/ folder).
 * The only non-additive change is PartnerStartupMatch.batchId becoming a
 * REQUIRED column on a populated table, so we bootstrap it as NULLABLE via raw
 * SQL, backfill it, set NOT NULL, THEN run `prisma db push` to create the join
 * tables + FK + unique-key swap and drop the retired MatrixShare table.
 *
 * Idempotent: safe to re-run. Additive to existing data.
 *
 * Usage:
 *   DATABASE_URL=<target> npx tsx prisma/migrate-batch-matrices.ts
 *   (override the default batch name via BATCH_NAME=…)
 */
import { execSync } from "node:child_process";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const BATCH_NAME = process.env.BATCH_NAME ?? "Love Disruption 2026";

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL is required.");

  console.log("Batch-Matrizen-Migration wird angewandt…");

  // 1) Bootstrap the required column as NULLABLE + the new enum + type column
  //    via raw SQL, so we can backfill before enforcing NOT NULL.
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BatchType') THEN
        CREATE TYPE "BatchType" AS ENUM ('ACCELERATOR', 'INDUSTRIEPROGRAMM', 'SONSTIGES');
      END IF;
    END $$;
  `);
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "ScoutingCampaign" ADD COLUMN IF NOT EXISTS "type" "BatchType" NOT NULL DEFAULT 'SONSTIGES';`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "PartnerStartupMatch" ADD COLUMN IF NOT EXISTS "batchId" TEXT;`
  );

  // 2) Find-or-create the default batch that captures all existing cells.
  const orphanCount = Number(
    (
      (await prisma.$queryRawUnsafe(
        `SELECT COUNT(*)::int AS c FROM "PartnerStartupMatch" WHERE "batchId" IS NULL;`
      )) as { c: number }[]
    )[0]?.c ?? 0
  );

  let defaultBatch = await prisma.scoutingCampaign.findFirst({
    where: { name: BATCH_NAME },
    select: { id: true },
  });
  if (!defaultBatch) {
    defaultBatch = await prisma.scoutingCampaign.create({
      data: {
        name: BATCH_NAME,
        type: "ACCELERATOR",
        description:
          "Automatisch angelegter Standard-Batch für die bestehende Match-Matrix.",
      },
      select: { id: true },
    });
    console.log(`→ Standard-Batch angelegt: ${BATCH_NAME}`);
  } else {
    console.log(`→ Standard-Batch vorhanden: ${BATCH_NAME}`);
  }

  // 3) Stamp all still-unassigned cells with the default batch, then enforce.
  await prisma.$executeRawUnsafe(
    `UPDATE "PartnerStartupMatch" SET "batchId" = $1 WHERE "batchId" IS NULL;`,
    defaultBatch.id
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "PartnerStartupMatch" ALTER COLUMN "batchId" SET NOT NULL;`
  );
  console.log(`→ ${orphanCount} bestehende Zellen dem Standard-Batch zugeordnet.`);

  // 4) Reconcile the rest of the schema (join tables, FK, unique-key swap, drop
  //    MatrixShare). batchId is now populated + NOT NULL, so this succeeds.
  console.log("→ prisma db push (Join-Tabellen, FK, Unique-Key, Drop MatrixShare)…");
  execSync(`npx prisma db push --accept-data-loss --url "${dbUrl}"`, {
    stdio: "inherit",
    env: process.env,
  });

  // 5) Backfill batch membership from the existing cells: every partner/startup
  //    that has a cell in the default batch becomes a member of it.
  const [partnerIds, startupIds] = await Promise.all([
    prisma.partnerStartupMatch.findMany({
      where: { batchId: defaultBatch.id },
      select: { partnerId: true },
      distinct: ["partnerId"],
    }),
    prisma.partnerStartupMatch.findMany({
      where: { batchId: defaultBatch.id },
      select: { startupId: true },
      distinct: ["startupId"],
    }),
  ]);

  for (const { partnerId } of partnerIds) {
    const pc = await prisma.partnerCompany.findUnique({
      where: { id: partnerId },
      select: { sortOrder: true },
    });
    await prisma.batchPartner.upsert({
      where: {
        batchId_partnerCompanyId: {
          batchId: defaultBatch.id,
          partnerCompanyId: partnerId,
        },
      },
      update: {},
      create: {
        batchId: defaultBatch.id,
        partnerCompanyId: partnerId,
        sortOrder: pc?.sortOrder ?? 0,
      },
    });
  }

  for (const { startupId } of startupIds) {
    await prisma.batchStartup.upsert({
      where: { batchId_startupId: { batchId: defaultBatch.id, startupId } },
      update: {},
      create: { batchId: defaultBatch.id, startupId },
    });
  }

  console.log(
    `Fertig: Batch "${BATCH_NAME}" — ${startupIds.length} Startups, ${partnerIds.length} Partner, ${await prisma.partnerStartupMatch.count({ where: { batchId: defaultBatch.id } })} Zellen.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
