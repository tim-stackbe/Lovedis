import { NextResponse } from "next/server";
import { sendWeeklyDigest } from "@/lib/marketing/digest";

// ---------------------------------------------------------------------------
// Weekly marketing summary by email (Mondays). Same contract as
// /api/cron/marketing-sync: POST with `Authorization: Bearer <CRON_SECRET>`.
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
  const result = await sendWeeklyDigest();
  return NextResponse.json({ ok: result.sent > 0, ...result });
}

export function GET() {
  return NextResponse.json(
    { error: "Method Not Allowed: use POST to send the weekly digest." },
    { status: 405, headers: { Allow: "POST" } }
  );
}
