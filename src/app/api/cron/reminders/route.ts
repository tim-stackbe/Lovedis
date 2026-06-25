import { NextResponse } from "next/server";
import { processDueReminders } from "@/lib/reminders";

// ---------------------------------------------------------------------------
// Cron entrypoint for processing due check-in reminders.
//
// This route does the work; the *scheduling* still needs to be wired to an
// external trigger (e.g. a Cloudflare Cron Trigger or Vercel Cron) that hits
// this endpoint periodically with `Authorization: Bearer <CRON_SECRET>`. The
// trigger MUST use POST — this is a side-effecting endpoint. When CRON_SECRET
// is unset we only allow the open bypass in non-production (local/dev); in
// production a missing secret fails closed. See
// docs/mara-implementation-notes.md.
// ---------------------------------------------------------------------------

export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  // Fail closed in production when no secret is configured; only dev/test may
  // run the cron without one.
  if (!secret) return process.env.NODE_ENV !== "production";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

// Side-effecting trigger: POST only.
export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await processDueReminders();
  return NextResponse.json({ ok: true, ...result });
}

// GET is intentionally non-side-effecting: schedulers must POST. We keep a
// lightweight handler so the path doesn't 405-without-explanation.
export function GET() {
  return NextResponse.json(
    { error: "Method Not Allowed — use POST to trigger reminders." },
    { status: 405, headers: { Allow: "POST" } }
  );
}
