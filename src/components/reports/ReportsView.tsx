"use client";

import { FileDown, FileSpreadsheet, FileText } from "lucide-react";
import { useRef, useState } from "react";
import { RecommendationBadge, ScorePill } from "@/components/shared/badges";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Wordmark } from "@/components/ui/Wordmark";
import type { Recommendation } from "@/generated/prisma/enums";
import {
  DIMENSION_LABELS,
  RECOMMENDATION_LABELS,
  SCORE_DIMENSIONS,
} from "@/lib/constants";

export interface ReportRow {
  startup: string;
  industry: string;
  stage: string;
  pipeline: string;
  evaluator: string;
  date: string;
  scores: Record<string, number>;
  potential: number;
  feasibility: number;
  overall: number;
  recommendation: Recommendation;
}

function toFlatRows(rows: ReportRow[]) {
  return rows.map((r) => ({
    Startup: r.startup,
    Branche: r.industry,
    Phase: r.stage,
    Pipeline: r.pipeline,
    "Bewertet von": r.evaluator,
    Datum: r.date,
    ...Object.fromEntries(
      SCORE_DIMENSIONS.map((d) => [DIMENSION_LABELS[d], r.scores[d] ?? 0])
    ),
    Potenzial: r.potential,
    Machbarkeit: r.feasibility,
    Gesamt: r.overall,
    Empfehlung: RECOMMENDATION_LABELS[r.recommendation],
  }));
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ReportsView({ rows }: { rows: ReportRow[] }) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const stamp = new Date().toISOString().slice(0, 10);

  const exportCsv = async () => {
    setExporting("csv");
    try {
      const { default: Papa } = await import("papaparse");
      const csv = Papa.unparse(toFlatRows(rows));
      download(
        new Blob([csv], { type: "text/csv;charset=utf-8" }),
        `lovedis-portfolio-${stamp}.csv`
      );
    } finally {
      setExporting(null);
    }
  };

  const exportExcel = async () => {
    setExporting("xlsx");
    try {
      const XLSX = await import("xlsx");
      const sheet = XLSX.utils.json_to_sheet(toFlatRows(rows));
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, sheet, "Bewertungen");
      XLSX.writeFile(book, `lovedis-portfolio-${stamp}.xlsx`);
    } finally {
      setExporting(null);
    }
  };

  const exportPdf = async () => {
    if (!reportRef.current) return;
    setExporting("pdf");
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
      });
      const pdf = new jsPDF({ orientation: "landscape", unit: "pt" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 40;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let remaining = imgHeight;
      let offset = 0;
      while (remaining > 0) {
        pdf.addImage(
          canvas.toDataURL("image/png"),
          "PNG",
          20,
          20 - offset,
          imgWidth,
          imgHeight
        );
        remaining -= pageHeight - 40;
        offset += pageHeight - 40;
        if (remaining > 0) pdf.addPage();
      }
      pdf.save(`lovedis-portfolio-${stamp}.pdf`);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <Button onClick={exportPdf} disabled={exporting !== null}>
          <FileText className="h-4 w-4" />
          {exporting === "pdf" ? "PDF wird erstellt…" : "Als PDF exportieren"}
        </Button>
        <Button
          onClick={exportExcel}
          variant="secondary"
          disabled={exporting !== null}
        >
          <FileSpreadsheet className="h-4 w-4" />
          Als Excel exportieren
        </Button>
        <Button
          onClick={exportCsv}
          variant="secondary"
          disabled={exporting !== null}
        >
          <FileDown className="h-4 w-4" />
          Als CSV exportieren
        </Button>
      </div>

      {/* Mobile: simplified stacked summary + note (full table is desktop-only) */}
      <div className="space-y-3 md:hidden">
        <p className="rounded-button border border-lv-border bg-lv-surface px-3 py-2 text-xs text-lv-secondary">
          Die vollständige Tabellen-Vorschau ist für die Desktop-Ansicht
          optimiert. Hier siehst du eine kompakte Zusammenfassung — der Export
          (PDF, Excel, CSV) enthält alle Spalten.
        </p>
        {rows.map((r, i) => (
          <Card key={i} className="space-y-2 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold">{r.startup}</p>
                <p className="text-xs text-lv-secondary">{r.industry}</p>
              </div>
              <ScorePill score={r.overall} />
            </div>
            <div className="flex items-center justify-between gap-2 text-xs text-lv-secondary">
              <span>
                {r.evaluator} · {r.date}
              </span>
              <RecommendationBadge value={r.recommendation} />
            </div>
          </Card>
        ))}
      </div>

      {/* Desktop: full preview. On mobile kept rendered off-screen so PDF export still works. */}
      <Card className="overflow-x-auto lv-scroll max-md:pointer-events-none max-md:fixed max-md:left-[-9999px] max-md:top-0">
        <div ref={reportRef} className="min-w-[960px] bg-white p-8">
          <div className="flex items-end justify-between border-b border-lv-border pb-5">
            <div>
              <Wordmark />
              <h2 className="mt-3 text-xl font-bold tracking-tight">
                Portfolio-Bewertungsbericht
              </h2>
              <p className="text-sm text-lv-secondary">
                {rows.length} Bewertungen · erstellt am {stamp}
              </p>
            </div>
            <span className="lv-wordmark text-xs text-lv-blue">
              Vertraulich
            </span>
          </div>

          <table className="mt-5 w-full text-xs">
            <thead>
              <tr className="bg-lv-surface text-lv-secondary uppercase tracking-wide">
                <th className="px-2.5 py-2 text-left font-semibold">Startup</th>
                <th className="px-2.5 py-2 text-left font-semibold">
                  Bewertet von
                </th>
                {SCORE_DIMENSIONS.map((d) => (
                  <th
                    key={d}
                    className="px-2 py-2 text-center font-semibold"
                    title={DIMENSION_LABELS[d]}
                  >
                    {DIMENSION_LABELS[d].split(" ")[0]}
                  </th>
                ))}
                <th className="px-2.5 py-2 text-right font-semibold">Gesamt</th>
                <th className="px-2.5 py-2 text-right font-semibold">
                  Empfehlung
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-lv-border">
                  <td className="px-2.5 py-2">
                    <span className="font-semibold">{r.startup}</span>
                    <span className="block text-lv-secondary">
                      {r.industry}
                    </span>
                  </td>
                  <td className="px-2.5 py-2 text-lv-secondary">
                    {r.evaluator}
                    <span className="block">{r.date}</span>
                  </td>
                  {SCORE_DIMENSIONS.map((d) => (
                    <td
                      key={d}
                      className="px-2 py-2 text-center tabular-nums"
                    >
                      {r.scores[d] ?? 0}
                    </td>
                  ))}
                  <td className="px-2.5 py-2 text-right">
                    <ScorePill score={r.overall} />
                  </td>
                  <td className="px-2.5 py-2 text-right">
                    <RecommendationBadge value={r.recommendation} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
