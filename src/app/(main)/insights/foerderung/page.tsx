import { ArrowLeft, CalendarDays, Link2, MessageSquareHeart } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { InsightsExportButton } from "@/components/insights/InsightsActions";
import { countLabel, formatEur } from "@/components/insights/format";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { BannerStat, Card } from "@/components/ui/Card";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { TableCard, Td, Th, THead, Tr } from "@/components/ui/Table";
import { requireAdmin } from "@/lib/auth-guards";
import { loadInsightsDataset } from "@/lib/insights/data";
import { buildExportSheets, buildFundingSheets } from "@/lib/insights/export";
import { buildFundingReport, FUNDING_PERIOD, KPI_STATUS_LABELS, type KpiStatus } from "@/lib/insights/funding";
import { loadFundingDataset } from "@/lib/insights/funding-data";
import { cn, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Insights · Förderung" };

const STATUS_TONES: Record<KpiStatus, BadgeTone> = {
  reached: "mint",
  progress: "blue",
  missing: "muted",
  warning: "orange",
  info: "yellow",
};

function daysText(days: number): string {
  if (days < 0) return "vorbei";
  return countLabel(days, "Tag", "Tage");
}

export default async function FundingPage() {
  await requireAdmin();
  const [ds, fd] = await Promise.all([loadInsightsDataset(), loadFundingDataset()]);
  const report = buildFundingReport(ds, fd);
  const features = buildExportSheets(ds).find((s) => s.name === "Förder-Merkmale");
  const sheets = [...buildFundingSheets(ds, fd, report), ...(features ? [features] : [])];
  const aidTotal = report.formats.reduce((s, f) => s + f.aidTotalEur, 0);
  const openChecks = report.checks.filter((c) => c.count > 0);

  return (
    <>
      <HeroBanner
        kicker="Förderung · Hessen Agentur"
        title="Verwendungsnachweis"
        subtitle={`Soll/Ist der KPIs aus dem Antrag (Abschnitt 3.1). Förderzeitraum ${formatDate(FUNDING_PERIOD.start)} bis ${formatDate(FUNDING_PERIOD.end)}, Nachweis bis ${formatDate(FUNDING_PERIOD.reportDue)}. Nur lesend aus den bestehenden Werkzeugen; Veranstaltungen kommen aus Luma und Attio.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <LinkButton href="/insights" variant="white" size="sm">
              <ArrowLeft className="h-4 w-4" />
              Insights
            </LinkButton>
            <LinkButton href="/insights/foerderung/setup" variant="white" size="sm">
              <Link2 className="h-4 w-4" />
              Formate zuordnen
            </LinkButton>
            <LinkButton href="/insights/foerderung/events" variant="white" size="sm">
              <CalendarDays className="h-4 w-4" />
              Veranstaltungen
            </LinkButton>
            <LinkButton href="/insights/foerderung/feedback" variant="white" size="sm">
              <MessageSquareHeart className="h-4 w-4" />
              Feedback-Umfragen
            </LinkButton>
            <InsightsExportButton sheets={sheets} />
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <BannerStat label="bis Förderende" value={daysText(report.daysToPeriodEnd)} />
          <BannerStat label="bis Verwendungsnachweis" value={daysText(report.daysToReportDue)} />
          <BannerStat label="Geförderte Start-ups" value={report.participantIds.size} />
          <BannerStat label="Beihilfewert gesamt" value={formatEur(aidTotal)} />
        </div>
      </HeroBanner>

      <SectionLabel number="01" label="KPIs" title="Soll und Ist laut Antrag" />
      <TableCard>
        <THead>
          <tr>
            <Th>KPI</Th>
            <Th>Soll</Th>
            <Th>Ist</Th>
            <Th>Status</Th>
            <Th>Quelle und Hinweis</Th>
          </tr>
        </THead>
        <tbody>
          {report.kpis.map((k) => (
            <Tr key={k.key}>
              <Td className="font-semibold">{k.label}</Td>
              <Td className="text-xs text-lv-secondary">{k.target}</Td>
              <Td className="tabular-nums font-semibold">{k.actual}</Td>
              <Td>
                <Badge tone={STATUS_TONES[k.status]}>{KPI_STATUS_LABELS[k.status]}</Badge>
              </Td>
              <Td className="text-xs text-lv-secondary">
                {k.source}
                {k.note && <span className="block text-lv-text/70">{k.note}</span>}
              </Td>
            </Tr>
          ))}
        </tbody>
      </TableCard>
      <Card className="p-4 text-xs leading-relaxed text-lv-secondary">
        <p>
          <strong className="text-lv-text">Geförderte Start-ups</strong>: alle Startups in Batches,
          die einem Akzelerator-Format zugeordnet sind, alle mit bestätigter oder abgeschlossener
          Buchung eines zugeordneten Programms und alle mit einem 1:1-Tracking-Eintrag.{" "}
          <strong className="text-lv-text">NPS</strong>: Durchschnitt der Weiterempfehlung (0 bis 10)
          aus allen Feedback-Umfragen, wie im Antrag; der klassische NPS steht als Hinweis daneben.{" "}
          <strong className="text-lv-text">Partner-Bewertungen am Demo Day</strong> laufen über die
          Match-Matrix und zählen als Bewertungen und Aktivität, nicht als Veranstaltungs-KPI.
        </p>
      </Card>

      <SectionLabel number="02" label="Formate" title="Teilnehmende und Beihilfewert je Format" />
      <TableCard>
        <THead>
          <tr>
            <Th>Format</Th>
            <Th>Zugeordnet</Th>
            <Th className="text-right">Teilnehmende</Th>
            <Th className="text-right">Soll</Th>
            <Th className="text-right">Beihilfe je Startup</Th>
            <Th className="text-right">Beihilfe gesamt</Th>
          </tr>
        </THead>
        <tbody>
          {report.formats.map((f) => (
            <Tr key={f.format}>
              <Td className="font-semibold">{f.label}</Td>
              <Td className="text-xs text-lv-secondary">
                {f.format === "ONE_ON_ONE"
                  ? "Pipeline-Tracking (1:1)"
                  : f.refs.length > 0
                    ? f.refs.map((r) => r.name).join(", ")
                    : <span className="text-lv-orange">noch nicht zugeordnet</span>}
              </Td>
              <Td className="text-right tabular-nums">{f.participants}</Td>
              <Td className="text-right tabular-nums text-lv-secondary">
                {f.format === "ONE_ON_ONE" ? `bis ${f.target}` : f.target}
              </Td>
              <Td className="text-right tabular-nums">{formatEur(f.aidEur)}</Td>
              <Td className="text-right tabular-nums font-semibold">{formatEur(f.aidTotalEur)}</Td>
            </Tr>
          ))}
        </tbody>
      </TableCard>

      <SectionLabel
        number="03"
        label="Prüfpunkte"
        title={openChecks.length > 0 ? `${countLabel(openChecks.length, "offener Punkt", "offene Punkte")}` : "Alles erfüllt"}
      />
      <TableCard>
        <THead>
          <tr>
            <Th>Prüfung</Th>
            <Th className="text-right">Betroffen</Th>
            <Th>Hinweis</Th>
          </tr>
        </THead>
        <tbody>
          {report.checks.map((c) => (
            <Tr key={c.key}>
              <Td className="font-semibold">{c.label}</Td>
              <Td
                className={cn(
                  "text-right tabular-nums",
                  c.count === 0
                    ? "text-lv-mint-deep"
                    : c.severity === "error"
                      ? "font-semibold text-lv-orange"
                      : "font-semibold text-lv-yellow-deep"
                )}
              >
                {c.count} / {c.total}
              </Td>
              <Td className="text-xs text-lv-secondary">{c.hint}</Td>
            </Tr>
          ))}
        </tbody>
      </TableCard>

      <SectionLabel number="04" label="Begünstigte" title="Geförderte Start-ups je Format" />
      {report.beneficiaries.length === 0 ? (
        <p className="text-sm text-lv-secondary">
          Noch keine geförderten Start-ups. Ordnet zuerst Batches und Programme den Formaten zu.
        </p>
      ) : (
        <TableCard>
          <THead>
            <tr>
              <Th>Startup</Th>
              <Th>Format</Th>
              <Th className="text-right">Beihilfewert</Th>
            </tr>
          </THead>
          <tbody>
            {report.beneficiaries.map((b) => (
              <Tr key={`${b.startupId}:${b.format}`}>
                <Td>
                  <Link href={`/insights/startup/${b.startupId}`} className="font-semibold text-lv-blue hover:underline">
                    {b.startupName}
                  </Link>
                </Td>
                <Td className="text-lv-secondary">{b.formatLabel}</Td>
                <Td className="text-right tabular-nums">{formatEur(b.aidEur)}</Td>
              </Tr>
            ))}
          </tbody>
        </TableCard>
      )}
    </>
  );
}
