import Link from "next/link";
import type { Metadata } from "next";
import {
  PoCStatusBadge,
  RecommendationBadge,
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

export const metadata: Metadata = { title: "Investor dashboard" };

export default async function InvestorDashboard() {
  const session = await requireRole(["INVESTOR"]);
  const userId = session.user.id;

  const [pocs, shares] = await Promise.all([
    prisma.poCPerformance.findMany({
      where: { trackedById: userId },
      include: {
        application: {
          include: {
            startup: { select: { name: true, industry: true } },
            challenge: { select: { title: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.sharedScoring.findMany({
      where: { recipientId: userId },
      include: {
        evaluation: {
          include: {
            startup: { select: { name: true, industry: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const running = pocs.filter((p) => p.status === "RUNNING").length;
  const completed = pocs.filter((p) => p.status === "COMPLETED").length;
  const avgScore =
    shares.length > 0
      ? shares.reduce((a, s) => a + s.evaluation.overallScore, 0) /
        shares.length
      : 0;

  return (
    <>
      <HeroBanner
        kicker="Section 00 — Investor"
        title={`Welcome, ${session.user.name?.split(" ")[0]}`}
        subtitle="Your portfolio view: tracked Proof-of-Concepts and the scorings shared with you."
        actions={
          <LinkButton href="/pocs" variant="white">
            Open PoC tracking
          </LinkButton>
        }
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <BannerStat label="Tracked PoCs" value={pocs.length} />
          <BannerStat label="Running" value={running} />
          <BannerStat label="Scorings" value={shares.length} />
          <BannerStat label="Avg score" value={avgScore.toFixed(1)} />
        </div>
      </HeroBanner>

      <section className="space-y-4">
        <SectionLabel number="01" label="Pulse" title="Portfolio health" />
        <div className="grid gap-4 sm:grid-cols-3">
          <ToneCard
            tone="success"
            label="Running PoCs"
            value={running}
            sub="active pilots"
          />
          <ToneCard
            tone="info"
            label="Completed"
            value={completed}
            sub="finished pilots"
          />
          <ToneCard
            tone={shares.length > 0 ? "attention" : "muted"}
            label="New intelligence"
            value={shares.length}
            sub="shared scorings"
          />
        </div>
      </section>

      <section className="space-y-4">
        <SectionLabel number="02" label="Pilots" title="Tracked PoCs" />
        {pocs.length === 0 ? (
          <Card className="p-6 text-sm text-lv-secondary">
            No PoCs are assigned to you yet.
          </Card>
        ) : (
          <TableCard>
            <THead>
              <tr>
                <Th>Startup</Th>
                <Th>Challenge</Th>
                <Th>Progress</Th>
                <Th>Updated</Th>
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
                      <p className="text-xs text-lv-secondary">
                        {p.application.startup.industry}
                      </p>
                    </Td>
                    <Td className="text-lv-secondary">
                      {p.application.challenge.title}
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
                    <Td className="text-lv-secondary">
                      {formatDate(p.updatedAt)}
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
      </section>

      <section className="space-y-4">
        <SectionLabel
          number="03"
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
                <Th>Recommendation</Th>
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
                    <p className="text-xs text-lv-secondary">
                      {s.evaluation.startup.industry}
                    </p>
                  </Td>
                  <Td className="text-lv-secondary">{formatDate(s.createdAt)}</Td>
                  <Td>
                    <RecommendationBadge value={s.evaluation.recommendation} />
                  </Td>
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
