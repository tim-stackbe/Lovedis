import Link from "next/link";
import type { Metadata } from "next";
import { DistributionChart } from "@/components/dashboard/Charts";
import { RecommendationBadge, ScorePill } from "@/components/shared/badges";
import { BannerStat, Card, ToneCard } from "@/components/ui/Card";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { LinkButton } from "@/components/ui/Button";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { TableCard, Td, Th, THead, Tr } from "@/components/ui/Table";
import { requireRole } from "@/lib/auth-guards";
import { PIPELINE_STAGES, PIPELINE_STAGE_LABELS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Admin dashboard" };

export default async function AdminDashboard() {
  const session = await requireRole(["ADMIN"]);

  const [
    userCount,
    startupCount,
    evaluationCount,
    challengeCount,
    openChallenges,
    pendingApplications,
    runningPoCs,
    shareCount,
    pipelineGroups,
    recentEvaluations,
  ] = await Promise.all([
    prisma.user.count({ where: { isActive: true } }),
    prisma.startup.count(),
    prisma.evaluation.count(),
    prisma.challenge.count(),
    prisma.challenge.count({ where: { status: "OPEN" } }),
    prisma.challengeApplication.count({ where: { status: "PENDING" } }),
    prisma.poCPerformance.count({ where: { status: "RUNNING" } }),
    prisma.sharedScoring.count(),
    prisma.startup.groupBy({ by: ["pipelineStage"], _count: true }),
    prisma.evaluation.findMany({
      include: {
        startup: { select: { name: true } },
        evaluator: { select: { name: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 6,
    }),
  ]);

  const pipelineData = PIPELINE_STAGES.map((stage) => ({
    name: PIPELINE_STAGE_LABELS[stage],
    value: pipelineGroups.find((g) => g.pipelineStage === stage)?._count ?? 0,
  }));

  return (
    <>
      <HeroBanner
        kicker="Section 00 — Admin"
        title={`Welcome back, ${session.user.name?.split(" ")[0]}`}
        subtitle="Platform overview: scouting activity, challenges, collaborations and people."
        actions={
          <LinkButton href="/users" variant="white">
            Manage users
          </LinkButton>
        }
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <BannerStat label="Active users" value={userCount} />
          <BannerStat label="Startups" value={startupCount} />
          <BannerStat label="Evaluations" value={evaluationCount} />
          <BannerStat label="Challenges" value={challengeCount} />
        </div>
      </HeroBanner>

      <section className="space-y-4">
        <SectionLabel number="01" label="Pulse" title="Needs attention" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ToneCard
            tone="info"
            label="Open challenges"
            value={openChallenges}
            sub="accepting applications"
          />
          <ToneCard
            tone="attention"
            label="Pending applications"
            value={pendingApplications}
            sub="waiting for a decision"
          />
          <ToneCard
            tone="success"
            label="Running PoCs"
            value={runningPoCs}
            sub="in active pilots"
          />
          <ToneCard
            tone="muted"
            label="Shared scorings"
            value={shareCount}
            sub="visible to partners"
          />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <SectionLabel number="02" label="Funnel" title="Pipeline distribution" />
          <Card className="p-5">
            <DistributionChart data={pipelineData} />
          </Card>
        </div>

        <div className="space-y-4">
          <SectionLabel number="03" label="Latest" title="Recent evaluations" />
          <TableCard>
            <THead>
              <tr>
                <Th>Startup</Th>
                <Th>Evaluator</Th>
                <Th>Updated</Th>
                <Th className="text-right">Score</Th>
              </tr>
            </THead>
            <tbody>
              {recentEvaluations.map((e) => (
                <Tr key={e.id}>
                  <Td>
                    <Link
                      href={`/evaluations/${e.id}`}
                      className="font-semibold hover:text-lv-blue"
                    >
                      {e.startup.name}
                    </Link>
                    <div className="mt-0.5">
                      <RecommendationBadge value={e.recommendation} />
                    </div>
                  </Td>
                  <Td className="text-lv-secondary">{e.evaluator.name}</Td>
                  <Td className="text-lv-secondary">{formatDate(e.updatedAt)}</Td>
                  <Td className="text-right">
                    <ScorePill score={e.overallScore} />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </TableCard>
        </div>
      </section>
    </>
  );
}
