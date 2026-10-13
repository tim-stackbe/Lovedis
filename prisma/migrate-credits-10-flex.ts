/**
 * Data migration (28.09.2026): switch existing startups from the 6 FIX + 6 FLEX
 * onboarding split to 10 FLEX credits (no FIX bucket anymore).
 *
 * Per account that received the 6/6 split onboarding grant and has not been
 * migrated yet, writes ledger ADJUSTMENTs so the ledger stays the source of
 * truth:
 *   • FIX  −(remaining fixBalance)     → fixBalance 0
 *   • FLEX +(10 − 6)                   → flexBalance +4
 * and updates the cached balances in the same transaction. Idempotent: an
 * account that already has the migration ADJUSTMENT is skipped.
 *
 * Dry run by default. Write with --apply:
 *   DATABASE_URL=<target> npx tsx prisma/migrate-credits-10-flex.ts           # preview
 *   DATABASE_URL=<target> npx tsx prisma/migrate-credits-10-flex.ts --apply   # write
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { ONBOARDING_FLEX_CREDITS } from "../src/lib/credit-buckets";
import { ONBOARDING_CREDIT_REASON } from "../src/lib/onboarding-credits";

const LEGACY_FLEX_GRANT = 6;
const MIGRATION_REASON = "Umstellung auf 10 Venture Credits (alle flexibel)";
const APPLY = process.argv.includes("--apply");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const flexTopUp = ONBOARDING_FLEX_CREDITS - LEGACY_FLEX_GRANT;
  const accounts = await prisma.creditAccount.findMany({
    select: {
      id: true,
      balance: true,
      fixBalance: true,
      flexBalance: true,
      startup: { select: { name: true } },
      transactions: {
        where: {
          OR: [
            { type: "ADJUSTMENT", reason: MIGRATION_REASON },
            {
              type: "GRANT",
              bucket: "FIX",
              reason: { startsWith: ONBOARDING_CREDIT_REASON },
            },
          ],
        },
        select: { type: true },
      },
    },
  });

  let migrated = 0;
  let skipped = 0;
  for (const a of accounts) {
    const alreadyMigrated = a.transactions.some((t) => t.type === "ADJUSTMENT");
    const hadSplitGrant = a.transactions.some((t) => t.type === "GRANT");
    if (alreadyMigrated || !hadSplitGrant) {
      skipped++;
      continue;
    }

    const fixAdj = -a.fixBalance;
    const after = {
      fixBalance: 0,
      flexBalance: a.flexBalance + flexTopUp,
      balance: a.flexBalance + flexTopUp,
    };
    console.log(
      `${APPLY ? "→" : "(dry run)"} ${a.startup.name}: ` +
        `fix ${a.fixBalance}→0, flex ${a.flexBalance}→${after.flexBalance}, ` +
        `gesamt ${a.balance}→${after.balance}`
    );
    if (!APPLY) {
      migrated++;
      continue;
    }

    await prisma.$transaction(async (tx) => {
      if (fixAdj !== 0) {
        await tx.creditTransaction.create({
          data: {
            accountId: a.id,
            type: "ADJUSTMENT",
            bucket: "FIX",
            amount: fixAdj,
            reason: MIGRATION_REASON,
          },
        });
      }
      await tx.creditTransaction.create({
        data: {
          accountId: a.id,
          type: "ADJUSTMENT",
          bucket: "FLEX",
          amount: flexTopUp,
          reason: MIGRATION_REASON,
        },
      });
      // Guarded on the balances read above so a concurrent change aborts.
      const updated = await tx.creditAccount.updateMany({
        where: {
          id: a.id,
          fixBalance: a.fixBalance,
          flexBalance: a.flexBalance,
        },
        data: after,
      });
      if (updated.count !== 1) {
        throw new Error(`Konto ${a.id} wurde parallel geändert — abgebrochen.`);
      }
    });
    migrated++;
  }

  console.log(
    `${APPLY ? "Fertig" : "Testlauf"}: ${migrated} Konten ${APPLY ? "umgestellt" : "würden umgestellt"}, ${skipped} übersprungen.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
