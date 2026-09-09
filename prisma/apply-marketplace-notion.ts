/**
 * Idempotent data sync: brings the Notion-aligned marketplace catalog + the
 * 12-credit onboarding grant into an EXISTING database WITHOUT a full reseed.
 *
 * Same spirit as prisma/migrate-scoring-model.ts: a standalone, idempotent
 * script run against a target DB via DATABASE_URL. Re-running it never
 * duplicates offerings/mentors/programs (upsert by a stable natural key) and
 * never double-grants credits (guard on an existing onboarding GRANT).
 *
 * Writes the dedicated Notion-metadata columns (providerCompany/contactPerson/
 * website/sessionDate on offerings, website on mentors, contactPerson/sessionDate/
 * fixCreditCost on programs). Run AFTER `prisma db push` so the columns exist —
 * or run prisma/migrate-credit-buckets.ts which pushes + backfills first.
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
        contactPerson: p.contactPerson ?? null,
        sessionDate: p.sessionDate ?? null,
        fixCreditCost: p.fixCreditCost,
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
      bio: m.bio ?? null,
      website: m.website ?? null,
      photoUrl: m.photoUrl ?? null,
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
      providerCompany: o.providerCompany ?? null,
      contactPerson: o.contactPerson ?? null,
      website: o.website ?? null,
      sessionDate: o.sessionDate ?? null,
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

  // 3b) PRUNE — remove DB rows that are NO LONGER in the catalog so stale
  // test/demo entries don't linger on a synced DB.
  //
  // Safety model (preserves referential integrity):
  //   • If a MarketplaceBooking still references the row, we DEACTIVATE instead
  //     of delete (offering/mentor: isActive=false; program: status=CLOSED) so
  //     it drops out of the storefront (which filters on isActive / status=OPEN)
  //     while the booking history stays intact.
  //   • If nothing references it, we DELETE it.
  // The prune is strictly scoped to the CURRENT catalog set (by natural key), is
  // idempotent, and never touches rows that are in the catalog — so a future
  // real Notion addition is safe as soon as it lives in marketplace-catalog.ts.
  const catalogProgramTitles = new Set(MARKETPLACE_PROGRAMS.map((p) => p.title));
  const catalogMentorNames = new Set(MARKETPLACE_MENTORS.map((m) => m.name));
  const catalogOfferingKeys = new Set(
    MARKETPLACE_OFFERINGS.map((o) => `${o.category}::${o.title}`)
  );

  let programsDeleted = 0;
  let programsDeactivated = 0;
  const dbPrograms = await prisma.program.findMany({
    select: {
      id: true,
      title: true,
      status: true,
      _count: { select: { bookings: true } },
    },
  });
  for (const p of dbPrograms) {
    if (catalogProgramTitles.has(p.title)) continue;
    if (p._count.bookings > 0) {
      if (p.status !== "CLOSED") {
        await prisma.program.update({
          where: { id: p.id },
          data: { status: "CLOSED" },
        });
      }
      programsDeactivated++;
    } else {
      await prisma.program.delete({ where: { id: p.id } });
      programsDeleted++;
    }
  }

  let mentorsDeleted = 0;
  let mentorsDeactivated = 0;
  const dbMentors = await prisma.mentorProfile.findMany({
    select: {
      id: true,
      name: true,
      isActive: true,
      _count: { select: { bookings: true } },
    },
  });
  for (const m of dbMentors) {
    if (catalogMentorNames.has(m.name)) continue;
    if (m._count.bookings > 0) {
      if (m.isActive) {
        await prisma.mentorProfile.update({
          where: { id: m.id },
          data: { isActive: false },
        });
      }
      mentorsDeactivated++;
    } else {
      await prisma.mentorProfile.delete({ where: { id: m.id } });
      mentorsDeleted++;
    }
  }

  let offeringsDeleted = 0;
  let offeringsDeactivated = 0;
  const dbOfferings = await prisma.supportOffering.findMany({
    select: {
      id: true,
      title: true,
      category: true,
      isActive: true,
      _count: { select: { bookings: true } },
    },
  });
  for (const o of dbOfferings) {
    if (catalogOfferingKeys.has(`${o.category}::${o.title}`)) continue;
    if (o._count.bookings > 0) {
      if (o.isActive) {
        await prisma.supportOffering.update({
          where: { id: o.id },
          data: { isActive: false },
        });
      }
      offeringsDeactivated++;
    } else {
      await prisma.supportOffering.delete({ where: { id: o.id } });
      offeringsDeleted++;
    }
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
  console.log(
    `Prune (nicht mehr im Katalog): ` +
      `Programme ${programsDeleted} gelöscht / ${programsDeactivated} deaktiviert (CLOSED), ` +
      `Mentor:innen ${mentorsDeleted} gelöscht / ${mentorsDeactivated} deaktiviert, ` +
      `Support-Angebote ${offeringsDeleted} gelöscht / ${offeringsDeactivated} deaktiviert.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
