import { Share2 } from "lucide-react";
import type { Metadata } from "next";
import { ReportsViewLazy as ReportsView } from "@/components/reports/ReportsViewLazy";
import type { ReportRow } from "@/components/reports/ReportsView";
import { EmptyState } from "@/components/ui/EmptyState";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { requireScoutModule } from "@/lib/auth-guards";
import { getConsensusByStartup } from "@/lib/consensus-data";
import {
  PIPELINE_STAGE_LABELS,
  SCORE_DIMENSIONS,
  STARTUP_STAGE_LABELS,
} from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Berichte" };

export default async function ReportsPage() {
  await requireScoutModule();

  // Portfolio report = one row per startup, using the aggregated team consensus
  // (mean per criterion + consensus total/status + evaluator count).
  const consensusByStartup = await getConsensusByStartup();
  const startupIds = [...consensusByStartup.keys()];

  const startups = await prisma.startup.findMany({
    where: { id: { in: startupIds } },
    select: {
      id: true,
      name: true,
      industry: true,
      stage: true,
      pipelineStage: true,
    },
  });

  const rows: ReportRow[] = startups
    .map((s) => {
      const consensus = consensusByStartup.get(s.id)!;
      return {
        startup: s.name,
        industry: s.industry,
        stage: STARTUP_STAGE_LABELS[s.stage],
        pipeline: PIPELINE_STAGE_LABELS[s.pipelineStage],
        evaluatorCount: consensus.evaluatorCount,
        scores: Object.fromEntries(
          SCORE_DIMENSIONS.map((d) => [d, consensus.perCriterionMean[d] ?? 0])
        ) as Record<string, number>,
        overall: consensus.weightedTotal,
        recommendation: consensus.recommendation,
        gated: consensus.gated,
        minTotal: consensus.minTotal,
        maxTotal: consensus.maxTotal,
      };
    })
    .sort((a, b) => b.overall - a.overall);

  return (
    <>
      <HeroBanner
        kicker="Venture Scout"
        title="Berichte & Exporte"
        subtitle="Nimm das Portfolio mit — PDF fürs Board, Excel und CSV für die Analysten. Werte sind der Team-Konsens je Startup."
      />
      <SectionLabel number="06" label="Bericht" title="Portfolio-Bericht" />
      {rows.length === 0 ? (
        <EmptyState
          icon={Share2}
          title="Noch nichts zu berichten"
          description="Erstelle zuerst Bewertungen — sie erscheinen hier exportbereit."
        />
      ) : (
        <ReportsView rows={rows} />
      )}
    </>
  );
}
