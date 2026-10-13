"use client";

import dynamic from "next/dynamic";
import type { ReportRow } from "./ReportsView";

// Loaded client-side only. Keeps heavy export libs (xlsx, jspdf, html2canvas,
// papaparse) out of the server/Worker bundle.
const ReportsView = dynamic(
  () => import("./ReportsView").then((m) => m.ReportsView),
  { ssr: false }
);

export function ReportsViewLazy({ rows }: { rows: ReportRow[] }) {
  return <ReportsView rows={rows} />;
}
