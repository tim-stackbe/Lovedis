import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { formatEur, formatRate } from "@/components/insights/format";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { BannerStat } from "@/components/ui/Card";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { TableCard, Td, Th, THead, Tr } from "@/components/ui/Table";
import { requireAdmin } from "@/lib/auth-guards";
import { loadInsightsDataset } from "@/lib/insights/data";
import {
  effectiveStage,
  labelOf,
  OUTCOME_LABELS,
  STAGE_LABELS,
  STAGES,
  TRACK_LABELS,
  TRACKS,
} from "@/lib/insights/stages";
import { summarizeOneOnOne } from "@/lib/insights/tracking";
import { cn, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Insights · Pipeline-Tracking" };

export default async function TrackingListPage({
  searchParams,
}: {
  searchParams: Promise<{ track?: string }>;
}) {
  await requireAdmin();
  const { track } = await searchParams;
  const filter = (TRACKS as readonly string[]).includes(track ?? "") ? track! : null;

  const ds = await loadInsightsDataset();
  const oneOnOne = summarizeOneOnOne(ds);
  const startupById = new Map(ds.startups.map((s) => [s.id, s]));
  const partnerById = new Map(ds.partners.map((p) => [p.id, p]));
  const batchById = new Map(ds.batches.map((b) => [b.id, b]));
  const rows = ds.tracking
    .filter((t) => !filter || t.track === filter)
    .map((t) => ({ ...t, reached: effectiveStage(t), startupName: startupById.get(t.startupId)?.name ?? "?" }))
    .sort((a, b) => a.startupName.localeCompare(b.startupName, "de"));

  return (
    <>
      <HeroBanner
        kicker="Insights · Tracking"
        title="Pipeline-Tracking"
        subtitle="Zusätzliche Angaben zu Kooperationen: Stufe bis Vertrag und Umsatz, Intro durch LOVEDIS und die Felder des 1:1 Accelerators. Matrix und Engagements bleiben unverändert."
        actions={
          <div className="flex flex-wrap gap-2">
            <LinkButton href="/insights/tracking/new" variant="white">
              <Plus className="h-4 w-4" />
              Neuer Eintrag
            </LinkButton>
            <LinkButton href="/insights" variant="white">
              <ArrowLeft className="h-4 w-4" />
              Insights
            </LinkButton>
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <BannerStat label="1:1 Einträge" value={oneOnOne.entries} />
          <BannerStat label="1:1 zu Pilot" value={formatRate(oneOnOne.pilotRate)} />
          <BannerStat label="Pilot zu Vertrag" value={formatRate(oneOnOne.pilotToContractRate)} />
          <BannerStat label="1:1 Umsatz" value={formatEur(oneOnOne.revenueEur)} />
        </div>
      </HeroBanner>

      <SectionLabel number="01" label="1:1 Accelerator" title="Conversion und Kosten" />
      <TableCard>
        <THead>
          <tr>
            {STAGES.map((s) => (
              <Th key={s} className="text-right">
                {STAGE_LABELS[s]}
              </Th>
            ))}
            <Th className="text-right">Kosten Partner</Th>
            <Th className="text-right">Kosten LOVEDIS</Th>
            <Th className="text-right">Kosten Startup</Th>
          </tr>
        </THead>
        <tbody>
          <Tr>
            {STAGES.map((s) => (
              <Td key={s} className="text-right tabular-nums">
                {oneOnOne.byStage[s]}
              </Td>
            ))}
            <Td className="text-right tabular-nums">{formatEur(oneOnOne.costs.partner)}</Td>
            <Td className="text-right tabular-nums">{formatEur(oneOnOne.costs.lovedis)}</Td>
            <Td className="text-right tabular-nums">{formatEur(oneOnOne.costs.startup)}</Td>
          </Tr>
        </tbody>
      </TableCard>

      <SectionLabel number="02" label="Einträge" title="Alle Tracking-Einträge" />
      <div className="flex flex-wrap gap-2">
        {[null, ...TRACKS].map((t) => (
          <Link
            key={t ?? "all"}
            href={t ? `/insights/tracking?track=${t}` : "/insights/tracking"}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
              filter === t
                ? "border-lv-blue bg-lv-blue text-white"
                : "border-lv-border bg-white text-lv-secondary hover:bg-lv-surface"
            )}
          >
            {t ? TRACK_LABELS[t] : "Alle"}
          </Link>
        ))}
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-lv-secondary">Noch keine Tracking-Einträge.</p>
      ) : (
        <TableCard>
          <THead>
            <tr>
              <Th>Startup</Th>
              <Th>Partner</Th>
              <Th>Programm</Th>
              <Th>Stufe</Th>
              <Th>Intro durch LOVEDIS</Th>
              <Th className="text-right">Umsatz</Th>
              <Th>Outcome</Th>
            </tr>
          </THead>
          <tbody>
            {rows.map((t) => (
              <Tr key={t.id}>
                <Td>
                  <Link href={`/insights/tracking/${t.id}`} className="font-semibold text-lv-blue hover:underline">
                    {t.startupName}
                  </Link>
                </Td>
                <Td>
                  {t.partnerCompanyId ? (
                    partnerById.get(t.partnerCompanyId)?.name ?? "?"
                  ) : (
                    <span className="text-lv-secondary">kein Partner</span>
                  )}
                </Td>
                <Td className="text-lv-secondary">
                  {labelOf(TRACK_LABELS, t.track)}
                  {t.batchId && batchById.get(t.batchId) ? ` · ${batchById.get(t.batchId)!.name}` : ""}
                </Td>
                <Td>
                  <Badge tone={t.reached === "CONTRACT" || t.reached === "REVENUE" ? "mint" : "blue"}>
                    {STAGE_LABELS[t.reached]}
                  </Badge>
                </Td>
                <Td className="text-lv-secondary">{t.introByLovedisOn ? formatDate(t.introByLovedisOn) : ""}</Td>
                <Td className="text-right tabular-nums">{t.revenueEur ? formatEur(t.revenueEur) : ""}</Td>
                <Td className="text-lv-secondary">{labelOf(OUTCOME_LABELS, t.outcome)}</Td>
              </Tr>
            ))}
          </tbody>
        </TableCard>
      )}
    </>
  );
}
