"use client";

import { Camera, FileSpreadsheet } from "lucide-react";
import { useState, useTransition } from "react";
import { runInsightsSnapshot } from "@/app/actions/insights";
import { Button } from "@/components/ui/Button";
import type { ExportSheet } from "@/lib/insights/export";
import { toast } from "@/stores/useToast";

/** Downloads the flat KPI fact sheets as one XLSX workbook. */
export function InsightsExportButton({ sheets }: { sheets: ExportSheet[] }) {
  const [busy, setBusy] = useState(false);

  const onExport = async () => {
    setBusy(true);
    try {
      const XLSX = await import("xlsx");
      const book = XLSX.utils.book_new();
      for (const sheet of sheets) {
        XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(sheet.rows), sheet.name);
      }
      const stamp = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(book, `lovedis-insights-${stamp}.xlsx`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button onClick={onExport} disabled={busy} variant="white" size="sm">
      <FileSpreadsheet className="h-4 w-4" />
      {busy ? "Export läuft…" : "Excel exportieren"}
    </Button>
  );
}

/** Runs the daily history snapshot on demand (same job as the cron). */
export function SnapshotNowButton() {
  const [pending, startTransition] = useTransition();

  const onClick = () =>
    startTransition(async () => {
      const result = await runInsightsSnapshot();
      if (result.error) toast.error(result.error);
      else if (result.success) toast.success(result.success);
    });

  return (
    <Button onClick={onClick} disabled={pending} variant="secondary" size="sm">
      <Camera className="h-4 w-4" />
      {pending ? "Snapshot läuft…" : "Snapshot jetzt erstellen"}
    </Button>
  );
}
