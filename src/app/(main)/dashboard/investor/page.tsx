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

export const metadata: Metadata = { title: "Investor-Dashboard" };

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
        kicker="Sektion 00 — Investor"
        title={`Willkommen, ${session.user.name?.split(" ")[0]}`}
        subtitle="Deine Portfolio-Sicht: getrackte Proof-of-Concepts und die mit dir geteilten Scorings."
        actions={
          <LinkButton href="/pocs" variant="white">
            PoC-Tracking öffnen
          </LinkButton>
        }
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <BannerStat label="Getrackte PoCs" value={pocs.length} />
          <BannerStat label="Laufend" value={running} />
          <BannerStat label="Scorings" value={shares.length} />
          <BannerStat label="Ø Score" value={avgScore.toFixed(1)} />
        </div>
      </HeroBanner>

      <section className="space-y-4">
        <SectionLabel number="01" label="Puls" title="Portfolio-Gesundheit" />
        <div className="grid gap-4 sm:grid-cols-3">
          <ToneCard
            tone="success"
            label="Laufende PoCs"
            value={running}
            sub="aktive Piloten"
          />
          <ToneCard
            tone="info"
            label="Abgeschlossen"
            value={completed}
            sub="beendete Piloten"
          />
          <ToneCard
            tone={shares.length > 0 ? "attention" : "muted"}
            label="Neue Insights"
            value={shares.length}
            sub="geteilte Scorings"
          />
        </div>
      </section>

      <section className="space-y-4">
        <SectionLabel number="02" label="Piloten" title="Getrackte PoCs" />
        {pocs.length === 0 ? (
          <Card className="p-6 text-sm text-lv-secondary">
            Dir sind noch keine PoCs zugewiesen.
          </Card>
        ) : (
          <TableCard>
            <THead>
              <tr>
                <Th>Startup</Th>
                <Th>Challenge</Th>
                <Th>Fortschritt</Th>
                <Th>Aktualisiert</Th>
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
                <Th>Empfehlung</Th>
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
