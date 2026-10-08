/**
 * Links each real match-matrix PartnerCompany (a matrix column) to a real
 * Company login account, so that partner people can be invited via the existing
 * company invite flow and then self-service their matrix column at /matrix.
 *
 * Idempotent: find-or-creates one Company per PartnerCompany (by name) and sets
 * PartnerCompany.companyId. No users are created — the platform admin invites the
 * first partner person (as OWNER) through /companies/[id] afterwards.
 *
 * Usage:
 *   DATABASE_URL=<target> npx tsx prisma/link-partner-companies.ts
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");

  const partnerCompanies = await prisma.partnerCompany.findMany({
    select: { id: true, name: true, companyId: true },
  });

  let created = 0;
  let linked = 0;

  for (const pc of partnerCompanies) {
    if (pc.companyId) {
      // Already linked — make sure the target Company still exists.
      const exists = await prisma.company.findUnique({
        where: { id: pc.companyId },
        select: { id: true },
      });
      if (exists) continue;
    }

    // Reuse an existing Company that is already this partner's column, else a
    // same-named unlinked Company, else create a fresh one.
    let company = await prisma.company.findFirst({
      where: { matrixColumn: { id: pc.id } },
      select: { id: true },
    });
    if (!company) {
      company = await prisma.company.findFirst({
        where: { name: pc.name, matrixColumn: null },
        select: { id: true },
      });
    }
    if (!company) {
      company = await prisma.company.create({
        data: { name: pc.name },
        select: { id: true },
      });
      created++;
    }

    await prisma.partnerCompany.update({
      where: { id: pc.id },
      data: { companyId: company.id },
    });
    linked++;
  }

  console.log(
    `Fertig: ${linked} Partner verknüpft (${created} Company-Konten neu angelegt).`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
