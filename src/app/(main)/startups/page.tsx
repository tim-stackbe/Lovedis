import { Plus, Rocket, Search } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import type { Prisma } from "@/generated/prisma/client";
import type { PipelineStage, StartupStage } from "@/generated/prisma/enums";
import { PipelineStageBadge, ScorePill } from "@/components/shared/badges";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input, Select } from "@/components/ui/Field";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { BannerStat } from "@/components/ui/Card";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { TableCard, Td, Th, THead, Tr } from "@/components/ui/Table";
import { requireScoutModule } from "@/lib/auth-guards";
import { getConsensusByStartup } from "@/lib/consensus-data";
import {
  PIPELINE_STAGES,
  PIPELINE_STAGE_LABELS,
  STARTUP_STAGES,
  STARTUP_STAGE_LABELS,
} from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { formatMillions, truncate } from "@/lib/utils";

export const metadata: Metadata = { title: "Startups" };

interface SearchParams {
  q?: string;
  industry?: string;
  stage?: string;
  pipeline?: string;
}

export default async function StartupsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireScoutModule();
  const { q, industry, stage, pipeline } = await searchParams;

  const where: Prisma.StartupWhereInput = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }
  if (industry) where.industry = { contains: industry, mode: "insensitive" };
  if (stage && STARTUP_STAGES.includes(stage as StartupStage)) {
    where.stage = stage as StartupStage;
  }
  if (pipeline && PIPELINE_STAGES.includes(pipeline as PipelineStage)) {
    where.pipelineStage = pipeline as PipelineStage;
  }

  const [startups, total, industries, partnered] = await Promise.all([
    prisma.startup.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        industry: true,
        stage: true,
        pipelineStage: true,
        fundingRaised: true,
        _count: { select: { evaluations: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.startup.count(),
    prisma.startup.groupBy({ by: ["industry"], orderBy: { industry: "asc" } }),
    prisma.startup.count({ where: { pipelineStage: "PARTNERED" } }),
  ]);

  // Team-consensus score per (filtered) startup for the Score column.
  const consensusByStartup = await getConsensusByStartup(
    startups.map((s) => s.id)
  );

  return (
    <>
      <HeroBanner
        kicker="Venture Scout"
        title="Startup-Universum"
        subtitle="Jedes Unternehmen auf dem Scouting-Desk — suche, filtere und tauche ein in Profile, Kontakte und Bewertungen."
        actions={
          <LinkButton href="/startups/new" variant="white">
            <Plus className="h-4 w-4" />
            Neues Startup
          </LinkButton>
        }
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:max-w-md">
          <BannerStat label="Im Blick" value={total} />
          <BannerStat label="Treffer" value={startups.length} />
          <BannerStat label="Partnerschaften" value={partnered} />
        </div>
      </HeroBanner>

      <section className="space-y-4">
        <SectionLabel number="01" label="Entdecken" title="Alle Startups" />

        <form
          method="GET"
          className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto_auto]"
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-lv-secondary" />
            <Input
              name="q"
              defaultValue={q}
              placeholder="Nach Name oder Beschreibung suchen…"
              className="pl-9"
            />
          </div>
          <Select name="industry" defaultValue={industry ?? ""} className="sm:w-44">
            <option value="">Alle Branchen</option>
            {industries.map((i) => (
              <option key={i.industry} value={i.industry}>
                {i.industry}
              </option>
            ))}
          </Select>
          <Select name="stage" defaultValue={stage ?? ""} className="sm:w-36">
            <option value="">Alle Phasen</option>
            {STARTUP_STAGES.map((s) => (
              <option key={s} value={s}>
                {STARTUP_STAGE_LABELS[s]}
              </option>
            ))}
          </Select>
          <Select name="pipeline" defaultValue={pipeline ?? ""} className="sm:w-40">
            <option value="">Gesamte Pipeline</option>
            {PIPELINE_STAGES.map((s) => (
              <option key={s} value={s}>
                {PIPELINE_STAGE_LABELS[s]}
              </option>
            ))}
          </Select>
          <button
            type="submit"
            className="rounded-button bg-lv-blue px-4 py-2.5 text-sm font-semibold text-white hover:bg-lv-blue-dark transition-colors"
          >
            Filtern
          </button>
        </form>

        {startups.length === 0 ? (
          <EmptyState
            icon={Rocket}
            title="Keine Startups gefunden"
            description="Versuch eine andere Suche oder leg das erste Startup in deinem Scouting-Universum an."
            action={
              <LinkButton href="/startups/new">
                <Plus className="h-4 w-4" />
                Neues Startup
              </LinkButton>
            }
          />
        ) : (
          <TableCard>
            <THead>
              <tr>
                <Th>Startup</Th>
                <Th>Branche</Th>
                <Th>Phase</Th>
                <Th>Pipeline</Th>
                <Th>Finanzierung</Th>
                <Th className="text-center">Bewertungen</Th>
                <Th className="text-right">Score</Th>
              </tr>
            </THead>
            <tbody>
              {startups.map((s) => (
                <Tr key={s.id}>
                  <Td>
                    <Link
                      href={`/startups/${s.id}`}
                      className="font-semibold text-lv-text hover:text-lv-blue"
                    >
                      {s.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-lv-secondary">
                      {truncate(s.description, 70)}
                    </p>
                  </Td>
                  <Td>
                    <Badge tone="pink">{s.industry}</Badge>
                  </Td>
                  <Td className="text-lv-secondary">
                    {STARTUP_STAGE_LABELS[s.stage]}
                  </Td>
                  <Td>
                    <PipelineStageBadge value={s.pipelineStage} />
                  </Td>
                  <Td className="text-lv-secondary">
                    {formatMillions(s.fundingRaised)}
                  </Td>
                  <Td className="text-center text-lv-secondary">
                    {s._count.evaluations}
                  </Td>
                  <Td className="text-right">
                    <ScorePill
                      score={consensusByStartup.get(s.id)?.weightedTotal ?? null}
                    />
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
