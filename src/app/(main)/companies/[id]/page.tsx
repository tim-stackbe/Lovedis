import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CompanyEditForm,
  InviteEmployeeForm,
} from "@/components/companies/CompanyControls";
import { CompanyMembers } from "@/components/companies/CompanyMembers";
import { BannerStat, Card } from "@/components/ui/Card";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { requireRole } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Unternehmen verwalten" };

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireRole(["ADMIN"]);
  const { id } = await params;

  const company = await prisma.company.findUnique({ where: { id } });
  if (!company) notFound();

  const [members, invitations, otherCompanies] = await Promise.all([
    prisma.user.findMany({
      where: { companyId: id },
      orderBy: [{ isActive: "desc" }, { companyRole: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        companyRole: true,
        isActive: true,
        lastLoginAt: true,
      },
    }),
    prisma.invitation.findMany({
      where: { companyId: id, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    }),
    prisma.company.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const activeCount = members.filter((m) => m.isActive).length;

  return (
    <>
      <div>
        <Link
          href="/companies"
          className="text-sm font-semibold text-lv-blue hover:underline"
        >
          ← Alle Unternehmen
        </Link>
      </div>

      <HeroBanner
        kicker="Unternehmen"
        title={company.name}
        subtitle="Mitarbeiter:innen, Rollen und Einladungen dieses Unternehmens verwalten."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:max-w-2xl">
          <BannerStat label="Mitarbeiter:innen" value={members.length} />
          <BannerStat label="Aktiv" value={activeCount} />
          <BannerStat label="Offene Einladungen" value={invitations.length} />
          <BannerStat
            label="Sitzplatzlimit"
            value={company.seatLimit ?? "∞"}
          />
        </div>
      </HeroBanner>

      <section className="space-y-4">
        <SectionLabel number="01" label="Stammdaten" title="Unternehmen bearbeiten" />
        <Card className="p-6">
          <CompanyEditForm
            company={{
              id: company.id,
              name: company.name,
              website: company.website,
              seatLimit: company.seatLimit,
              isActive: company.isActive,
            }}
          />
        </Card>
      </section>

      <section className="space-y-4">
        <SectionLabel number="02" label="Einladen" title="Neue:r Mitarbeiter:in" />
        <Card className="p-6">
          <InviteEmployeeForm companyId={company.id} />
        </Card>
      </section>

      <section className="space-y-4">
        <SectionLabel number="03" label="Verwalten" title="Team" />
        <CompanyMembers
          companyId={company.id}
          members={members.map((m) => ({
            ...m,
            companyRole: m.companyRole ?? "MEMBER",
          }))}
          invitations={invitations}
          currentUserId={session.user.id}
          moveCompanies={otherCompanies}
        />
      </section>
    </>
  );
}
