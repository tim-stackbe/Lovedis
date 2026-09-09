import { BarChart3, Users } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import {
  EvaluationStatusBadge,
  ScorePill,
} from "@/components/shared/badges";
import { EmptyState } from "@/components/ui/EmptyState";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { BannerStat } from "@/components/ui/Card";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { TableCard, Td, Th, THead, Tr } from "@/components/ui/Table";
import { requireScoutModule } from "@/lib/auth-guards";
import { getConsensusByStartup } from "@/lib/consensus-data";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Bewertungen" };

export default async function EvaluationsPage() {
  await requireScoutModule();

  // One row per startup = the aggregated team consensus (not one row per raw
  // evaluation). The consensus map already filters to scout-role evaluators and
  // dedupes to the most recent evaluation per evaluator.
  const consensusByStartup = await getConsensusByStartup();
  const startupIds = [...consensusByStartup.keys()];

  const startups = await prisma.startup.findMany({
    where: { id: { in: startupIds } },
    select: { id: true, name: true, industry: true },
  });

  const rows = startups
    .map((s) => ({ startup: s, consensus: consensusByStartup.get(s.id)! }))
    .sort((a, b) => b.consensus.weightedTotal - a.consensus.weightedTotal);

  const avg =
    rows.length > 0
      ? rows.reduce((a, r) => a + r.consensus.weightedTotal, 0) / rows.length
      : 0;
  const yesVotes = rows.filter(
    (r) =>
      r.consensus.recommendation === "STRONG_YES" ||
      r.consensus.recommendation === "YES"
  ).length;

  return (
    <>
      <HeroBanner
        kicker="Venture Scout"
        title="Bewertungen"
        subtitle="Team-Konsens pro Startup — sechs gewichtete Challenge-Kriterien, aggregiert über alle Bewertungen des Teams."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:max-w-md">
          <BannerStat label="Startups" value={rows.length} />
          <BannerStat label="Ø Konsens" value={avg.toFixed(1)} />
          <BannerStat label="Ja-Stimmen" value={yesVotes} />
        </div>
      </HeroBanner>

      <section className="space-y-4">
        <SectionLabel number="02" label="Bewerten" title="Team-Konsens je Startup" />
        {rows.length === 0 ? (
          <EmptyState
            icon={BarChart3}
            title="Noch keine Bewertungen"
            description="Öffne ein Startup-Profil und starte die erste Bewertung."
          />
        ) : (
          <TableCard>
            <THead>
              <tr>
                <Th>Startup</Th>
                <Th className="text-center">Bewertungen</Th>
                <Th>Empfehlung / Status</Th>
                <Th className="text-right">Konsens</Th>
              </tr>
            </THead>
            <tbody>
              {rows.map(({ startup, consensus }) => (
                <Tr key={startup.id}>
                  <Td>
                    <Link
                      href={`/startups/${startup.id}`}
                      className="font-semibold hover:text-lv-blue"
                    >
                      {startup.name}
                    </Link>
                    <p className="text-xs text-lv-secondary">
                      {startup.industry}
                    </p>
                  </Td>
                  <Td className="text-center">
                    <span className="inline-flex items-center gap-1 text-lv-secondary">
                      <Users className="h-3.5 w-3.5" />
                      {consensus.evaluatorCount}
                    </span>
                  </Td>
                  <Td>
                    <EvaluationStatusBadge
                      recommendation={consensus.recommendation}
                      gated={consensus.gated}
                    />
                  </Td>
                  <Td className="text-right">
                    <ScorePill score={consensus.weightedTotal} />
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
