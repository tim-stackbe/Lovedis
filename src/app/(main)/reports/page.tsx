import { Share2 } from "lucide-react";
import type { Metadata } from "next";
import { ReportsViewLazy as ReportsView } from "@/components/reports/ReportsViewLazy";
import type { ReportRow } from "@/components/reports/ReportsView";
import { EmptyState } from "@/components/ui/EmptyState";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { requireScoutModule } from "@/lib/auth-guards";
import {
  PIPELINE_STAGE_LABELS,
  STARTUP_STAGE_LABELS,
} from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { scoresToMap } from "@/lib/scoring";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Berichte" };

export default async function ReportsPage() {
  await requireScoutModule();

  const evaluations = await prisma.evaluation.findMany({
    include: {
      scores: true,
      startup: true,
      evaluator: { select: { name: true } },
    },
    orderBy: { overallScore: "desc" },
  });

  const rows: ReportRow[] = evaluations.map((e) => ({
    startup: e.startup.name,
    industry: e.startup.industry,
    stage: STARTUP_STAGE_LABELS[e.startup.stage],
    pipeline: PIPELINE_STAGE_LABELS[e.startup.pipelineStage],
    evaluator: e.evaluator.name,
    date: formatDate(e.updatedAt),
    scores: scoresToMap(e.scores) as Record<string, number>,
    potential: e.potential,
    feasibility: e.feasibility,
    overall: e.overallScore,
    recommendation: e.recommendation,
  }));

  return (
    <>
      <HeroBanner
        kicker="Venture Scout"
        title="Berichte & Exporte"
        subtitle="Nimm das Portfolio mit — PDF fürs Board, Excel und CSV für die Analysten."
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
