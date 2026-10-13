import { NextResponse } from "next/server";
import { takeInsightsSnapshot } from "@/lib/insights/snapshot";

// ---------------------------------------------------------------------------
// Cron entrypoint for the daily KPI-Insights snapshot (read-only on all source
// tables, appends to MetricSnapshot). Same contract as /api/cron/reminders: an
// external scheduler POSTs with `Authorization: Bearer <CRON_SECRET>`; without
// a configured secret only non-production may call it.
// ---------------------------------------------------------------------------

export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await takeInsightsSnapshot();
  return NextResponse.json({ ok: true, ...result });
}

export function GET() {
  return NextResponse.json(
    { error: "Method Not Allowed: use POST to take the insights snapshot." },
    { status: 405, headers: { Allow: "POST" } }
  );
}
