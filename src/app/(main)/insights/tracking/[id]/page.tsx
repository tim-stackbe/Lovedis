import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { dayString } from "@/components/insights/format";
import { TrackingForm } from "@/components/insights/TrackingForm";
import { EngagementStatusBadge } from "@/components/shared/badges";
import { LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { requireScoutModule } from "@/lib/auth-guards";
import { loadInsightsFormOptions, loadLinkedEngagement, loadTrackingEntry } from "@/lib/insights/data";
import { effectiveStage, STAGE_LABELS } from "@/lib/insights/stages";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Insights · Tracking-Eintrag" };

export default async function TrackingEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireScoutModule();
  const canEdit = session.user.role === "ADMIN";
  const { id } = await params;

  const [entry, options] = await Promise.all([loadTrackingEntry(id), loadInsightsFormOptions()]);
  if (!entry) notFound();
  const engagement = entry.engagementId ? await loadLinkedEngagement(entry.engagementId) : null;
  const startupName = options.startups.find((s) => s.id === entry.startupId)?.name ?? "Startup";
  const partnerName = options.partners.find((p) => p.id === entry.partnerCompanyId)?.name ?? null;

  return (
    <>
      <HeroBanner
        kicker="Insights · Tracking"
        title={partnerName ? `${startupName} × ${partnerName}` : startupName}
        subtitle={`Erreichte Stufe: ${STAGE_LABELS[effectiveStage(entry)]}.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <LinkButton href={`/insights/startup/${entry.startupId}`} variant="white">
              Startup in Insights
            </LinkButton>
            <LinkButton href="/insights/tracking" variant="white">
              <ArrowLeft className="h-4 w-4" />
              Tracking
            </LinkButton>
          </div>
        }
      />

      {engagement && (
        <>
          <SectionLabel number="01" label="Engagement" title="Verknüpftes Engagement (nur lesend)" />
          <Card className="space-y-3 p-5 text-sm">
            <div className="flex flex-wrap items-center gap-3">
              <Link href={`/engagements/${engagement.id}`} className="font-semibold text-lv-blue hover:underline">
                {engagement.title}
              </Link>
              <EngagementStatusBadge value={engagement.status} />
              {(engagement.startDate || engagement.endDate) && (
                <span className="text-xs text-lv-secondary">
                  {engagement.startDate ? formatDate(engagement.startDate) : "offen"} bis{" "}
                  {engagement.endDate ? formatDate(engagement.endDate) : "offen"}
                </span>
              )}
            </div>
            {engagement.kpis.length > 0 && (
              <ul className="space-y-1 text-lv-secondary">
                {engagement.kpis.map((k, i) => (
                  <li key={i}>
                    <span className="font-semibold text-lv-text">{k.name}</span>: {k.current || "0"} von{" "}
                    {k.target || "?"} {k.unit}
                  </li>
                ))}
              </ul>
            )}
            {engagement.milestones.length > 0 && (
              <ul className="space-y-1 text-lv-secondary">
                {engagement.milestones.map((m, i) => (
                  <li key={i}>
                    {m.done ? "✓" : "○"} {m.title}
                    {m.dueDate ? ` (${m.dueDate.slice(0, 10)})` : ""}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-lv-secondary">Änderungen am Engagement bitte im Engagement selbst vornehmen.</p>
          </Card>
        </>
      )}

      <SectionLabel number={engagement ? "02" : "01"} label="Tracking" title="Angaben" />
      <TrackingForm
        key={entry.updatedAt.toISOString()}
        canEdit={canEdit}
        options={options}
        values={{
          ...entry,
          introByLovedisOn: dayString(entry.introByLovedisOn),
          pilotStartOn: dayString(entry.pilotStartOn),
          loiOn: dayString(entry.loiOn),
          contractOn: dayString(entry.contractOn),
          firstRevenueOn: dayString(entry.firstRevenueOn),
          startOn: dayString(entry.startOn),
          endOn: dayString(entry.endOn),
        }}
      />
    </>
  );
}
