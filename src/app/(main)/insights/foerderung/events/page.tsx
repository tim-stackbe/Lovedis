import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { dayString } from "@/components/insights/format";
import { DeleteFundingEventButton, FundingEventForm } from "@/components/insights/FundingForms";
import { LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { requireAdmin } from "@/lib/auth-guards";
import { loadInsightsDataset } from "@/lib/insights/data";
import { buildFundingReport } from "@/lib/insights/funding";
import { loadFundingDataset } from "@/lib/insights/funding-data";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Insights · Veranstaltungen" };

export default async function FundingEventsPage() {
  await requireAdmin();
  const [ds, fd, notes] = await Promise.all([
    loadInsightsDataset(),
    loadFundingDataset(),
    prisma.fundingEventCount.findMany({ select: { id: true, note: true } }),
  ]);
  const report = buildFundingReport(ds, fd);
  const noteById = new Map(notes.map((n) => [n.id, n.note]));

  return (
    <>
      <HeroBanner
        kicker="Förderung · Veranstaltungen"
        title="Teilnehmende je Veranstaltung"
        subtitle="Demo Days, LOVE DISRUPTION und DISRUPT FROM THE CORE laufen nicht über die Plattform. Tragt hier je Veranstaltung die Teilnehmerzahl aus Luma oder Attio ein."
        actions={
          <LinkButton href="/insights/foerderung" variant="white">
            <ArrowLeft className="h-4 w-4" />
            Verwendungsnachweis
          </LinkButton>
        }
      />

      <SectionLabel number="01" label="Neu" title="Veranstaltung eintragen" />
      <Card className="p-5">
        <FundingEventForm canEdit />
      </Card>

      <SectionLabel number="02" label="Erfasst" title="Veranstaltungen nach Art" />
      {report.events.map((g) => (
        <Card key={g.kind} className="space-y-3 p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-base font-semibold text-lv-text">{g.label}</h3>
            <p className="text-xs text-lv-secondary">
              {g.min !== null && `Soll ${g.max === null ? g.min : `${g.min} bis ${g.max}`} je Veranstaltung`}
              {g.planned !== null && `, ${g.planned} geplant`}
              {g.events.length > 0 && `, erfasst ${g.events.length} mit ${g.attendees.toLocaleString("de-DE")} Teilnehmenden`}
            </p>
          </div>
          {g.events.length === 0 ? (
            <p className="text-sm text-lv-secondary">Noch nichts eingetragen.</p>
          ) : (
            <div className="divide-y divide-lv-border">
              {g.events.map((e) => (
                <div key={e.id} className="space-y-2 py-3">
                  <FundingEventForm
                    key={`${e.id}:${e.attendees}:${e.heldOn.toISOString()}:${e.title}`}
                    canEdit
                    event={{
                      id: e.id,
                      kind: e.kind,
                      title: e.title,
                      heldOn: dayString(e.heldOn) ?? "",
                      attendees: e.attendees,
                      source: e.source,
                      note: noteById.get(e.id) ?? null,
                    }}
                  />
                  <div className="flex justify-end">
                    <DeleteFundingEventButton id={e.id} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      ))}
    </>
  );
}
