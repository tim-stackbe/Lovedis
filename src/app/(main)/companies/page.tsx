import type { Metadata } from "next";
import Link from "next/link";
import { CreateCompanyForm } from "@/components/companies/CompanyControls";
import { Badge } from "@/components/ui/Badge";
import { BannerStat, Card } from "@/components/ui/Card";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { TableCard, Td, Th, THead, Tr } from "@/components/ui/Table";
import { requireRole } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Unternehmen" };

export default async function CompaniesPage() {
  await requireRole(["ADMIN"]);

  const companies = await prisma.company.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: {
      _count: {
        select: {
          members: true,
        },
      },
    },
  });

  const activeMembers = await prisma.user.count({
    where: { companyId: { not: null }, isActive: true },
  });

  return (
    <>
      <HeroBanner
        kicker="Plattform"
        title="Unternehmen"
        subtitle="Verwalte alle Partner-Unternehmen und ihre Mitarbeiter:innen unternehmensübergreifend."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:max-w-xl">
          <BannerStat label="Unternehmen" value={companies.length} />
          <BannerStat
            label="Aktiv"
            value={companies.filter((c) => c.isActive).length}
          />
          <BannerStat label="Mitarbeiter:innen" value={activeMembers} />
        </div>
      </HeroBanner>

      <section className="space-y-4">
        <SectionLabel number="01" label="Erstellen" title="Neues Unternehmen" />
        <Card className="p-6">
          <CreateCompanyForm />
        </Card>
      </section>

      <section className="space-y-4">
        <SectionLabel number="02" label="Verwalten" title="Alle Unternehmen" />
        {companies.length === 0 ? (
          <Card className="p-8 text-center text-sm text-lv-secondary">
            Noch keine Unternehmen angelegt.
          </Card>
        ) : (
          <TableCard>
            <THead>
              <tr>
                <Th>Unternehmen</Th>
                <Th>Mitarbeiter:innen</Th>
                <Th>Status</Th>
                <Th className="text-right">Aktion</Th>
              </tr>
            </THead>
            <tbody>
              {companies.map((c) => (
                <Tr key={c.id} className={!c.isActive ? "opacity-60" : ""}>
                  <Td>
                    <p className="font-semibold">{c.name}</p>
                    {c.website && (
                      <p className="text-xs text-lv-secondary">{c.website}</p>
                    )}
                  </Td>
                  <Td className="text-lv-secondary">{c._count.members}</Td>
                  <Td>
                    {c.isActive ? (
                      <Badge tone="mint">Aktiv</Badge>
                    ) : (
                      <Badge tone="orange">Deaktiviert</Badge>
                    )}
                  </Td>
                  <Td className="text-right">
                    <Link
                      href={`/companies/${c.id}`}
                      className="font-semibold text-lv-blue hover:underline"
                    >
                      Verwalten
                    </Link>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </TableCard>
        )}
      </section>
    </>
  );
}
