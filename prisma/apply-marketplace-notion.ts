/**
 * Idempotent data sync: brings the Notion-aligned marketplace catalog + the
 * 12-credit onboarding grant into an EXISTING database WITHOUT a full reseed.
 *
 * Same spirit as prisma/migrate-scoring-model.ts: a standalone, idempotent
 * script run against a target DB via DATABASE_URL. Re-running it never
 * duplicates offerings/mentors/programs (upsert by a stable natural key) and
 * never double-grants credits (guard on an existing onboarding GRANT).
 *
 * NO schema changes — only existing columns are written. Provider/contact info
 * is embedded in description/bio (see src/lib/marketplace-catalog.ts).
 *
 * Usage (point DATABASE_URL at the target DB first):
 *   export PATH="$PWD/.tools/node/bin:$PATH"
 *   DATABASE_URL=postgres://…  npx tsx prisma/apply-marketplace-notion.ts
 *
 * Data values are the single source of truth in src/lib/marketplace-catalog.ts
 * (shared with prisma/seed.ts). Do NOT run against production without review.
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  MARKETPLACE_MENTORS,
  MARKETPLACE_OFFERINGS,
  MARKETPLACE_PROGRAMS,
} from "../src/lib/marketplace-catalog";
import { grantOnboardingCredits } from "../src/lib/onboarding-credits";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Marktplatz-Katalog (Notion) wird idempotent angewandt…");

  // A creator is required on Program. Use any existing team member/admin; fall
  // back to any user. If there is truly no user, programs are skipped (with a
  // warning) rather than failing the whole sync.
  const creator =
    (await prisma.user.findFirst({
      where: { role: { in: ["ADMIN", "MEMBER"] } },
      select: { id: true },
    })) ?? (await prisma.user.findFirst({ select: { id: true } }));

  // 1) Programs — natural key: title.
  let programUpserts = 0;
  if (!creator) {
    console.warn(
      "Kein User gefunden — Programme werden übersprungen (Program.createdById benötigt einen User)."
    );
  } else {
    for (const p of MARKETPLACE_PROGRAMS) {
      const existing = await prisma.program.findFirst({
        where: { title: p.title },
        select: { id: true },
      });
      const data = {
        summary: p.summary,
        description: p.description,
        focusTags: p.focusTags,
        status: p.status,
        sortOrder: p.sortOrder,
      };
      if (existing) {
        await prisma.program.update({ where: { id: existing.id }, data });
      } else {
        await prisma.program.create({
          data: { title: p.title, ...data, createdById: creator.id },
        });
      }
      programUpserts++;
    }
  }

  // 2) Mentors — natural key: name.
  let mentorUpserts = 0;
  for (const m of MARKETPLACE_MENTORS) {
    const existing = await prisma.mentorProfile.findFirst({
      where: { name: m.name },
      select: { id: true },
    });
    const data = {
      company: m.company,
      role: m.role,
      expertise: m.expertise,
      bio: m.bio,
      creditCost: m.creditCost,
      sortOrder: m.sortOrder,
      isActive: true,
    };
    if (existing) {
      await prisma.mentorProfile.update({ where: { id: existing.id }, data });
    } else {
      await prisma.mentorProfile.create({ data: { name: m.name, ...data } });
    }
    mentorUpserts++;
  }

  // 3) Support offerings — natural key: (title, category).
  let offeringUpserts = 0;
  for (const o of MARKETPLACE_OFFERINGS) {
    const existing = await prisma.supportOffering.findFirst({
      where: { title: o.title, category: o.category },
      select: { id: true },
    });
    const data = {
      summary: o.summary,
      description: o.description,
      format: o.format,
      creditCost: o.creditCost,
      sortOrder: o.sortOrder,
      isActive: true,
    };
    if (existing) {
      await prisma.supportOffering.update({ where: { id: existing.id }, data });
    } else {
      await prisma.supportOffering.create({
        data: { title: o.title, category: o.category, ...data },
      });
    }
    offeringUpserts++;
  }

  // 4) 12-credit onboarding grant for every startup — idempotent (never double).
  const startups = await prisma.startup.findMany({ select: { id: true } });
  let granted = 0;
  for (const s of startups) {
    const didGrant = await grantOnboardingCredits(prisma, s.id, creator?.id);
    if (didGrant) granted++;
  }

  console.log(
    `Fertig: ${programUpserts} Programme, ${mentorUpserts} Mentor:innen, ` +
      `${offeringUpserts} Support-Angebote synchronisiert; ` +
      `${granted}/${startups.length} Startups neu mit 12-Credit-Onboarding versehen ` +
      `(der Rest hatte den Grant bereits).`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
