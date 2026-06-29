import type { Metadata } from "next";
import { CompareViewLazy as CompareView } from "@/components/compare/CompareViewLazy";
import type { CompareStartup } from "@/components/compare/CompareView";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { requireScoutModule } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { scoresToMap } from "@/lib/scoring";

export const metadata: Metadata = { title: "Vergleich" };

export default async function ComparePage() {
  await requireScoutModule();

  const startups = await prisma.startup.findMany({
    include: {
      evaluations: {
        orderBy: { updatedAt: "desc" },
        take: 1,
        include: { scores: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const compareStartups: CompareStartup[] = startups.map((s) => {
    const latest = s.evaluations[0];
    return {
      id: s.id,
      name: s.name,
      industry: s.industry,
      scores: latest ? scoresToMap(latest.scores) : {},
      overallScore: latest?.overallScore ?? 0,
      potential: latest?.potential ?? 0,
      feasibility: latest?.feasibility ?? 0,
      recommendation: latest?.recommendation ?? "MAYBE",
      hasEvaluation: Boolean(latest),
    };
  });

  return (
    <>
      <HeroBanner
        kicker="Venture Scout"
        title="Direktvergleich"
        subtitle="Stelle Startups über alle sieben Scoring-Dimensionen hinweg gegenüber."
      />
      <SectionLabel number="03" label="Entscheiden" title="Vergleichs-Workbench" />
      <CompareView startups={compareStartups} />
    </>
  );
}
