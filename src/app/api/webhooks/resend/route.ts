import { NextResponse } from "next/server";
import { notifyCriticalFailures } from "@/lib/marketing/notify";
import { applyResendWebhook, resendWebhookSecret, verifyResendWebhook } from "@/lib/marketing/resend-sync";

// ---------------------------------------------------------------------------
// Resend delivery events (Marketing Dashboard). Public route: access is
// governed by the Svix signature with RESEND_WEBHOOK_SECRET, not a session.
// ---------------------------------------------------------------------------

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = resendWebhookSecret();
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }
  const payload = await request.text();
  let event;
  try {
    event = verifyResendWebhook(payload, request.headers, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  const applied = await applyResendWebhook(event);
  if (applied) {
    // The event is stored; a failed alert mail must not make Resend redeliver it.
    await notifyCriticalFailures().catch((err) => console.error("[marketing] alert failed:", err));
  }
  return NextResponse.json({ ok: true, applied });
}

export function GET() {
  return NextResponse.json(
    { error: "Method Not Allowed" },
    { status: 405, headers: { Allow: "POST" } }
  );
}
