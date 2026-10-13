import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { BatchChallengeForm } from "@/components/insights/BatchChallengeForm";
import { LinkButton } from "@/components/ui/Button";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { requireAdmin } from "@/lib/auth-guards";
import { BATCH_TYPE_LABELS } from "@/lib/constants";
import { loadInsightsDataset } from "@/lib/insights/data";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Insights · Zuordnungen" };

export default async function InsightsSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ batch?: string }>;
}) {
  await requireAdmin();
  const { batch: batchParam } = await searchParams;

  const ds = await loadInsightsDataset();
  const batches = [...ds.batches].sort(
    (a, b) => (b.startDate ?? b.createdAt).getTime() - (a.startDate ?? a.createdAt).getTime()
  );
  const selected = batches.find((b) => b.id === batchParam) ?? batches[0] ?? null;
  const partnerById = new Map(ds.partners.map((p) => [p.id, p]));
  const linked = new Set(
    ds.batchChallenges.filter((l) => l.batchId === selected?.id).map((l) => l.challengeId)
  );

  return (
    <>
      <HeroBanner
        kicker="Insights · Zuordnungen"
        title="Challenges je Batch"
        subtitle="Challenges haben im System keinen Batch. Hier legt ihr fest, welche Challenges zu welchem Basis-Accelerator zählen. Challenges und Batches selbst bleiben unverändert."
        actions={
          <LinkButton href="/insights" variant="white">
            <ArrowLeft className="h-4 w-4" />
            Insights
          </LinkButton>
        }
      />

      {!selected ? (
        <p className="text-sm text-lv-secondary">Noch kein Batch angelegt.</p>
      ) : (
        <>
          <SectionLabel number="01" label="Batch" title="Batch auswählen" />
          <div className="flex flex-wrap gap-2">
            {batches.map((b) => (
              <Link
                key={b.id}
                href={`/insights/setup?batch=${b.id}`}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                  b.id === selected.id
                    ? "border-lv-blue bg-lv-blue text-white"
                    : "border-lv-border bg-white text-lv-secondary hover:bg-lv-surface"
                )}
              >
                {b.name}
                <span className="ml-1.5 text-[10px] font-normal opacity-80">{BATCH_TYPE_LABELS[b.type]}</span>
              </Link>
            ))}
          </div>

          <SectionLabel number="02" label="Challenges" title={`Challenges in „${selected.name}“`} />
          <BatchChallengeForm
            key={`${selected.id}:${[...linked].sort().join(",")}`}
            batchId={selected.id}
            canEdit
            challenges={ds.challenges
              .map((c) => ({
                id: c.id,
                title: c.title,
                partnerName: c.partnerCompanyId ? partnerById.get(c.partnerCompanyId)?.name ?? null : null,
                linked: linked.has(c.id),
              }))
              .sort((a, b) => Number(b.linked) - Number(a.linked) || a.title.localeCompare(b.title, "de"))}
          />
        </>
      )}
    </>
  );
}
