import type { Metadata } from "next";
import {
  PipelineBoard,
  type PipelineStartup,
} from "@/components/pipeline/PipelineBoard";
import { BannerStat } from "@/components/ui/Card";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { requireScoutModule } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Pipeline" };

export default async function PipelinePage() {
  await requireScoutModule();

  const startups = await prisma.startup.findMany({
    include: {
      evaluations: {
        orderBy: { updatedAt: "desc" },
        take: 1,
        select: { overallScore: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const board: PipelineStartup[] = startups.map((s) => ({
    id: s.id,
    name: s.name,
    industry: s.industry,
    pipelineStage: s.pipelineStage,
    latestScore: s.evaluations[0]?.overallScore ?? null,
  }));

  const inEvaluation = board.filter(
    (s) => s.pipelineStage === "IN_EVALUATION"
  ).length;
  const partnered = board.filter((s) => s.pipelineStage === "PARTNERED").length;

  return (
    <>
      <HeroBanner
        kicker="Venture Scout"
        title="Scouting pipeline"
        subtitle="Drag startups through the funnel — from first discovery to a signed partnership."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:max-w-md">
          <BannerStat label="In funnel" value={board.length} />
          <BannerStat label="Evaluating" value={inEvaluation} />
          <BannerStat label="Partnered" value={partnered} />
        </div>
      </HeroBanner>

      <SectionLabel number="04" label="Pipeline" title="Kanban board" />
      <PipelineBoard startups={board} />
    </>
  );
}
