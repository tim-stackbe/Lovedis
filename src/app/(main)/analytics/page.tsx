import Link from "next/link";
import type { Metadata } from "next";
import { DistributionChart } from "@/components/dashboard/Charts";
import { PartnerHealthBadge } from "@/components/partners/PartnerSignals";
import { BannerStat, Card, ToneCard } from "@/components/ui/Card";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { TableCard, Td, Th, THead, Tr } from "@/components/ui/Table";
import { requireRole } from "@/lib/auth-guards";
import { getScoutingAnalytics } from "@/lib/scouting-analytics";

export const metadata: Metadata = { title: "Scouting-Analytics" };

export default async function AnalyticsPage() {
  await requireRole(["ADMIN", "MEMBER"]);

  const a = await getScoutingAnalytics();

  return (
    <>
      <HeroBanner
        kicker="Team-Ops — Sektion 00"
        title="Scouting-Ops Analytics"
        subtitle="Der Scouting-Funnel von der Bewerbung bis zum Piloten — plus Partner-Gesundheit, Durchsatz und Reaktionszeiten. Nur lesend, aggregiert aus Live-Daten."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <BannerStat label="Bewerbungen" value={a.totals.applications} />
          <BannerStat label="Bewertungen" value={a.totals.evaluations} />
          <BannerStat label="Intro-Anfragen" value={a.totals.introRequests} />
          <BannerStat label="PoCs" value={a.totals.pocs} />
        </div>
      </HeroBanner>

      <section className="space-y-4">
        <SectionLabel number="01" label="Conversion" title="Funnel-Quoten" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ToneCard
            tone="info"
            label="Annahmequote"
            value={`${a.rates.acceptanceRate}%`}
            sub="angenommen ÷ entschieden"
          />
          <ToneCard
            tone="success"
            label="PoC-Conversion"
            value={`${a.rates.pocConversion}%`}
            sub="PoCs ÷ angenommene Bewerbungen"
          />
          <ToneCard
            tone="attention"
            label="Bewertungsabdeckung"
            value={`${a.rates.evaluationCoverage}%`}
            sub="bewertete ÷ alle Startups"
          />
          <ToneCard
            tone="muted"
            label="Intro-Verbindungsrate"
            value={`${a.rates.introConnectRate}%`}
            sub="verbunden ÷ alle Intros"
          />
        </div>
      </section>

      <section className="space-y-4">
        <SectionLabel number="02" label="Funnel" title="Scouting-Funnel" />
        <Card className="p-5">
          <DistributionChart data={a.funnel} />
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <SectionLabel
            number="03"
            label="Bewerbungen"
            title="Status-Verteilung"
          />
          <Card className="p-5">
            <DistributionChart data={a.applicationStatus} />
          </Card>
        </div>
        <div className="space-y-4">
          <SectionLabel number="04" label="Piloten" title="PoC-Status" />
          <Card className="p-5">
            <DistributionChart data={a.pocStatus} accentIndex={1} />
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <SectionLabel number="05" label="Durchsatz" title="Reaktion & Stau" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ToneCard
            tone="info"
            label="Ø Reaktionszeit Intros"
            value={
              a.throughput.avgIntroResponseDays === null
                ? "—"
                : `${a.throughput.avgIntroResponseDays} T.`
            }
            sub="bis zur Team-Entscheidung"
          />
          <ToneCard
            tone={a.throughput.stalePoCs > 0 ? "warn" : "muted"}
            label="Stockende PoCs"
            value={a.throughput.stalePoCs}
            sub="≥ 7 Tage ohne Update"
          />
          <ToneCard
            tone={a.throughput.pendingApplications > 0 ? "attention" : "muted"}
            label="Offene Bewerbungen"
            value={a.throughput.pendingApplications}
            sub="warten auf Sichtung"
          />
          <ToneCard
            tone={a.throughput.openIntros > 0 ? "info" : "muted"}
            label="Offene Intros"
            value={a.throughput.openIntros}
            sub="in Anbahnung"
          />
        </div>
      </section>

      <section className="space-y-4">
        <SectionLabel number="06" label="Partner" title="Partner-Gesundheit" />
        <TableCard>
          <THead>
            <tr>
              <Th>Partner</Th>
              <Th className="text-center">Challenges</Th>
              <Th className="text-center">Offen</Th>
              <Th className="text-center">PoCs</Th>
              <Th className="text-center">Stockend</Th>
              <Th className="text-right">Health</Th>
            </tr>
          </THead>
          <tbody>
            {a.partners.map((p) => (
              <Tr key={p.id}>
                <Td>
                  <Link
                    href={`/partners/${p.id}`}
                    className="font-semibold hover:text-lv-blue"
                  >
                    {p.company ?? p.name}
                  </Link>
                  <p className="text-xs text-lv-secondary">{p.name}</p>
                </Td>
                <Td className="text-center text-lv-secondary">
                  {p.signals.totalChallenges}
                </Td>
                <Td className="text-center text-lv-secondary">
                  {p.signals.pendingApplications}
                </Td>
                <Td className="text-center text-lv-secondary">
                  {p.signals.runningPoCs}
                </Td>
                <Td className="text-center text-lv-secondary">
                  {p.signals.stalePoCs}
                </Td>
                <Td className="text-right">
                  <div className="flex justify-end">
                    <PartnerHealthBadge signals={p.signals} />
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </TableCard>
      </section>
    </>
  );
}
