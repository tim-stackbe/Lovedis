import Link from "next/link";
import type { Metadata } from "next";
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

export const metadata: Metadata = { title: "Partner dashboard" };

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
        kicker="Section 00 — Business Partner"
        title={`Hello, ${session.user.name?.split(" ")[0]}`}
        subtitle="Your challenges, the startups applying to them and the PoCs you are running."
        actions={
          <LinkButton href="/challenges/new" variant="white">
            New challenge
          </LinkButton>
        }
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <BannerStat label="Challenges" value={challenges.length} />
          <BannerStat label="Open" value={openChallenges} />
          <BannerStat label="PoCs" value={pocs.length} />
          <BannerStat label="Scorings" value={shares.length} />
        </div>
      </HeroBanner>

      <section className="space-y-4">
        <SectionLabel number="01" label="Pulse" title="Needs your attention" />
        <div className="grid gap-4 sm:grid-cols-3">
          <ToneCard
            tone={pendingCount > 0 ? "attention" : "muted"}
            label="Pending applications"
            value={pendingCount}
            sub="waiting for your decision"
          />
          <ToneCard
            tone="success"
            label="Running PoCs"
            value={runningPoCs}
            sub="active pilots"
          />
          <ToneCard
            tone="info"
            label="Shared scorings"
            value={shares.length}
            sub="from the scouting team"
          />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <SectionLabel number="02" label="Challenges" title="Your challenges" />
          {challenges.length === 0 ? (
            <Card className="p-6 text-sm text-lv-secondary">
              No challenges yet —{" "}
              <Link href="/challenges/new" className="font-semibold text-lv-blue">
                post your first one
              </Link>
              .
            </Card>
          ) : (
            <TableCard>
              <THead>
                <tr>
                  <Th>Challenge</Th>
                  <Th className="text-center">Apps</Th>
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
                      <ChallengeStatusBadge value={c.status} />
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </TableCard>
          )}
        </div>

        <div className="space-y-4">
          <SectionLabel number="03" label="Pilots" title="PoC tracking" />
          {pocs.length === 0 ? (
            <Card className="p-6 text-sm text-lv-secondary">
              Accept an application to spawn your first PoC.
            </Card>
          ) : (
            <TableCard>
              <THead>
                <tr>
                  <Th>PoC</Th>
                  <Th>Progress</Th>
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
          label="Intelligence"
          title="Scorings shared with you"
        />
        {shares.length === 0 ? (
          <Card className="p-6 text-sm text-lv-secondary">
            No scorings shared with you yet.
          </Card>
        ) : (
          <TableCard>
            <THead>
              <tr>
                <Th>Startup</Th>
                <Th>Shared</Th>
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
