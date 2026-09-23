"use client";

import dynamic from "next/dynamic";
import type { ChartDatum } from "./Charts";

// Loaded client-side only. Keeps recharts out of the server/Worker bundle.
const DistributionChart = dynamic(
  () => import("./Charts").then((m) => m.DistributionChart),
  { ssr: false }
);

export function DistributionChartLazy({
  data,
  accentIndex = -1,
}: {
  data: ChartDatum[];
  accentIndex?: number;
}) {
  return <DistributionChart data={data} accentIndex={accentIndex} />;
}

export type { ChartDatum };
