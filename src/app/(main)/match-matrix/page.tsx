import { LayoutGrid, Plus } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/Button";
import { BannerStat } from "@/components/ui/Card";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { requireScoutModule } from "@/lib/auth-guards";
import { BATCH_TYPE_LABELS } from "@/lib/constants";
import {
  cellHasData,
  isTopMatch,
  type MatchCellView,
  type MatchRowView,
} from "@/lib/match-matrix";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { MatchMatrixBoard, type PartnerColumn } from "./MatchMatrixBoard";

export const metadata: Metadata = { title: "Match-Matrix" };

export default async function MatchMatrixPage({
  searchParams,
}: {
  searchParams: Promise<{ batch?: string }>;
}) {
  // Team-only: this surface contains internal cross-partner data and must NOT
  // be exposed to partners/startups/investors.
  await requireScoutModule();

  const { batch: batchParam } = await searchParams;

  const batches = await prisma.scoutingCampaign.findMany({
    orderBy: [{ createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      type: true,
      _count: { select: { batchStartups: true, batchPartners: true } },
    },
  });

  if (batches.length === 0) {
    return (
      <>
        <HeroBanner
          kicker="Venture Scout"
          title="Match-Matrix"
          subtitle="Jede Matrix gehört zu einem Batch (Accelerator, Industrieprogramm …). Lege zuerst einen Batch an und weise Startups und Partner zu."
        />
        <EmptyState
          icon={LayoutGrid}
          title="Noch kein Batch angelegt"
          description="Match-Matrizen sind pro Batch organisiert. Erstelle einen Batch und weise ihm Startups sowie Partner-Unternehmen zu."
          action={
            <LinkButton href="/batches">
              <Plus className="h-4 w-4" />
              Batch anlegen
            </LinkButton>
          }
        />
      </>
    );
  }

  const selected =
    batches.find((b) => b.id === batchParam) ?? batches[0];

  const [batchPartners, batchStartups, matches] = await Promise.all([
    prisma.batchPartner.findMany({
      where: { batchId: selected.id },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        partnerCompany: { select: { id: true, name: true, slug: true } },
      },
    }),
    prisma.batchStartup.findMany({
      where: { batchId: selected.id },
      select: { startup: { select: { id: true, name: true } } },
    }),
    prisma.partnerStartupMatch.findMany({
      where: { batchId: selected.id },
      select: {
        id: true,
        partnerId: true,
        startupId: true,
        startupRelevance: true,
        partnerRelevance: true,
        useCaseTypes: true,
        useCaseNote: true,
        nextSteps: true,
        contactStatus: true,
        startupUseCaseTypes: true,
        startupUseCaseNote: true,
        startupFollowUp: true,
        startupOpenQuestions: true,
        startupNotes: true,
        startupContacted: true,
        startupUpdatedAt: true,
        partnerUseCaseTypes: true,
        partnerUseCaseNote: true,
        partnerFollowUp: true,
        partnerOpenQuestions: true,
        partnerNotes: true,
        partnerContacted: true,
        partnerUpdatedAt: true,
      },
    }),
  ]);

  const partners: PartnerColumn[] = batchPartners.map((bp) => bp.partnerCompany);
  const partnerIndexById = new Map(partners.map((p, i) => [p.id, i]));

  // Seed a row for every startup in the batch (even with no cells yet).
  const rowsByStartup = new Map<string, MatchRowView>();
  const startupsSorted = [...batchStartups].sort((a, b) =>
    a.startup.name.localeCompare(b.startup.name, "de")
  );
  for (const bs of startupsSorted) {
    rowsByStartup.set(bs.startup.id, {
      startupId: bs.startup.id,
      startupName: bs.startup.name,
      cells: Array<MatchCellView | null>(partners.length).fill(null),
    });
  }

  for (const m of matches) {
    const partnerIndex = partnerIndexById.get(m.partnerId);
    if (partnerIndex === undefined) continue;
    const row = rowsByStartup.get(m.startupId);
    if (!row) continue; // cell for a startup no longer in the batch
    row.cells[partnerIndex] = {
      id: m.id,
      partnerSlug: partners[partnerIndex].slug,
      startupRelevance: m.startupRelevance,
      partnerRelevance: m.partnerRelevance,
      useCaseTypes: m.useCaseTypes,
      useCaseNote: m.useCaseNote,
      nextSteps: m.nextSteps,
      contactStatus: m.contactStatus,
      startupSide: {
        relevance: m.startupRelevance,
        useCaseTypes: m.startupUseCaseTypes,
        useCaseNote: m.startupUseCaseNote,
        followUp: m.startupFollowUp,
        openQuestions: m.startupOpenQuestions,
        notes: m.startupNotes,
        contacted: m.startupContacted,
        updatedAt: m.startupUpdatedAt,
      },
      partnerSide: {
        relevance: m.partnerRelevance,
        useCaseTypes: m.partnerUseCaseTypes,
        useCaseNote: m.partnerUseCaseNote,
        followUp: m.partnerFollowUp,
        openQuestions: m.partnerOpenQuestions,
        notes: m.partnerNotes,
        contacted: m.partnerContacted,
        updatedAt: m.partnerUpdatedAt,
      },
    };
  }

  const rows = [...rowsByStartup.values()];

  const pairings = matches.filter((m) =>
    cellHasData({
      id: m.id,
      partnerSlug: "",
      startupRelevance: m.startupRelevance,
      partnerRelevance: m.partnerRelevance,
      useCaseTypes: m.useCaseTypes,
      useCaseNote: m.useCaseNote,
      nextSteps: m.nextSteps,
      contactStatus: m.contactStatus,
    })
  ).length;
  const topMatches = matches.filter((m) =>
    isTopMatch(m.startupRelevance, m.partnerRelevance)
  ).length;

  return (
    <>
      <HeroBanner
        kicker="Venture Scout"
        title="Match-Matrix"
        subtitle="Beidseitige Passung zwischen Startups und Partnern je Batch — die Zellfarbe zeigt die gegenseitige Passung, Details je Paarung per Klick."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:max-w-2xl">
          <BannerStat label="Startups" value={rows.length} />
          <BannerStat label="Partner" value={partners.length} />
          <BannerStat label="Paarungen" value={pairings} />
          <BannerStat label="Top-Matches" value={topMatches} />
        </div>
      </HeroBanner>

      <SectionLabel number="01" label="Batch" title="Programm / Accelerator" />
      <div className="flex flex-wrap items-center gap-2">
        {batches.map((b) => (
          <Link
            key={b.id}
            href={`/match-matrix?batch=${b.id}`}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
              b.id === selected.id
                ? "border-lv-blue bg-lv-blue text-white"
                : "border-lv-border bg-white text-lv-secondary hover:bg-lv-surface"
            )}
          >
            {b.name}
            <span
              className={cn(
                "ml-1.5 text-[10px] font-normal",
                b.id === selected.id ? "text-white/80" : "text-lv-secondary"
              )}
            >
              {BATCH_TYPE_LABELS[b.type]} · {b._count.batchStartups}×
              {b._count.batchPartners}
            </span>
          </Link>
        ))}
        <LinkButton href={`/batches/${selected.id}`} variant="secondary" size="sm">
          Batch verwalten
        </LinkButton>
      </div>

      <MatchMatrixBoard
        batchId={selected.id}
        partners={partners}
        rows={rows}
      />
    </>
  );
}
