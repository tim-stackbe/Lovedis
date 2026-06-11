import { Radar } from "lucide-react";
import type { Metadata } from "next";
import { RadarView, type RadarStartup } from "@/components/radar/RadarView";
import { EmptyState } from "@/components/ui/EmptyState";
import { BannerStat } from "@/components/ui/Card";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { LinkButton } from "@/components/ui/Button";
import { requireScoutModule } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Radar" };

export default async function RadarPage() {
  await requireScoutModule();

  const startups = await prisma.startup.findMany({
    where: { radarQuadrant: { not: null }, radarRing: { not: null } },
    include: {
      evaluations: {
        orderBy: { updatedAt: "desc" },
        take: 1,
        select: { overallScore: true },
      },
    },
  });

  const blips: RadarStartup[] = startups.map((s) => ({
    id: s.id,
    name: s.name,
    quadrant: s.radarQuadrant!,
    ring: s.radarRing!,
    latestScore: s.evaluations[0]?.overallScore ?? null,
  }));

  const adopt = blips.filter((b) => b.ring === "ADOPT").length;

  return (
    <>
      <HeroBanner
        kicker="Venture Scout"
        title="Technology radar"
        subtitle="Where every scouted startup sits — four thematic quadrants, four maturity rings."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:max-w-md">
          <BannerStat label="On radar" value={blips.length} />
          <BannerStat label="Adopt ring" value={adopt} />
          <BannerStat label="Quadrants" value={4} />
        </div>
      </HeroBanner>

      <SectionLabel number="05" label="Radar" title="Quadrant × ring map" />

      {blips.length === 0 ? (
        <EmptyState
          icon={Radar}
          title="Nothing on the radar yet"
          description="Assign a radar quadrant and ring on a startup profile to plot it here."
          action={<LinkButton href="/startups">Browse startups</LinkButton>}
        />
      ) : (
        <RadarView startups={blips} />
      )}
    </>
  );
}
