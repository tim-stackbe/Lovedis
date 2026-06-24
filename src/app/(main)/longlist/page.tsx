import { ListChecks } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import type { Prisma } from "@/generated/prisma/client";
import type { PipelineStage } from "@/generated/prisma/enums";
import {
  PartnerVerdictBadge,
  PipelineStageBadge,
  RecommendationBadge,
  SourceTypeBadge,
} from "@/components/shared/badges";
import { EmptyState } from "@/components/ui/EmptyState";
import { BannerStat } from "@/components/ui/Card";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { TableCard, Td, Th, THead, Tr } from "@/components/ui/Table";
import { requireTeam } from "@/lib/auth-guards";
import { PIPELINE_STAGES, PIPELINE_STAGE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Longlist" };

interface SearchParams {
  campaign?: string;
  stage?: string;
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
        active
          ? "border-lv-blue bg-lv-blue text-white"
          : "border-lv-border bg-white text-lv-secondary hover:bg-lv-surface"
      )}
    >
      {children}
    </Link>
  );
}

export default async function LonglistPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireTeam();
  const { campaign, stage } = await searchParams;

  const activeStage = PIPELINE_STAGES.includes(stage as PipelineStage)
    ? (stage as PipelineStage)
    : undefined;

  const campaigns = await prisma.scoutingCampaign.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const where: Prisma.StartupWhereInput = {
    ...(campaign ? { campaignId: campaign } : {}),
    ...(activeStage ? { pipelineStage: activeStage } : {}),
  };

  const startups = await prisma.startup.findMany({
    where,
    orderBy: [{ screenedAt: { sort: "desc", nulls: "last" } }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      industry: true,
      sourceType: true,
      pipelineStage: true,
      screenSummary: true,
      screenRecommendation: true,
      campaign: { select: { name: true } },
      partnerReviews: {
        where: { challengeId: null },
        select: { verdict: true },
      },
    },
  });

  const screened = startups.filter((s) => s.screenRecommendation).length;
  const buildHref = (next: Partial<SearchParams>) => {
    const params = new URLSearchParams();
    const merged = { campaign, stage, ...next };
    if (merged.campaign) params.set("campaign", merged.campaign);
    if (merged.stage) params.set("stage", merged.stage);
    const qs = params.toString();
    return qs ? `/longlist?${qs}` : "/longlist";
  };

  return (
    <>
      <HeroBanner
        kicker="Screening"
        title="Longlist"
        subtitle="Gescoutete Startups je Batch — Polina-Einordnung erfassen und Partner-Feedback nachverfolgen. Interne Sicht."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:max-w-md">
          <BannerStat label="Startups" value={startups.length} />
          <BannerStat label="Eingeordnet" value={screened} />
          <BannerStat label="Batches" value={campaigns.length} />
        </div>
      </HeroBanner>

      <SectionLabel number="01" label="Filter" title="Batch & Pipeline" />
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-lv-secondary">
            Batch
          </span>
          <FilterChip href={buildHref({ campaign: undefined })} active={!campaign}>
            Alle
          </FilterChip>
          {campaigns.map((c) => (
            <FilterChip
              key={c.id}
              href={buildHref({ campaign: c.id })}
              active={campaign === c.id}
            >
              {c.name}
            </FilterChip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-lv-secondary">
            Pipeline
          </span>
          <FilterChip href={buildHref({ stage: undefined })} active={!activeStage}>
            Alle
          </FilterChip>
          {PIPELINE_STAGES.map((s) => (
            <FilterChip
              key={s}
              href={buildHref({ stage: s })}
              active={activeStage === s}
            >
              {PIPELINE_STAGE_LABELS[s]}
            </FilterChip>
          ))}
        </div>
      </div>

      <SectionLabel number="02" label="Kandidaten" title="Longlist-Startups" />
      {startups.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Keine Startups in dieser Auswahl"
          description="Passe die Batch- oder Pipeline-Filter an, um Kandidaten zu sehen."
        />
      ) : (
        <TableCard>
          <THead>
            <tr>
              <Th>Startup</Th>
              <Th>Batch</Th>
              <Th>Quelle</Th>
              <Th>Pipeline</Th>
              <Th>Polina</Th>
              <Th className="text-right">Partner-Verdikte</Th>
            </tr>
          </THead>
          <tbody>
            {startups.map((s) => {
              const cont = s.partnerReviews.filter(
                (r) => r.verdict === "CONTINUE"
              ).length;
              const pass = s.partnerReviews.filter(
                (r) => r.verdict === "PASS"
              ).length;
              const pending = s.partnerReviews.filter(
                (r) => r.verdict === "PENDING"
              ).length;
              return (
                <Tr key={s.id}>
                  <Td>
                    <Link
                      href={`/startups/${s.id}`}
                      className="font-semibold hover:text-lv-blue"
                    >
                      {s.name}
                    </Link>
                    <p className="text-xs text-lv-secondary">{s.industry}</p>
                  </Td>
                  <Td className="text-lv-secondary">{s.campaign?.name ?? "—"}</Td>
                  <Td>
                    {s.sourceType ? (
                      <SourceTypeBadge value={s.sourceType} />
                    ) : (
                      <span className="text-lv-secondary">—</span>
                    )}
                  </Td>
                  <Td>
                    <PipelineStageBadge value={s.pipelineStage} />
                  </Td>
                  <Td>
                    {s.screenRecommendation ? (
                      <RecommendationBadge value={s.screenRecommendation} />
                    ) : (
                      <span className="text-lv-secondary">offen</span>
                    )}
                  </Td>
                  <Td className="text-right">
                    {s.partnerReviews.length === 0 ? (
                      <span className="text-lv-secondary">—</span>
                    ) : (
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {cont > 0 && (
                          <PartnerVerdictBadge value="CONTINUE" />
                        )}
                        {pass > 0 && <PartnerVerdictBadge value="PASS" />}
                        {pending > 0 && (
                          <PartnerVerdictBadge value="PENDING" />
                        )}
                      </div>
                    )}
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </TableCard>
      )}
    </>
  );
}
