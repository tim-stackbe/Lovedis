"use client";

import { FileDown, FileSpreadsheet, FileText } from "lucide-react";
import Papa from "papaparse";
import { useRef, useState } from "react";
import * as XLSX from "xlsx";
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
    Industry: r.industry,
    Stage: r.stage,
    Pipeline: r.pipeline,
    Evaluator: r.evaluator,
    Date: r.date,
    ...Object.fromEntries(
      SCORE_DIMENSIONS.map((d) => [DIMENSION_LABELS[d], r.scores[d] ?? 0])
    ),
    Potential: r.potential,
    Feasibility: r.feasibility,
    Overall: r.overall,
    Recommendation: RECOMMENDATION_LABELS[r.recommendation],
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

  const exportCsv = () => {
    setExporting("csv");
    try {
      const csv = Papa.unparse(toFlatRows(rows));
      download(
        new Blob([csv], { type: "text/csv;charset=utf-8" }),
        `lovedis-portfolio-${stamp}.csv`
      );
    } finally {
      setExporting(null);
    }
  };

  const exportExcel = () => {
    setExporting("xlsx");
    try {
      const sheet = XLSX.utils.json_to_sheet(toFlatRows(rows));
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, sheet, "Evaluations");
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
          {exporting === "pdf" ? "Rendering PDF…" : "Export PDF"}
        </Button>
        <Button
          onClick={exportExcel}
          variant="secondary"
          disabled={exporting !== null}
        >
          <FileSpreadsheet className="h-4 w-4" />
          Export Excel
        </Button>
        <Button
          onClick={exportCsv}
          variant="secondary"
          disabled={exporting !== null}
        >
          <FileDown className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Card className="overflow-x-auto lv-scroll">
        <div ref={reportRef} className="min-w-[960px] bg-white p-8">
          <div className="flex items-end justify-between border-b border-lv-border pb-5">
            <div>
              <Wordmark />
              <h2 className="mt-3 text-xl font-bold tracking-tight">
                Portfolio evaluation report
              </h2>
              <p className="text-sm text-lv-secondary">
                {rows.length} evaluations · generated {stamp}
              </p>
            </div>
            <span className="lv-wordmark text-xs text-lv-blue">
              Confidential
            </span>
          </div>

          <table className="mt-5 w-full text-xs">
            <thead>
              <tr className="bg-lv-surface text-lv-secondary uppercase tracking-wide">
                <th className="px-2.5 py-2 text-left font-semibold">Startup</th>
                <th className="px-2.5 py-2 text-left font-semibold">
                  Evaluator
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
                <th className="px-2.5 py-2 text-right font-semibold">Overall</th>
                <th className="px-2.5 py-2 text-right font-semibold">
                  Recommendation
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
