/**
 * Data migration: OLD 7-dimension scoring model → NEW 6-criteria LOVEDIS
 * Challenge matrix (see docs/release-mara.md and src/lib/scoring.ts).
 *
 * This project manages its schema with `prisma db push` (no migrations/ folder),
 * so this script bridges EXISTING data across the enum change WITHOUT dropping
 * evaluations. Run it against the OLD physical database (old enum values still
 * present) BEFORE running `prisma db push`.
 *
 * Recommended order for an existing (e.g. production) database:
 *   1. Deploy the new code (new prisma/schema.prisma + src/lib/scoring.ts).
 *   2. npx tsx prisma/migrate-scoring-model.ts   ← this script
 *   3. npx prisma db push                          (recreates enums with only
 *      the new values + drops Evaluation.potential/feasibility — safe now that
 *      no rows reference the removed enum values)
 *   4. npx prisma generate                         (implicit in `npm run build`)
 *
 * Fresh installs don't need this: just `prisma db push` + `prisma db seed`.
 *
 * Mapping of existing Score rows (clean 1:1 only):
 *   TEAM           → TEAM_EXECUTION
 *   TRACTION       → TRACTION_REFERENCES
 *   MARKET         → MARKET_SCALABILITY
 *   STRATEGIC_FIT  → STRATEGIC_ECOSYSTEM_FIT
 * The genuinely new criteria (CHALLENGE_FIT, MATURITY_FEASIBILITY) are seeded
 * at 0 for re-scoring. Dimensions without a clean mapping (PRODUCT,
 * COMPETITIVE_POSITION, BUSINESS_MODEL) are dropped. `notes` are preserved.
 * Radar fields are remapped: HEALTH_BIO → HEALTH_TECH, INDUSTRY_40 → INDUSTRY.
 * Finally overallScore + recommendation are recomputed with the new engine.
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import type { ScoreDimension } from "../src/generated/prisma/enums";
import { SCORE_DIMENSIONS } from "../src/lib/constants";
import {
  computeOverallScore,
  deriveRecommendation,
  isChallengeFitGated,
  type DimensionScores,
} from "../src/lib/scoring";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function raw(sql: string): Promise<void> {
  await prisma.$executeRawUnsafe(sql);
}

async function main() {
  console.log("Scoring-Modell wird migriert (7 → 6 Kriterien)…");

  // 1) Add the new enum values (autocommit; safe & idempotent).
  for (const v of SCORE_DIMENSIONS) {
    await raw(`ALTER TYPE "ScoreDimension" ADD VALUE IF NOT EXISTS '${v}'`);
  }
  for (const v of ["CONSTRUCTION", "HEALTH_TECH", "INDUSTRY"]) {
    await raw(`ALTER TYPE "RadarQuadrant" ADD VALUE IF NOT EXISTS '${v}'`);
  }

  // 2) Remap Score rows with a clean 1:1 mapping.
  const remap: Record<string, ScoreDimension> = {
    TEAM: "TEAM_EXECUTION",
    TRACTION: "TRACTION_REFERENCES",
    MARKET: "MARKET_SCALABILITY",
    STRATEGIC_FIT: "STRATEGIC_ECOSYSTEM_FIT",
  };
  for (const [oldDim, newDim] of Object.entries(remap)) {
    await raw(
      `UPDATE "Score" SET dimension = '${newDim}' WHERE dimension = '${oldDim}'`
    );
  }

  // 3) Drop dimensions without a clean mapping (re-scored under the new model).
  await raw(
    `DELETE FROM "Score" WHERE dimension IN ('PRODUCT','COMPETITIVE_POSITION','BUSINESS_MODEL')`
  );

  // 4) Seed the two genuinely new criteria at 0 for every evaluation.
  for (const newDim of ["CHALLENGE_FIT", "MATURITY_FEASIBILITY"] as const) {
    await raw(
      `INSERT INTO "Score" (id, "evaluationId", dimension, value, "createdAt", "updatedAt")
       SELECT gen_random_uuid(), e.id, '${newDim}', 0, NOW(), NOW()
       FROM "Evaluation" e
       WHERE NOT EXISTS (
         SELECT 1 FROM "Score" s
         WHERE s."evaluationId" = e.id AND s.dimension = '${newDim}'
       )`
    );
  }

  // 5) Remap the manual technology-radar fields.
  await raw(
    `UPDATE "Startup" SET "radarQuadrant" = 'HEALTH_TECH' WHERE "radarQuadrant" = 'HEALTH_BIO'`
  );
  await raw(
    `UPDATE "Startup" SET "radarQuadrant" = 'INDUSTRY' WHERE "radarQuadrant" = 'INDUSTRY_40'`
  );

  // 6) Recompute overallScore + recommendation for every evaluation using the
  //    new weighted engine + Challenge-Fit gate. Read via raw SQL so it works
  //    regardless of what the generated client's enum currently knows.
  const rows = await prisma.$queryRawUnsafe<
    { evaluationId: string; dimension: string; value: number }[]
  >(`SELECT "evaluationId", dimension, value FROM "Score"`);

  const byEval = new Map<string, DimensionScores>();
  for (const r of rows) {
    const map = byEval.get(r.evaluationId) ?? {};
    map[r.dimension as ScoreDimension] = Number(r.value);
    byEval.set(r.evaluationId, map);
  }

  let updated = 0;
  for (const [evaluationId, scores] of byEval) {
    const overallScore = computeOverallScore(scores);
    const recommendation = deriveRecommendation(
      overallScore,
      isChallengeFitGated(scores)
    );
    await prisma.$executeRawUnsafe(
      `UPDATE "Evaluation" SET "overallScore" = $1, recommendation = $2::"Recommendation" WHERE id = $3`,
      overallScore,
      recommendation,
      evaluationId
    );
    updated++;
  }

  console.log(
    `Fertig: ${byEval.size} Bewertungen neu abgeleitet (${updated} aktualisiert).`
  );
  console.log(
    "Nächster Schritt: `npx prisma db push` (entfernt alte Enum-Werte + potential/feasibility)."
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
