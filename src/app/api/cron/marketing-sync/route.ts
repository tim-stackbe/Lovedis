import { NextResponse } from "next/server";
import { syncResend } from "@/lib/marketing/resend-sync";

// ---------------------------------------------------------------------------
// Daily Marketing Dashboard sync (Resend emails, suppressions, broadcasts).
// Same contract as /api/cron/insights-snapshot: POST with
// `Authorization: Bearer <CRON_SECRET>`; without a secret only non-production.
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
  const resend = await syncResend();
  return NextResponse.json({ ok: resend.ok, resend });
}

export function GET() {
  return NextResponse.json(
    { error: "Method Not Allowed: use POST to run the marketing sync." },
    { status: 405, headers: { Allow: "POST" } }
  );
}
