import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { FundingScopeForm } from "@/components/insights/FundingForms";
import { LinkButton } from "@/components/ui/Button";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { TableCard, Td, Th, THead, Tr } from "@/components/ui/Table";
import { requireScoutModule } from "@/lib/auth-guards";
import { BATCH_TYPE_LABELS, PROGRAM_STATUS_LABELS } from "@/lib/constants";
import type { ProgramStatus } from "@/generated/prisma/enums";
import { loadInsightsDataset } from "@/lib/insights/data";
import { FUNDING_FORMAT_CONFIG, FUNDING_FORMATS } from "@/lib/insights/funding";
import { loadFundingDataset } from "@/lib/insights/funding-data";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Insights · Förder-Formate" };

export default async function FundingSetupPage() {
  const session = await requireScoutModule();
  const canEdit = session.user.role === "ADMIN";
  const [ds, fd] = await Promise.all([loadInsightsDataset(), loadFundingDataset()]);
  const formatOf = new Map(fd.scope.map((s) => [`${s.kind}:${s.refId}`, s.format]));
  const startupsByBatch = new Map<string, number>();
  for (const bs of ds.batchStartups) startupsByBatch.set(bs.batchId, (startupsByBatch.get(bs.batchId) ?? 0) + 1);
  const participantsByProgram = new Map<string, Set<string>>();
  for (const b of fd.programBookings) {
    if (b.status !== "CONFIRMED" && b.status !== "COMPLETED") continue;
    const set = participantsByProgram.get(b.programId) ?? new Set<string>();
    set.add(b.startupId);
    participantsByProgram.set(b.programId, set);
  }
  const batches = [...ds.batches].sort(
    (a, b) => (b.startDate ?? b.createdAt).getTime() - (a.startDate ?? a.createdAt).getTime()
  );

  return (
    <>
      <HeroBanner
        kicker="Förderung · Zuordnungen"
        title="Formate zuordnen"
        subtitle="Legt fest, welcher Batch und welches Venture-Store-Programm als welches geförderte Format zählt. Batches und Programme selbst bleiben unverändert."
        actions={
          <LinkButton href="/insights/foerderung" variant="white">
            <ArrowLeft className="h-4 w-4" />
            Verwendungsnachweis
          </LinkButton>
        }
      />

      <SectionLabel number="01" label="Akzeleratoren" title="Batches" />
      <TableCard>
        <THead>
          <tr>
            <Th>Batch</Th>
            <Th>Zeitraum</Th>
            <Th className="text-right">Startups</Th>
            <Th>Format</Th>
          </tr>
        </THead>
        <tbody>
          {batches.map((b) => (
            <Tr key={b.id}>
              <Td>
                <span className="font-semibold">{b.name}</span>
                <span className="block text-xs text-lv-secondary">{BATCH_TYPE_LABELS[b.type]}</span>
              </Td>
              <Td className="text-xs text-lv-secondary">
                {b.startDate && b.endDate ? (
                  `${formatDate(b.startDate)} bis ${formatDate(b.endDate)}`
                ) : (
                  <span className="text-lv-orange">ohne Datum</span>
                )}
              </Td>
              <Td className="text-right tabular-nums">{startupsByBatch.get(b.id) ?? 0}</Td>
              <Td>
                <FundingScopeForm
                  key={formatOf.get(`BATCH:${b.id}`) ?? "none"}
                  kind="BATCH"
                  refId={b.id}
                  format={formatOf.get(`BATCH:${b.id}`) ?? null}
                  canEdit={canEdit}
                />
              </Td>
            </Tr>
          ))}
        </tbody>
      </TableCard>

      <SectionLabel number="02" label="Programme" title="Weitere Start-up Programme (Venture Store)" />
      {fd.programs.length === 0 ? (
        <p className="text-sm text-lv-secondary">Im Venture Store gibt es noch keine Programme.</p>
      ) : (
        <TableCard>
          <THead>
            <tr>
              <Th>Programm</Th>
              <Th>Status</Th>
              <Th className="text-right">Teilnehmende</Th>
              <Th>Format</Th>
            </tr>
          </THead>
          <tbody>
            {fd.programs.map((p) => (
              <Tr key={p.id}>
                <Td className="font-semibold">{p.title}</Td>
                <Td className="text-xs text-lv-secondary">{PROGRAM_STATUS_LABELS[p.status as ProgramStatus] ?? p.status}</Td>
                <Td className="text-right tabular-nums">{participantsByProgram.get(p.id)?.size ?? 0}</Td>
                <Td>
                  <FundingScopeForm
                    key={formatOf.get(`PROGRAM:${p.id}`) ?? "none"}
                    kind="PROGRAM"
                    refId={p.id}
                    format={formatOf.get(`PROGRAM:${p.id}`) ?? null}
                    canEdit={canEdit}
                  />
                </Td>
              </Tr>
            ))}
          </tbody>
        </TableCard>
      )}
      <p className="text-xs text-lv-secondary">
        Teilnehmende zählen ab einer bestätigten oder abgeschlossenen Buchung. Geplante Formate:{" "}
        {FUNDING_FORMATS.map((f) => `${FUNDING_FORMAT_CONFIG[f].label} (${FUNDING_FORMAT_CONFIG[f].plannedPeriod})`).join(", ")}.
        {!canEdit && " Nur Admins können die Zuordnung ändern."}
      </p>
    </>
  );
}
