/**
 * Data migration: introduce the FIX/FLEX credit-bucket model + the dedicated
 * marketplace-metadata columns (see docs/plan-marketplace-notion-feedback.md
 * §6.2). Additive only — no data is dropped.
 *
 * This project manages its schema with `prisma db push` (no migrations/ folder).
 * The new schema is purely additive:
 *   • enum CreditBucket { FIX, FLEX }
 *   • CreditTransaction.bucket        (default FLEX)
 *   • CreditAccount.fixBalance/flexBalance (default 0)
 *   • Program.contactPerson/sessionDate/fixCreditCost
 *   • MentorProfile.website
 *   • SupportOffering.providerCompany/contactPerson/website/sessionDate
 *   • MarketplaceBooking.fixCreditCost (default 0)
 *
 * Recommended run order for an existing (local/dev or Neon test) database:
 *   export PATH="$PWD/.tools/node/bin:$PATH"
 *   1. Deploy the new code (updated prisma/schema.prisma + src/lib/*).
 *   2. DATABASE_URL=<target>  npx tsx prisma/migrate-credit-buckets.ts   ← this
 *      (it runs `prisma db push` to add the enum/columns, then backfills).
 *   3. (optional) DATABASE_URL=<target> npx tsx prisma/apply-marketplace-notion.ts
 *      to populate the new metadata columns from src/lib/marketplace-catalog.ts.
 *
 * Fresh installs don't need this: `prisma db push` + `prisma db seed` already
 * produce the split grants + metadata via the shared catalog/onboarding helper.
 *
 * Backfill performed here (idempotent — safe to re-run):
 *   a) Re-split the legacy single "+12" onboarding GRANT (reason exactly
 *      "Onboarding-Guthaben — sponsored by LOVEDIS", amount 12) into a 6-credit
 *      FIX grant + a 6-credit FLEX grant. Any other transaction keeps the schema
 *      default bucket = FLEX.
 *   b) Recompute the cached per-bucket balances (fixBalance/flexBalance) and the
 *      total balance for every account from its ledger, so the cached values
 *      always satisfy balance == fixBalance + flexBalance.
 *
 * LOCAL ONLY for validation. Do NOT run against production without review.
 * To later apply to the Neon test DB (schema-only sync is non-destructive):
 *   DATABASE_URL=<neon-test-url> npx tsx prisma/migrate-credit-buckets.ts
 */
import { execSync } from "node:child_process";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  ONBOARDING_CREDIT_AMOUNT,
  ONBOARDING_CREDIT_REASON,
  ONBOARDING_FIX_REASON,
  ONBOARDING_FLEX_REASON,
} from "../src/lib/onboarding-credits";
import {
  ONBOARDING_FIX_CREDITS,
  ONBOARDING_FLEX_CREDITS,
} from "../src/lib/credit-buckets";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Credit-Bucket-Migration wird angewandt…");

  // 1) Add the new enum + columns via `prisma db push` (additive, no data loss).
  // Pass the target URL explicitly so the push always hits the SAME database
  // this script connects to (independent of what prisma.config.ts resolves).
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL is required.");
  console.log("→ prisma db push (fügt CreditBucket-Enum + neue Spalten hinzu)…");
  execSync(`npx prisma db push --url "${dbUrl}"`, {
    stdio: "inherit",
    env: process.env,
  });

  // 2) Re-split any legacy single "+12" onboarding GRANT into 6 FIX + 6 FLEX.
  const legacyGrants = await prisma.creditTransaction.findMany({
    where: {
      type: "GRANT",
      reason: ONBOARDING_CREDIT_REASON, // exact legacy reason (no bucket suffix)
      amount: ONBOARDING_CREDIT_AMOUNT,
    },
    select: { id: true, accountId: true, createdById: true, createdAt: true },
  });
  let reSplit = 0;
  for (const g of legacyGrants) {
    await prisma.$transaction([
      // Turn the existing +12 row into the FIX half…
      prisma.creditTransaction.update({
        where: { id: g.id },
        data: {
          bucket: "FIX",
          amount: ONBOARDING_FIX_CREDITS,
          reason: ONBOARDING_FIX_REASON,
        },
      }),
      // …and add the matching FLEX half (same account/author/timestamp).
      prisma.creditTransaction.create({
        data: {
          accountId: g.accountId,
          type: "GRANT",
          bucket: "FLEX",
          amount: ONBOARDING_FLEX_CREDITS,
          reason: ONBOARDING_FLEX_REASON,
          createdById: g.createdById,
          createdAt: g.createdAt,
        },
      }),
    ]);
    reSplit++;
  }

  // 3) Recompute cached per-bucket balances from the ledger for every account.
  const accounts = await prisma.creditAccount.findMany({ select: { id: true } });
  let recomputed = 0;
  for (const a of accounts) {
    const [fixAgg, flexAgg] = await Promise.all([
      prisma.creditTransaction.aggregate({
        where: { accountId: a.id, bucket: "FIX" },
        _sum: { amount: true },
      }),
      prisma.creditTransaction.aggregate({
        where: { accountId: a.id, bucket: "FLEX" },
        _sum: { amount: true },
      }),
    ]);
    const fixBalance = fixAgg._sum.amount ?? 0;
    const flexBalance = flexAgg._sum.amount ?? 0;
    await prisma.creditAccount.update({
      where: { id: a.id },
      data: { fixBalance, flexBalance, balance: fixBalance + flexBalance },
    });
    recomputed++;
  }

  console.log(
    `Fertig: ${reSplit} Onboarding-Grants in 6 FIX + 6 FLEX aufgeteilt; ` +
      `${recomputed} Konten-Salden (fix/flex/total) neu berechnet.`
  );
  console.log(
    "Nächster Schritt (optional): `npx tsx prisma/apply-marketplace-notion.ts` " +
      "für die neuen Metadaten-Spalten."
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
