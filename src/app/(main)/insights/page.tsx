import { BarChart3 } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { InsightsExportButton, SnapshotNowButton } from "@/components/insights/InsightsActions";
import { formatRate } from "@/components/insights/format";
import { BannerStat, Card, ToneCard } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { TableCard, Td, Th, THead, Tr } from "@/components/ui/Table";
import { requireScoutModule } from "@/lib/auth-guards";
import { BATCH_TYPE_LABELS } from "@/lib/constants";
import { loadInsightsDataset, loadSnapshotStatus } from "@/lib/insights/data";
import { buildExportSheets } from "@/lib/insights/export";
import {
  buildPilotIndex,
  dataQuality,
  industryBreakdown,
  partnersInBatch,
  startupsInBatch,
  summarizeBatch,
  summarizePortfolio,
} from "@/lib/insights/metrics";
import { cn, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Insights" };

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ batch?: string }>;
}) {
  // Same audience as the Match-Matrix: internal cross-partner data.
  await requireScoutModule();
  const { batch: batchParam } = await searchParams;

  const [ds, snapshot] = await Promise.all([loadInsightsDataset(), loadSnapshotStatus()]);
  const pilots = buildPilotIndex(ds);
  const portfolio = summarizePortfolio(ds, pilots);
  const sheets = buildExportSheets(ds);

  const batchesNewestFirst = [...ds.batches].sort(
    (a, b) =>
      (b.startDate ?? b.createdAt).getTime() - (a.startDate ?? a.createdAt).getTime()
  );
  const selected =
    batchesNewestFirst.find((b) => b.id === batchParam) ?? batchesNewestFirst[0] ?? null;
  const summary = selected ? summarizeBatch(ds, selected.id, pilots) : null;
  const partnerRows = selected ? partnersInBatch(ds, selected.id, pilots) : [];
  const startupRows = selected ? startupsInBatch(ds, selected.id, pilots) : [];
  const industries = selected ? industryBreakdown(ds, selected.id, pilots) : [];
  const quality = dataQuality(ds);

  return (
    <>
      <HeroBanner
        kicker="Tracking (intern)"
        title="Insights & KPIs"
        subtitle="Kennzahlen aus Match-Matrix, Engagements, Challenges und Venture Store. Nur lesend: die Werkzeuge selbst bleiben unverändert."
        actions={<InsightsExportButton sheets={sheets} />}
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <BannerStat label="Startups in Batches" value={portfolio.startupsInBatches} />
          <BannerStat label="Matches" value={portfolio.matches} />
          <BannerStat label="Pilot-Paare" value={portfolio.pilotPairs} />
          <BannerStat label="Extern dazugekommen" value={portfolio.externalStartups} />
        </div>
      </HeroBanner>

      {!selected || !summary ? (
        <EmptyState
          icon={BarChart3}
          title="Noch kein Batch angelegt"
          description="Insights werten Batches aus. Lege zuerst einen Batch mit Startups und Partnern an."
        />
      ) : (
        <>
          <SectionLabel number="01" label="Programm" title="Batch auswählen" />
          <div className="flex flex-wrap items-center gap-2">
            {batchesNewestFirst.map((b) => (
              <Link
                key={b.id}
                href={`/insights?batch=${b.id}`}
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
                  {BATCH_TYPE_LABELS[b.type]}
                </span>
              </Link>
            ))}
          </div>

          <SectionLabel
            number="02"
            label="Kennzahlen"
            title={`${selected.name}${
              selected.startDate && selected.endDate
                ? ` (${formatDate(selected.startDate)} bis ${formatDate(selected.endDate)})`
                : ""
            }`}
          />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <ToneCard tone="info" label="Startups" value={summary.startups} sub={`${summary.partners} Partner im Batch`} />
            <ToneCard
              tone="info"
              label="Matches"
              value={summary.matches}
              sub={`von ${summary.ratedPairings} bewerteten Paarungen`}
            />
            <ToneCard
              tone="success"
              label="Match zu Pilot"
              value={formatRate(summary.matchToPilotRate)}
              sub={`${summary.matchesWithPilot} von ${summary.matches} Matches`}
            />
            <ToneCard tone="success" label="Pilot-Paare" value={summary.pilotPairs} sub="Startup × Partner mit Pilot/Testphase" />
            <ToneCard
              tone="muted"
              label="Mit Challenge-Bewerbung"
              value={summary.startupsWithApplication}
              sub={`${summary.startupsWithoutApplication} Startups ohne Bewerbung`}
            />
            <ToneCard
              tone="muted"
              label="Sessions"
              value={summary.sessionsCompleted}
              sub={`abgeschlossen, ${summary.sessionsBooked} gebucht${summary.periodApplied ? "" : " (ohne Zeitraum)"}`}
            />
            <ToneCard tone="muted" label="Credits eingelöst" value={summary.creditsRedeemed} sub="bestätigte und abgeschlossene Buchungen" />
            <ToneCard
              tone="attention"
              label="Partner-Retention"
              value={summary.retention ? formatRate(summary.retention.rate) : "n. v."}
              sub={
                summary.retention
                  ? `${summary.retention.retained} von ${summary.retention.previousPartners} aus „${summary.retention.previousBatchName}“`
                  : "kein früherer Batch gleichen Typs"
              }
            />
          </div>
          <Card className="p-4 text-xs leading-relaxed text-lv-secondary">
            <p>
              <strong className="text-lv-text">Match</strong>: Matrix-Zelle, in der Startup
              und Partner die Relevanz beide mit „Hoch“ bewertet haben.{" "}
              <strong className="text-lv-text">Pilot</strong>: Matrix „Pilot vereinbart“,
              ein nicht abgebrochenes Engagement mit dem Partner oder ein PoC auf einer
              Partner-Challenge. <strong className="text-lv-text">Match zu Pilot</strong>:
              Anteil der Matches dieses Batches, deren Paar einen Pilot hat.
            </p>
          </Card>

          <SectionLabel number="03" label="Partner" title="Partner im Batch" />
          {partnerRows.length === 0 ? (
            <p className="text-sm text-lv-secondary">Diesem Batch sind noch keine Partner zugeordnet.</p>
          ) : (
            <TableCard>
              <THead>
                <tr>
                  <Th>Partner</Th>
                  <Th className="text-right">Bewertet</Th>
                  <Th className="text-right">Matches</Th>
                  <Th className="text-right">Piloten</Th>
                </tr>
              </THead>
              <tbody>
                {partnerRows.map((r) => (
                  <Tr key={r.partner.id}>
                    <Td>
                      <Link href={`/insights/partner/${r.partner.slug}`} className="font-semibold text-lv-blue hover:underline">
                        {r.partner.name}
                      </Link>
                    </Td>
                    <Td className="text-right tabular-nums">{r.ratedPairings}</Td>
                    <Td className="text-right tabular-nums">{r.matches}</Td>
                    <Td className="text-right tabular-nums">{r.pilots}</Td>
                  </Tr>
                ))}
              </tbody>
            </TableCard>
          )}

          <SectionLabel number="04" label="Startups" title="Startups im Batch" />
          {startupRows.length === 0 ? (
            <p className="text-sm text-lv-secondary">Diesem Batch sind noch keine Startups zugeordnet.</p>
          ) : (
            <TableCard>
              <THead>
                <tr>
                  <Th>Startup</Th>
                  <Th>Branche</Th>
                  <Th className="text-right">Matches</Th>
                  <Th className="text-right">Piloten (alle Partner)</Th>
                  <Th className="text-right">Challenge-Bewerbungen</Th>
                  <Th className="text-right">Sessions</Th>
                  <Th className="text-right">Credits</Th>
                </tr>
              </THead>
              <tbody>
                {startupRows.map((r) => (
                  <Tr key={r.startup.id}>
                    <Td>
                      <Link href={`/insights/startup/${r.startup.id}`} className="font-semibold text-lv-blue hover:underline">
                        {r.startup.name}
                      </Link>
                    </Td>
                    <Td className="text-lv-secondary">{r.startup.industry}</Td>
                    <Td className="text-right tabular-nums">{r.matches}</Td>
                    <Td className="text-right tabular-nums">{r.pilots}</Td>
                    <Td className="text-right tabular-nums">{r.applications}</Td>
                    <Td className="text-right tabular-nums">{r.sessionsCompleted}</Td>
                    <Td className="text-right tabular-nums">{r.creditsRedeemed}</Td>
                  </Tr>
                ))}
              </tbody>
            </TableCard>
          )}

          {industries.length > 0 && (
            <>
              <SectionLabel number="05" label="Branchen" title="Nach Branche" />
              <TableCard>
                <THead>
                  <tr>
                    <Th>Branche</Th>
                    <Th className="text-right">Startups</Th>
                    <Th className="text-right">Matches</Th>
                    <Th className="text-right">Piloten</Th>
                  </tr>
                </THead>
                <tbody>
                  {industries.map((r) => (
                    <Tr key={r.industry}>
                      <Td className="font-semibold">{r.industry}</Td>
                      <Td className="text-right tabular-nums">{r.startups}</Td>
                      <Td className="text-right tabular-nums">{r.matches}</Td>
                      <Td className="text-right tabular-nums">{r.pilots}</Td>
                    </Tr>
                  ))}
                </tbody>
              </TableCard>
            </>
          )}
        </>
      )}

      <SectionLabel
        number="06"
        label="Datenqualität"
        title="Was für vollständige KPIs fehlt"
        actions={<SnapshotNowButton />}
      />
      <Card className="p-4 text-sm text-lv-secondary">
        {snapshot.lastTakenOn ? (
          <p>
            Historie seit {formatDate(snapshot.firstTakenOn)}, letzter Snapshot{" "}
            {formatDate(snapshot.lastTakenOn)} ({snapshot.rows} gespeicherte Zustände).
            Zeitraum-Auswertungen sind ab dem ersten Snapshot möglich.
          </p>
        ) : (
          <p>
            Noch kein Snapshot gespeichert. Ohne Snapshots gibt es keine Historie: Werte
            können nur als „Stand heute“ ausgewertet werden.
          </p>
        )}
      </Card>
      <TableCard>
        <THead>
          <tr>
            <Th>Prüfung</Th>
            <Th className="text-right">Betroffen</Th>
            <Th>Hinweis</Th>
          </tr>
        </THead>
        <tbody>
          {quality.map((q) => (
            <Tr key={q.key}>
              <Td className="font-semibold">{q.label}</Td>
              <Td
                className={cn(
                  "text-right tabular-nums",
                  q.count > 0 ? "font-semibold text-lv-orange" : "text-lv-mint-deep"
                )}
              >
                {q.count} / {q.total}
              </Td>
              <Td className="text-xs text-lv-secondary">{q.hint}</Td>
            </Tr>
          ))}
        </tbody>
      </TableCard>
    </>
  );
}
