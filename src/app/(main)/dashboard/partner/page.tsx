import Link from "next/link";
import type { Metadata } from "next";
import { ShareChallengeButton } from "@/components/challenges/ShareChallengeButton";
import {
  ChallengeStatusBadge,
  PoCStatusBadge,
  ScorePill,
} from "@/components/shared/badges";
import { BannerStat, Card, ToneCard } from "@/components/ui/Card";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { LinkButton } from "@/components/ui/Button";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { TableCard, Td, Th, THead, Tr } from "@/components/ui/Table";
import { requireRole } from "@/lib/auth-guards";
import { parseMilestones, pocProgress } from "@/lib/pocs";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Partner-Dashboard" };

export default async function PartnerDashboard() {
  const session = await requireRole(["BUSINESS_PARTNER"]);
  const userId = session.user.id;

  const [challenges, pocs, shares, pendingCount] = await Promise.all([
    prisma.challenge.findMany({
      where: { createdById: userId },
      include: { _count: { select: { applications: true } } },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.poCPerformance.findMany({
      where: {
        OR: [
          { trackedById: userId },
          { application: { challenge: { createdById: userId } } },
        ],
      },
      include: {
        application: { include: { startup: { select: { name: true } } } },
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.sharedScoring.findMany({
      where: { recipientId: userId },
      include: {
        evaluation: { include: { startup: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.challengeApplication.count({
      where: { status: "PENDING", challenge: { createdById: userId } },
    }),
  ]);

  const openChallenges = challenges.filter((c) => c.status === "OPEN").length;
  const runningPoCs = pocs.filter((p) => p.status === "RUNNING").length;

  return (
    <>
      <HeroBanner
        kicker="Sektion 00 — Business Partner"
        title={`Hallo, ${session.user.name?.split(" ")[0]}`}
        subtitle="Deine Challenges, die Startups, die sich bewerben, und die PoCs, die du betreust."
        actions={
          <LinkButton href="/challenges/new" variant="white">
            Neue Challenge
          </LinkButton>
        }
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <BannerStat label="Challenges" value={challenges.length} />
          <BannerStat label="Offen" value={openChallenges} />
          <BannerStat label="PoCs" value={pocs.length} />
          <BannerStat label="Scorings" value={shares.length} />
        </div>
      </HeroBanner>

      <section className="space-y-4">
        <SectionLabel number="01" label="Puls" title="Braucht deine Aufmerksamkeit" />
        <div className="grid gap-4 sm:grid-cols-3">
          <ToneCard
            tone={pendingCount > 0 ? "attention" : "muted"}
            label="Ausstehende Bewerbungen"
            value={pendingCount}
            sub="warten auf deine Entscheidung"
          />
          <ToneCard
            tone="success"
            label="Laufende PoCs"
            value={runningPoCs}
            sub="aktive Piloten"
          />
          <ToneCard
            tone="info"
            label="Geteilte Scorings"
            value={shares.length}
            sub="vom Scouting-Team"
          />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <SectionLabel number="02" label="Challenges" title="Deine Challenges" />
          {challenges.length === 0 ? (
            <Card className="p-6 text-sm text-lv-secondary">
              Noch keine Challenges —{" "}
              <Link href="/challenges/new" className="font-semibold text-lv-blue">
                veröffentliche deine erste
              </Link>
              .
            </Card>
          ) : (
            <TableCard>
              <THead>
                <tr>
                  <Th>Challenge</Th>
                  <Th className="text-center">Bewerbungen</Th>
                  <Th className="text-right">Status</Th>
                </tr>
              </THead>
              <tbody>
                {challenges.map((c) => (
                  <Tr key={c.id}>
                    <Td>
                      <Link
                        href={`/challenges/${c.id}`}
                        className="font-semibold hover:text-lv-blue"
                      >
                        {c.title}
                      </Link>
                    </Td>
                    <Td className="text-center text-lv-secondary">
                      {c._count.applications}
                    </Td>
                    <Td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <ChallengeStatusBadge value={c.status} />
                        <ShareChallengeButton
                          title={c.title}
                          challengeId={c.id}
                          variant="ghost"
                        />
                      </div>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </TableCard>
          )}
        </div>

        <div className="space-y-4">
          <SectionLabel number="03" label="Piloten" title="PoC-Tracking" />
          {pocs.length === 0 ? (
            <Card className="p-6 text-sm text-lv-secondary">
              Nimm eine Bewerbung an, um deinen ersten PoC zu starten.
            </Card>
          ) : (
            <TableCard>
              <THead>
                <tr>
                  <Th>PoC</Th>
                  <Th>Fortschritt</Th>
                  <Th className="text-right">Status</Th>
                </tr>
              </THead>
              <tbody>
                {pocs.map((p) => {
                  const progress = pocProgress(parseMilestones(p.milestones));
                  return (
                    <Tr key={p.id}>
                      <Td>
                        <Link
                          href={`/pocs/${p.id}`}
                          className="font-semibold hover:text-lv-blue"
                        >
                          {p.application.startup.name}
                        </Link>
                      </Td>
                      <Td>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-lv-surface">
                            <div
                              className="h-full rounded-full bg-lv-blue"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs tabular-nums text-lv-secondary">
                            {progress}%
                          </span>
                        </div>
                      </Td>
                      <Td className="text-right">
                        <PoCStatusBadge value={p.status} />
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </TableCard>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <SectionLabel
          number="04"
          label="Insights"
          title="Mit dir geteilte Scorings"
        />
        {shares.length === 0 ? (
          <Card className="p-6 text-sm text-lv-secondary">
            Noch keine Scorings mit dir geteilt.
          </Card>
        ) : (
          <TableCard>
            <THead>
              <tr>
                <Th>Startup</Th>
                <Th>Geteilt</Th>
                <Th className="text-right">Score</Th>
              </tr>
            </THead>
            <tbody>
              {shares.map((s) => (
                <Tr key={s.id}>
                  <Td>
                    <Link
                      href={`/scorings/${s.id}`}
                      className="font-semibold hover:text-lv-blue"
                    >
                      {s.evaluation.startup.name}
                    </Link>
                  </Td>
                  <Td className="text-lv-secondary">{formatDate(s.createdAt)}</Td>
                  <Td className="text-right">
                    <ScorePill score={s.evaluation.overallScore} />
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
