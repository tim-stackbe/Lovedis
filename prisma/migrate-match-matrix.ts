/**
 * Data migration: introduce the Match-Matrix model (see docs/plan-match-matrix.md).
 * Additive only — no existing data is dropped, and the existing
 * PartnerStartupReview (partner screening verdict) is left untouched.
 *
 * This project manages its schema with `prisma db push` (no migrations/ folder).
 * The new schema is purely additive:
 *   • enum RelevanceLevel     { HIGH, MEDIUM, LOW }
 *   • enum MatchUseCaseType   { PILOT, CO_DEVELOPMENT, CUSTOMER_RELATION,
 *                               WHITE_LABEL, TECH_LICENSE, SPARRING }
 *   • enum MatchContactStatus { NONE, IN_CONTACT, FOLLOW_UP, PILOT_AGREED }
 *   • model PartnerCompany       (id, name, slug, sortOrder, …)
 *   • model PartnerStartupMatch  (one row per partner×startup pair)
 *
 * Recommended run order for an existing (local/dev or Neon test) database:
 *   export PATH="$PWD/.tools/node/bin:$PATH"
 *   1. Deploy the new code (updated prisma/schema.prisma + src/lib/*).
 *   2. DATABASE_URL=<target>  npx tsx prisma/migrate-match-matrix.ts   ← this
 *      (runs `prisma db push` to add the enums/tables, then applies the
 *      Match-Matrix seed data idempotently).
 *
 * Fresh installs don't need this: `prisma db push` + `prisma db seed` already
 * create the tables and populate the matrix (prisma/seed.ts calls the same
 * applyMatchMatrix helper).
 *
 * LOCAL ONLY for validation. Do NOT run against production without review.
 * To later apply to the Neon test DB (schema sync is non-destructive):
 *   DATABASE_URL=<neon-test-url> npx tsx prisma/migrate-match-matrix.ts
 */
import { execSync } from "node:child_process";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { applyMatchMatrix } from "../src/lib/match-matrix-import";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Match-Matrix-Migration wird angewandt…");

  // 1) Add the new enums + tables via `prisma db push` (additive, no data loss).
  // Pass the target URL explicitly so the push always hits the SAME database
  // this script connects to (independent of what prisma.config.ts resolves).
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL is required.");
  console.log("→ prisma db push (fügt Match-Matrix-Enums + Tabellen hinzu)…");
  execSync(`npx prisma db push --url "${dbUrl}"`, {
    stdio: "inherit",
    env: process.env,
  });

  // 2) Populate the matrix idempotently (partner companies + cells).
  const teamUser =
    (await prisma.user.findFirst({
      where: { role: { in: ["ADMIN", "MEMBER"] } },
      select: { id: true },
    })) ?? (await prisma.user.findFirst({ select: { id: true } }));

  const result = await applyMatchMatrix(prisma, teamUser?.id ?? null);

  console.log(
    `Fertig: ${result.companies} Partner-Unternehmen, ${result.matches} Zellen ` +
      `für ${result.startupsProcessed} Startups ` +
      `(${result.startupsCreated.length} neu angelegt, ${result.startupsMatched.length} bestehende).`
  );
  console.log(
    `Ohne Daten übersprungen: ${result.skipped.join(", ") || "—"}.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
