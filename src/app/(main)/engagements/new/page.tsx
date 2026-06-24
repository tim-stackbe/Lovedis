import type { Metadata } from "next";
import { EngagementCreateForm } from "@/components/engagements/EngagementCreateForm";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { requireTeam } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Neues Engagement" };

export default async function NewEngagementPage() {
  await requireTeam();

  const [partners, startups] = await Promise.all([
    prisma.user.findMany({
      where: { role: "BUSINESS_PARTNER", isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, company: true },
    }),
    prisma.startup.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <>
      <HeroBanner
        kicker="Zusammenarbeit"
        title="Neues Engagement"
        subtitle="Lege eine Acc-unabhängige Zusammenarbeit zwischen einem Partner und einem Startup an."
      />
      <SectionLabel number="01" label="Anlegen" title="Engagement-Details" />
      <EngagementCreateForm
        partners={partners.map((p) => ({
          id: p.id,
          label: p.company ? `${p.company} — ${p.name}` : p.name,
        }))}
        startups={startups.map((s) => ({ id: s.id, label: s.name }))}
      />
    </>
  );
}
