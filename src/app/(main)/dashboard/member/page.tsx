import Link from "next/link";
import type { Metadata } from "next";
import { DistributionChartLazy as DistributionChart } from "@/components/dashboard/ChartsLazy";
import {
  QuadrantBadge,
  RecommendationBadge,
  ScorePill,
} from "@/components/shared/badges";
import { BannerStat, Card, ToneCard } from "@/components/ui/Card";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { LinkButton } from "@/components/ui/Button";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { TableCard, Td, Th, THead, Tr } from "@/components/ui/Table";
import { requireRole } from "@/lib/auth-guards";
import { PIPELINE_STAGES, PIPELINE_STAGE_LABELS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { deriveQuadrant } from "@/lib/scoring";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Scout-Dashboard" };

export default async function MemberDashboard() {
  const session = await requireRole(["MEMBER", "ADMIN"]);

  const [
    startupCount,
    evaluationCount,
    myEvaluationCount,
    onRadar,
    pipelineGroups,
    topStartups,
    myRecent,
  ] = await Promise.all([
    prisma.startup.count(),
    prisma.evaluation.count(),
    prisma.evaluation.count({ where: { evaluatorId: session.user.id } }),
    prisma.startup.count({ where: { radarQuadrant: { not: null } } }),
    prisma.startup.groupBy({ by: ["pipelineStage"], _count: true }),
    prisma.evaluation.findMany({
      orderBy: { overallScore: "desc" },
      take: 5,
      include: { startup: { select: { id: true, name: true, industry: true } } },
    }),
    prisma.evaluation.findMany({
      where: { evaluatorId: session.user.id },
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: { startup: { select: { name: true } } },
    }),
  ]);

  const pipelineData = PIPELINE_STAGES.map((stage) => ({
    name: PIPELINE_STAGE_LABELS[stage],
    value: pipelineGroups.find((g) => g.pipelineStage === stage)?._count ?? 0,
  }));
  const inEvaluation =
    pipelineGroups.find((g) => g.pipelineStage === "IN_EVALUATION")?._count ??
    0;

  return (
    <>
      <HeroBanner
        kicker="Sektion 00 — Venture Scout"
        title={`Schön, dich zu sehen, ${session.user.name?.split(" ")[0]}`}
        subtitle="Dein Scouting-Desk: entdecke Startups, bewerte sie und beweg sie durch den Funnel."
        actions={
          <LinkButton href="/startups/new" variant="white">
            Startup hinzufügen
          </LinkButton>
        }
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <BannerStat label="Startups" value={startupCount} />
          <BannerStat label="Bewertungen" value={evaluationCount} />
          <BannerStat label="Deine" value={myEvaluationCount} />
          <BannerStat label="Im Radar" value={onRadar} />
        </div>
      </HeroBanner>

      <section className="space-y-4">
        <SectionLabel number="01" label="Status" title="Scouting-Puls" />
        <div className="grid gap-4 sm:grid-cols-3">
          <ToneCard
            tone="attention"
            label="In Bewertung"
            value={inEvaluation}
            sub="Startups werden gescort"
          />
          <ToneCard
            tone="info"
            label="Deine Bewertungen"
            value={myEvaluationCount}
            sub="von dir verfasst"
          />
          <ToneCard
            tone="success"
            label="Partnerschaften"
            value={
              pipelineGroups.find((g) => g.pipelineStage === "PARTNERED")
                ?._count ?? 0
            }
            sub="Deals abgeschlossen"
          />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <SectionLabel number="02" label="Funnel" title="Pipeline" />
          <Card className="p-5">
            <DistributionChart data={pipelineData} />
          </Card>
        </div>

        <div className="space-y-4">
          <SectionLabel number="03" label="Spitze" title="Top-bewertete Startups" />
          <TableCard>
            <THead>
              <tr>
                <Th>Startup</Th>
                <Th>Quadrant</Th>
                <Th className="text-right">Score</Th>
              </tr>
            </THead>
            <tbody>
              {topStartups.map((e) => (
                <Tr key={e.id}>
                  <Td>
                    <Link
                      href={`/startups/${e.startup.id}`}
                      className="font-semibold hover:text-lv-blue"
                    >
                      {e.startup.name}
                    </Link>
                    <p className="text-xs text-lv-secondary">
                      {e.startup.industry}
                    </p>
                  </Td>
                  <Td>
                    <QuadrantBadge
                      value={deriveQuadrant(e.potential, e.feasibility)}
                    />
                  </Td>
                  <Td className="text-right">
                    <ScorePill score={e.overallScore} />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </TableCard>
        </div>
      </section>

      <section className="space-y-4">
        <SectionLabel number="04" label="Deine" title="Deine letzten Bewertungen" />
        {myRecent.length === 0 ? (
          <Card className="p-6 text-sm text-lv-secondary">
            Du hast noch nichts bewertet — öffne ein Startup-Profil und leg los.
          </Card>
        ) : (
          <TableCard>
            <THead>
              <tr>
                <Th>Startup</Th>
                <Th>Aktualisiert</Th>
                <Th>Empfehlung</Th>
                <Th className="text-right">Score</Th>
              </tr>
            </THead>
            <tbody>
              {myRecent.map((e) => (
                <Tr key={e.id}>
                  <Td>
                    <Link
                      href={`/evaluations/${e.id}`}
                      className="font-semibold hover:text-lv-blue"
                    >
                      {e.startup.name}
                    </Link>
                  </Td>
                  <Td className="text-lv-secondary">{formatDate(e.updatedAt)}</Td>
                  <Td>
                    <RecommendationBadge value={e.recommendation} />
                  </Td>
                  <Td className="text-right">
                    <ScorePill score={e.overallScore} />
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
