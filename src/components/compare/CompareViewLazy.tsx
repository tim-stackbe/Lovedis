"use client";

import dynamic from "next/dynamic";
import type { CompareStartup } from "./CompareView";

// Loaded client-side only. Keeps recharts out of the server/Worker bundle.
const CompareView = dynamic(
  () => import("./CompareView").then((m) => m.CompareView),
  { ssr: false }
);

export function CompareViewLazy({ startups }: { startups: CompareStartup[] }) {
  return <CompareView startups={startups} />;
}
