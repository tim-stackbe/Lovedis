import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import {
  MentorCreateForm,
  OfferingCreateForm,
  ProgramCreateForm,
} from "@/components/marketplace/CatalogForms";
import { CatalogToggle } from "@/components/marketplace/CatalogToggle";
import {
  ProgramStatusBadge,
  SupportCategoryBadge,
} from "@/components/shared/badges";
import { Card } from "@/components/ui/Card";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { requireTeam } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Marktplatz-Katalog" };

export default async function MarketplaceCatalogPage() {
  await requireTeam();

  const [programs, mentors, offerings] = await Promise.all([
    prisma.program.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.mentorProfile.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.supportOffering.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  return (
    <>
      <Link
        href="/marketplace"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-lv-secondary hover:text-lv-blue"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zur Inbox
      </Link>

      <HeroBanner
        kicker="Marktplatz"
        title="Katalog-Pflege"
        subtitle="Lege Programme, Mentor:innen und Support-Angebote an, pflege Credit-Preise und schalte Einträge sichtbar."
      />

      {/* Programme ---------------------------------------------------------- */}
      <SectionLabel number="01" label="Programme" title="Exklusive Programme" />
      <Card className="p-6">
        <ProgramCreateForm />
      </Card>
      {programs.length > 0 && (
        <Card className="divide-y divide-lv-border">
          {programs.map((p) => (
            <div
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-lv-text">{p.title}</span>
                  <ProgramStatusBadge value={p.status} />
                </div>
                <p className="mt-0.5 text-sm text-lv-secondary">{p.summary}</p>
              </div>
              <CatalogToggle id={p.id} kind="program" active={p.status === "OPEN"} />
            </div>
          ))}
        </Card>
      )}

      {/* Mentor:innen ------------------------------------------------------- */}
      <SectionLabel number="02" label="Mentor:innen" title="Mentor:innen-Netzwerk" />
      <Card className="p-6">
        <MentorCreateForm />
      </Card>
      {mentors.length > 0 && (
        <Card className="divide-y divide-lv-border">
          {mentors.map((m) => (
            <div
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-lv-text">{m.name}</span>
                  <span className="text-xs font-semibold text-lv-blue">
                    {m.creditCost} Credits
                  </span>
                  {!m.isActive && (
                    <span className="text-xs text-lv-secondary">(inaktiv)</span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-lv-secondary">
                  {[m.role, m.company].filter(Boolean).join(" · ")}
                </p>
              </div>
              <CatalogToggle id={m.id} kind="mentor" active={m.isActive} />
            </div>
          ))}
        </Card>
      )}

      {/* Support-Angebote --------------------------------------------------- */}
      <SectionLabel
        number="03"
        label="Support"
        title="Individuelle Support-Angebote"
      />
      <Card className="p-6">
        <OfferingCreateForm />
      </Card>
      {offerings.length > 0 && (
        <Card className="divide-y divide-lv-border">
          {offerings.map((o) => (
            <div
              key={o.id}
              className="flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-lv-text">{o.title}</span>
                  <SupportCategoryBadge value={o.category} />
                  <span className="text-xs font-semibold text-lv-blue">
                    {o.creditCost} Credits
                  </span>
                  {!o.isActive && (
                    <span className="text-xs text-lv-secondary">(inaktiv)</span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-lv-secondary">{o.summary}</p>
              </div>
              <CatalogToggle id={o.id} kind="offering" active={o.isActive} />
            </div>
          ))}
        </Card>
      )}
    </>
  );
}
