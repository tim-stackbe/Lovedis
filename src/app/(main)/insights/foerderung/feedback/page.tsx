import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { CopyLinkButton, FeedbackSurveyCreateForm, FeedbackSurveyToggle } from "@/components/insights/FundingForms";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { requireAdmin } from "@/lib/auth-guards";
import { loadInsightsDataset } from "@/lib/insights/data";
import { isSurveyOpen, summarizeFeedback, surveyEligibleStartupIds } from "@/lib/insights/funding";
import { loadFundingDataset } from "@/lib/insights/funding-data";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Insights · Feedback" };

function decimal(n: number | null): string {
  return n === null ? "n. v." : n.toLocaleString("de-DE", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
}

export default async function FundingFeedbackPage() {
  await requireAdmin();
  const [ds, fd, texts] = await Promise.all([
    loadInsightsDataset(),
    loadFundingDataset(),
    prisma.feedbackResponse.findMany({
      where: { OR: [{ goodText: { not: null } }, { improveText: { not: null } }] },
      select: { id: true, surveyId: true, startupId: true, goodText: true, improveText: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);
  const today = new Date();
  const batchName = new Map(ds.batches.map((b) => [b.id, b.name]));
  const programName = new Map(fd.programs.map((p) => [p.id, p.title]));
  const startupName = new Map(ds.startups.map((s) => [s.id, s.name]));
  const scopeName = (kind: string, refId: string) =>
    (kind === "BATCH" ? batchName.get(refId) : programName.get(refId)) ?? "gelöscht";

  const scopes = [
    ...ds.batches.map((b) => ({ value: `BATCH:${b.id}`, label: b.name, group: "Batches" as const })),
    ...fd.programs.map((p) => ({ value: `PROGRAM:${p.id}`, label: p.title, group: "Programme" as const })),
  ];

  return (
    <>
      <HeroBanner
        kicker="Förderung · Feedback"
        title="Feedback-Umfragen"
        subtitle="Kurze Umfrage zum Programmende: Weiterempfehlung (0 bis 10, für den NPS), Gesamtbewertung und zwei offene Fragen. Startups sehen offene Umfragen auf ihrem Dashboard."
        actions={
          <LinkButton href="/insights/foerderung" variant="white">
            <ArrowLeft className="h-4 w-4" />
            Verwendungsnachweis
          </LinkButton>
        }
      />

      <SectionLabel number="01" label="Neu" title="Umfrage öffnen" />
      <FeedbackSurveyCreateForm scopes={scopes} />

      <SectionLabel number="02" label="Umfragen" title="Rücklauf und Ergebnis" />
      {fd.surveys.length === 0 ? (
        <p className="text-sm text-lv-secondary">Noch keine Umfrage geöffnet.</p>
      ) : (
        fd.surveys.map((s) => {
          const eligible = surveyEligibleStartupIds(s, ds, fd);
          const responses = fd.responses.filter((r) => r.surveyId === s.id);
          const summary = summarizeFeedback(responses);
          const open = isSurveyOpen(s, today);
          const answered = new Set(responses.map((r) => r.startupId));
          const missing = [...eligible].filter((id) => !answered.has(id));
          const surveyTexts = texts.filter((t) => t.surveyId === s.id);
          return (
            <Card key={s.id} className="space-y-3 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-lv-text">{s.title}</h3>
                  <p className="text-xs text-lv-secondary">
                    {s.scopeKind === "BATCH" ? "Batch" : "Programm"} „{scopeName(s.scopeKind, s.refId)}“, geöffnet{" "}
                    {formatDate(s.createdAt)}
                    {s.closesOn && `, offen bis ${formatDate(s.closesOn)}`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={open ? "mint" : "muted"}>{open ? "offen" : "geschlossen"}</Badge>
                  <CopyLinkButton path={`/feedback/${s.id}`} />
                  <FeedbackSurveyToggle id={s.id} open={open} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <p>
                  <span className="block text-xs text-lv-secondary">Rücklauf</span>
                  <span className="font-semibold tabular-nums">
                    {summary.responses} von {eligible.size}
                  </span>
                </p>
                <p>
                  <span className="block text-xs text-lv-secondary">Weiterempfehlung (Ø 0 bis 10)</span>
                  <span className="font-semibold tabular-nums">{decimal(summary.recommendAvg)}</span>
                </p>
                <p>
                  <span className="block text-xs text-lv-secondary">Klassischer NPS</span>
                  <span className="font-semibold tabular-nums">{summary.npsClassic ?? "n. v."}</span>
                </p>
                <p>
                  <span className="block text-xs text-lv-secondary">Gesamtbewertung (Ø 1 bis 5)</span>
                  <span className="font-semibold tabular-nums">{decimal(summary.overallAvg)}</span>
                </p>
              </div>
              {missing.length > 0 && (
                <p className="text-xs text-lv-secondary">
                  Noch offen: {missing.map((id) => startupName.get(id) ?? id).join(", ")}
                </p>
              )}
              {surveyTexts.length > 0 && (
                <details className="rounded-button border border-lv-border p-3 text-sm">
                  <summary className="cursor-pointer font-semibold text-lv-text">
                    Offene Antworten ({surveyTexts.length})
                  </summary>
                  <ul className="mt-2 space-y-3">
                    {surveyTexts.map((t) => (
                      <li key={t.id}>
                        <p className="text-xs font-semibold text-lv-secondary">{startupName.get(t.startupId) ?? t.startupId}</p>
                        {t.goodText && <p>Hilfreich: {t.goodText}</p>}
                        {t.improveText && <p>Verbessern: {t.improveText}</p>}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </Card>
          );
        })
      )}
    </>
  );
}
