import { BarChart3 } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import {
  QuadrantBadge,
  RecommendationBadge,
  ScorePill,
} from "@/components/shared/badges";
import { EmptyState } from "@/components/ui/EmptyState";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { BannerStat } from "@/components/ui/Card";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { TableCard, Td, Th, THead, Tr } from "@/components/ui/Table";
import { requireScoutModule } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { deriveQuadrant } from "@/lib/scoring";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Evaluations" };

export default async function EvaluationsPage() {
  await requireScoutModule();

  const evaluations = await prisma.evaluation.findMany({
    include: {
      startup: { select: { id: true, name: true, industry: true } },
      evaluator: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const avg =
    evaluations.length > 0
      ? evaluations.reduce((a, e) => a + e.overallScore, 0) /
        evaluations.length
      : 0;
  const strongYes = evaluations.filter(
    (e) => e.recommendation === "STRONG_YES" || e.recommendation === "YES"
  ).length;

  return (
    <>
      <HeroBanner
        kicker="Venture Scout"
        title="Evaluations"
        subtitle="Seven weighted dimensions per startup — from market and product to strategic fit."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:max-w-md">
          <BannerStat label="Total" value={evaluations.length} />
          <BannerStat label="Avg score" value={avg.toFixed(1)} />
          <BannerStat label="Yes votes" value={strongYes} />
        </div>
      </HeroBanner>

      <section className="space-y-4">
        <SectionLabel number="02" label="Evaluate" title="All evaluations" />
        {evaluations.length === 0 ? (
          <EmptyState
            icon={BarChart3}
            title="No evaluations yet"
            description="Open a startup profile and start its first evaluation."
          />
        ) : (
          <TableCard>
            <THead>
              <tr>
                <Th>Startup</Th>
                <Th>Evaluator</Th>
                <Th>Updated</Th>
                <Th>Quadrant</Th>
                <Th>Recommendation</Th>
                <Th className="text-right">Overall</Th>
              </tr>
            </THead>
            <tbody>
              {evaluations.map((e) => (
                <Tr key={e.id}>
                  <Td>
                    <Link
                      href={`/evaluations/${e.id}`}
                      className="font-semibold hover:text-lv-blue"
                    >
                      {e.startup.name}
                    </Link>
                    <p className="text-xs text-lv-secondary">
                      {e.startup.industry}
                    </p>
                  </Td>
                  <Td className="text-lv-secondary">{e.evaluator.name}</Td>
                  <Td className="text-lv-secondary">
                    {formatDate(e.updatedAt)}
                  </Td>
                  <Td>
                    <QuadrantBadge
                      value={deriveQuadrant(e.potential, e.feasibility)}
                    />
                  </Td>
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
