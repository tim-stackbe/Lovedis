import type { Metadata } from "next";
import { InviteEmployeeForm } from "@/components/companies/CompanyControls";
import { CompanyMembers } from "@/components/companies/CompanyMembers";
import { BannerStat, Card } from "@/components/ui/Card";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { requireOwnCompanyManager } from "@/lib/company-guards";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage() {
  const { actor } = await requireOwnCompanyManager();
  const companyId = actor.companyId;

  const [company, members, invitations] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId } }),
    prisma.user.findMany({
      where: { companyId },
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
      where: { companyId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const activeCount = members.filter((m) => m.isActive).length;

  return (
    <>
      <HeroBanner
        kicker={company?.name ?? "Team"}
        title="Team verwalten"
        subtitle="Lade Kolleg:innen ein, vergib Rollen und verwalte den Zugang deines Unternehmens."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:max-w-xl">
          <BannerStat label="Mitarbeiter:innen" value={members.length} />
          <BannerStat label="Aktiv" value={activeCount} />
          <BannerStat label="Offene Einladungen" value={invitations.length} />
        </div>
      </HeroBanner>

      <section className="space-y-4">
        <SectionLabel number="01" label="Einladen" title="Neue:r Mitarbeiter:in" />
        <Card className="p-6">
          <InviteEmployeeForm companyId={companyId} />
        </Card>
      </section>

      <section className="space-y-4">
        <SectionLabel number="02" label="Verwalten" title="Team" />
        <CompanyMembers
          companyId={companyId}
          members={members.map((m) => ({
            ...m,
            companyRole: m.companyRole ?? "MEMBER",
          }))}
          invitations={invitations}
          currentUserId={actor.userId}
        />
      </section>
    </>
  );
}
