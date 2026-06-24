import { NextResponse } from "next/server";
import { processDueReminders } from "@/lib/reminders";

// ---------------------------------------------------------------------------
// Cron entrypoint for processing due check-in reminders.
//
// This route does the work; the *scheduling* still needs to be wired to an
// external trigger (e.g. a Cloudflare Cron Trigger or Vercel Cron) that hits
// this endpoint periodically. When CRON_SECRET is set, the trigger must send
// it as `Authorization: Bearer <CRON_SECRET>`; if unset (local/dev) the route
// is open. See docs/mara-implementation-notes.md.
// ---------------------------------------------------------------------------

export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // no secret configured (local/dev)
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

async function handle(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await processDueReminders();
  return NextResponse.json({ ok: true, ...result });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
