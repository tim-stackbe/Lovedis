/**
 * Idempotent data sync: brings the Match-Matrix (5 partner companies + the
 * PartnerStartupMatch cells parsed from prisma/data/match-matrix.csv) into an
 * EXISTING database WITHOUT a full reseed.
 *
 * Same spirit as prisma/apply-marketplace-notion.ts: a standalone, idempotent
 * script run against a target DB via DATABASE_URL. Re-running it never
 * duplicates data — partner companies upsert by slug, sheet startups are
 * find-or-created by name, and each cell upserts on the
 * @@unique([partnerId, startupId]) natural key.
 *
 * Run AFTER the schema exists (`prisma db push`, or run
 * prisma/migrate-match-matrix.ts which pushes first).
 *
 * Usage (point DATABASE_URL at the target DB first):
 *   export PATH="$PWD/.tools/node/bin:$PATH"
 *   DATABASE_URL=postgres://…  npx tsx prisma/apply-match-matrix.ts
 *
 * Data values live in prisma/data/match-matrix.csv + src/lib/match-matrix*.ts
 * (shared with prisma/seed.ts). Do NOT run against production without review.
 * To later apply to the Neon test DB (additive/upsert, non-destructive):
 *   DATABASE_URL=<neon-test-url> npx tsx prisma/apply-match-matrix.ts
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { applyMatchMatrix, ensureBatch } from "../src/lib/match-matrix-import";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Match-Matrix wird idempotent angewandt…");

  // updatedById: any existing team member/admin (fall back to any user, else
  // null — the field is optional).
  const teamUser =
    (await prisma.user.findFirst({
      where: { role: { in: ["ADMIN", "MEMBER"] } },
      select: { id: true },
    })) ?? (await prisma.user.findFirst({ select: { id: true } }));

  const batchId = await ensureBatch(
    prisma,
    process.env.BATCH_NAME ?? "Love Disruption 2026"
  );
  const result = await applyMatchMatrix(prisma, teamUser?.id ?? null, batchId);

  console.log(
    `Fertig: ${result.companies} Partner-Unternehmen synchronisiert; ` +
      `${result.matches} Zellen für ${result.startupsProcessed} Startups ` +
      `(${result.startupsMatched.length} bestehende, ${result.startupsCreated.length} neu angelegt).`
  );
  if (result.startupsCreated.length > 0) {
    console.log(`Neu angelegte Startups: ${result.startupsCreated.join(", ")}.`);
  }
  console.log(
    `Ohne Daten im Sheet (übersprungen): ${result.skipped.join(", ") || "—"}.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
