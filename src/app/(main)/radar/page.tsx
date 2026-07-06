import { Radar } from "lucide-react";
import type { Metadata } from "next";
import { RadarView, type RadarStartup } from "@/components/radar/RadarView";
import { EmptyState } from "@/components/ui/EmptyState";
import { BannerStat } from "@/components/ui/Card";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { LinkButton } from "@/components/ui/Button";
import { requireScoutModule } from "@/lib/auth-guards";
import { getConsensusByStartup } from "@/lib/consensus-data";
import { RADAR_QUADRANTS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Radar" };

export default async function RadarPage() {
  await requireScoutModule();

  const startups = await prisma.startup.findMany({
    where: { radarQuadrant: { not: null }, radarRing: { not: null } },
    select: { id: true, name: true, radarQuadrant: true, radarRing: true },
  });

  const consensusByStartup = await getConsensusByStartup(
    startups.map((s) => s.id)
  );

  const blips: RadarStartup[] = startups.map((s) => ({
    id: s.id,
    name: s.name,
    quadrant: s.radarQuadrant!,
    ring: s.radarRing!,
    consensusScore: consensusByStartup.get(s.id)?.weightedTotal ?? null,
  }));

  const adopt = blips.filter((b) => b.ring === "ADOPT").length;

  return (
    <>
      <HeroBanner
        kicker="Venture Scout"
        title="Technologie-Radar"
        subtitle="Wo jedes gescoutete Startup steht — Technologiefelder entlang der Challenge-Verticals, vier Reifegrad-Ringe. Manuell klassifiziert, unabhängig vom Score."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:max-w-md">
          <BannerStat label="Im Radar" value={blips.length} />
          <BannerStat label="Adopt-Ring" value={adopt} />
          <BannerStat label="Felder" value={RADAR_QUADRANTS.length} />
        </div>
      </HeroBanner>

      <SectionLabel number="05" label="Radar" title="Feld-×-Ring-Karte" />

      {blips.length === 0 ? (
        <EmptyState
          icon={Radar}
          title="Noch nichts im Radar"
          description="Weise einem Startup-Profil ein Technologiefeld und einen Ring zu, um es hier zu platzieren."
          action={<LinkButton href="/startups">Startups durchsuchen</LinkButton>}
        />
      ) : (
        <RadarView startups={blips} />
      )}
    </>
  );
}
