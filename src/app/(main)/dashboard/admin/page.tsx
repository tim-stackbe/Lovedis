import Link from "next/link";
import type { Metadata } from "next";
import { DistributionChartLazy as DistributionChart } from "@/components/dashboard/ChartsLazy";
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

export const metadata: Metadata = { title: "Admin-Dashboard" };

export default async function AdminDashboard() {
  const session = await requireRole(["ADMIN"]);

  const now = new Date();
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
    openBookings,
    dueCheckIns,
    screenedForVerdicts,
    pendingPartners,
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
    prisma.marketplaceBooking.count({
      where: { status: { in: ["REQUESTED", "IN_COORDINATION"] } },
    }),
    prisma.checkInReminder.count({
      where: { status: "SCHEDULED", dueAt: { lte: now } },
    }),
    prisma.startup.findMany({
      where: {
        screenedAt: { not: null },
        pipelineStage: { notIn: ["PARTNERED", "PASSED"] },
      },
      select: {
        partnerReviews: {
          where: { challengeId: null },
          select: { verdict: true },
        },
      },
    }),
    prisma.user.count({
      where: { role: "BUSINESS_PARTNER", approvedAt: null, isActive: true },
    }),
  ]);

  const pendingPartnerVerdicts = screenedForVerdicts.filter(
    (s) => !s.partnerReviews.some((r) => r.verdict !== "PENDING")
  ).length;

  const pipelineData = PIPELINE_STAGES.map((stage) => ({
    name: PIPELINE_STAGE_LABELS[stage],
    value: pipelineGroups.find((g) => g.pipelineStage === stage)?._count ?? 0,
  }));

  return (
    <>
      <HeroBanner
        kicker="Sektion 00 — Admin"
        title={`Willkommen zurück, ${session.user.name?.split(" ")[0]}`}
        subtitle="Plattform-Überblick: Scouting-Aktivität, Challenges, Kollaborationen und Menschen."
        actions={
          <LinkButton href="/users" variant="white">
            Nutzer verwalten
          </LinkButton>
        }
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <BannerStat label="Aktive Nutzer" value={userCount} />
          <BannerStat label="Startups" value={startupCount} />
          <BannerStat label="Bewertungen" value={evaluationCount} />
          <BannerStat label="Challenges" value={challengeCount} />
        </div>
      </HeroBanner>

      <section className="space-y-4">
        <SectionLabel number="01" label="Puls" title="Braucht Aufmerksamkeit" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ToneCard
            tone="info"
            label="Offene Challenges"
            value={openChallenges}
            sub="nehmen Bewerbungen an"
          />
          <ToneCard
            tone="attention"
            label="Ausstehende Bewerbungen"
            value={pendingApplications}
            sub="warten auf eine Entscheidung"
          />
          <ToneCard
            tone="success"
            label="Laufende PoCs"
            value={runningPoCs}
            sub="in aktiven Piloten"
          />
          <ToneCard
            tone="muted"
            label="Geteilte Scorings"
            value={shareCount}
            sub="für Partner sichtbar"
          />
        </div>
      </section>

      <section className="space-y-4">
        <SectionLabel
          number="02"
          label="Mara"
          title="Aktions-Inbox"
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/users" className="block transition-transform hover:-translate-y-0.5">
            <ToneCard
              tone={pendingPartners > 0 ? "attention" : "muted"}
              label="Partner-Freigaben offen"
              value={pendingPartners}
              sub="warten auf Freigabe →"
            />
          </Link>
          <Link href="/marketplace" className="block transition-transform hover:-translate-y-0.5">
            <ToneCard
              tone={openBookings > 0 ? "attention" : "muted"}
              label="Offene Marktplatz-Anfragen"
              value={openBookings}
              sub="warten auf Koordination →"
            />
          </Link>
          <Link href="/pushes" className="block transition-transform hover:-translate-y-0.5">
            <ToneCard
              tone={dueCheckIns > 0 ? "warn" : "muted"}
              label="Fällige Check-in-Erinnerungen"
              value={dueCheckIns}
              sub="bereit zum Versand →"
            />
          </Link>
          <Link href="/screening" className="block transition-transform hover:-translate-y-0.5">
            <ToneCard
              tone={pendingPartnerVerdicts > 0 ? "info" : "muted"}
              label="Ausstehende Partner-Verdikte"
              value={pendingPartnerVerdicts}
              sub="Startups ohne Partner-Feedback →"
            />
          </Link>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <SectionLabel number="03" label="Funnel" title="Pipeline-Verteilung" />
          <Card className="p-5">
            <DistributionChart data={pipelineData} />
          </Card>
        </div>

        <div className="space-y-4">
          <SectionLabel number="04" label="Aktuell" title="Neueste Bewertungen" />
          <TableCard>
            <THead>
              <tr>
                <Th>Startup</Th>
                <Th>Bewertet von</Th>
                <Th>Aktualisiert</Th>
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
