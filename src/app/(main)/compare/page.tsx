import type { Metadata } from "next";
import { CompareViewLazy as CompareView } from "@/components/compare/CompareViewLazy";
import type { CompareStartup } from "@/components/compare/CompareView";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { requireScoutModule } from "@/lib/auth-guards";
import { getConsensusByStartup } from "@/lib/consensus-data";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Vergleich" };

export default async function ComparePage() {
  await requireScoutModule();

  const startups = await prisma.startup.findMany({
    select: { id: true, name: true, industry: true },
    orderBy: { name: "asc" },
  });

  // Compare on the team consensus per startup: the radar plots the mean per
  // criterion, the weighted total & status come from the aggregate.
  const consensusByStartup = await getConsensusByStartup(
    startups.map((s) => s.id)
  );

  const compareStartups: CompareStartup[] = startups.map((s) => {
    const consensus = consensusByStartup.get(s.id);
    return {
      id: s.id,
      name: s.name,
      industry: s.industry,
      scores: consensus?.perCriterionMean ?? {},
      overallScore: consensus?.weightedTotal ?? 0,
      recommendation: consensus?.recommendation ?? "STRONG_NO",
      hasEvaluation: (consensus?.evaluatorCount ?? 0) > 0,
      evaluatorCount: consensus?.evaluatorCount ?? 0,
    };
  });

  return (
    <>
      <HeroBanner
        kicker="Venture Scout"
        title="Direktvergleich"
        subtitle="Stelle Startups über alle sechs Challenge-Kriterien hinweg gegenüber."
      />
      <SectionLabel number="03" label="Entscheiden" title="Vergleichs-Workbench" />
      <CompareView startups={compareStartups} />
    </>
  );
}
