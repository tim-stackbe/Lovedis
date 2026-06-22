import { Briefcase, Users2 } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { PartnerHealthBadge } from "@/components/partners/PartnerSignals";
import { BannerStat, Card, ToneCard } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { requireRole } from "@/lib/auth-guards";
import { listPartnersWithSignals } from "@/lib/partners";
import { initials } from "@/lib/utils";

export const metadata: Metadata = { title: "Partner-Cockpit" };

export default async function PartnersPage() {
  await requireRole(["ADMIN", "MEMBER"]);

  const partners = await listPartnersWithSignals();

  const totals = partners.reduce(
    (acc, p) => ({
      challenges: acc.challenges + p.signals.totalChallenges,
      pending: acc.pending + p.signals.pendingApplications,
      running: acc.running + p.signals.runningPoCs,
      attention: acc.attention + (p.openActions > 0 ? 1 : 0),
    }),
    { challenges: 0, pending: 0, running: 0, attention: 0 }
  );

  return (
    <>
      <HeroBanner
        kicker="Team-Ops — Sektion 00"
        title="Partner-Erfolgs-Cockpit"
        subtitle="Das Kommandozentrum für jeden Business Partner: Challenges, Bewerbungen, PoCs und die nächsten Aktionen auf einen Blick."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <BannerStat label="Partner" value={partners.length} icon={Briefcase} />
          <BannerStat label="Challenges" value={totals.challenges} />
          <BannerStat label="Offene Bewerbungen" value={totals.pending} />
          <BannerStat label="Laufende PoCs" value={totals.running} />
        </div>
      </HeroBanner>

      <section className="space-y-4">
        <SectionLabel
          number="01"
          label="Puls"
          title="Partner mit Handlungsbedarf"
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <ToneCard
            tone={totals.attention > 0 ? "attention" : "muted"}
            label="Brauchen Aufmerksamkeit"
            value={totals.attention}
            sub="Partner mit offenen Aktionen"
          />
          <ToneCard
            tone={totals.pending > 0 ? "warn" : "muted"}
            label="Bewerbungen offen"
            value={totals.pending}
            sub="warten auf Sichtung"
          />
          <ToneCard
            tone="success"
            label="Laufende PoCs"
            value={totals.running}
            sub="über alle Partner"
          />
        </div>
      </section>

      <section className="space-y-4">
        <SectionLabel number="02" label="Übersicht" title="Alle Partner" />
        {partners.length === 0 ? (
          <EmptyState
            icon={Users2}
            title="Noch keine Business Partner"
            description="Sobald ein Business-Partner-Konto angelegt wurde, erscheint hier sein Cockpit."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {partners.map((p) => (
              <Link key={p.id} href={`/partners/${p.id}`} className="group">
                <Card className="h-full p-5 transition-colors group-hover:border-lv-secondary/30">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card bg-lv-blue-soft text-sm font-bold text-lv-blue">
                        {initials(p.company ?? p.name)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-lv-text group-hover:text-lv-blue">
                          {p.company ?? p.name}
                        </p>
                        <p className="truncate text-xs text-lv-secondary">
                          {p.name}
                        </p>
                      </div>
                    </div>
                    <PartnerHealthBadge signals={p.signals} />
                  </div>

                  <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <Stat label="Challenges" value={p.signals.totalChallenges} />
                    <Stat
                      label="Offen"
                      value={p.signals.pendingApplications}
                      accent={p.signals.pendingApplications > 0}
                    />
                    <Stat label="PoCs" value={p.signals.runningPoCs} />
                  </dl>

                  {p.openActions > 0 && (
                    <p className="mt-4 text-xs font-semibold text-lv-orange">
                      {p.openActions} offene{" "}
                      {p.openActions === 1 ? "Aktion" : "Aktionen"}
                    </p>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="rounded-button bg-lv-surface px-2 py-2.5">
      <p
        className={`text-lg font-bold tabular-nums ${accent ? "text-lv-orange" : "text-lv-text"}`}
      >
        {value}
      </p>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-lv-secondary">
        {label}
      </p>
    </div>
  );
}
