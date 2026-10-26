import { Resend, type WebhookEventPayload } from "resend";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { classifyEmail, domainOf, laterEvent, storedRecipient } from "./email";

// ---------------------------------------------------------------------------
// Resend → MarketingEmail. The sync pages through GET /emails (all mails sent
// from this account, including the homepage contact form) and snapshots
// suppressions, broadcasts, domains and webhooks into MarketingIntegration.
// The webhook adds what the list cannot: newsletter opens and clicks.
// ---------------------------------------------------------------------------

const PROVIDER = "RESEND";
const MAX_PAGES = 50;
// Resend allows 2 requests per second per team.
const PAUSE_MS = 600;

export interface ResendMeta {
  suppressions: { email: string; origin: string; createdAt: string }[];
  broadcasts: { id: string; name: string; status: string; sentAt: string | null; createdAt: string }[];
  domains: { name: string; status: string; region: string }[];
  webhooks: { endpoint: string; events: string[] }[];
}

export function resendApiKey(): string | null {
  return process.env.RESEND_API_KEY?.trim() || null;
}

export function resendWebhookSecret(): string | null {
  return process.env.RESEND_WEBHOOK_SECRET?.trim() || null;
}

const pause = () => new Promise((r) => setTimeout(r, PAUSE_MS));

function message(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) return String((err as { message: unknown }).message);
  return String(err);
}

export interface ResendSyncResult {
  ok: boolean;
  emails: number;
  created: number;
  error?: string;
}

export async function syncResend(): Promise<ResendSyncResult> {
  const key = resendApiKey();
  if (!key) return { ok: false, emails: 0, created: 0, error: "RESEND_API_KEY ist nicht gesetzt." };
  const client = new Resend(key);

  try {
    const existing = new Map(
      (await prisma.marketingEmail.findMany({ select: { id: true, lastEvent: true } })).map((e) => [e.id, e.lastEvent])
    );
    let after: string | undefined;
    let seen = 0;
    let created = 0;

    for (let page = 0; page < MAX_PAGES; page++) {
      const { data, error } = await client.emails.list(after ? { limit: 100, after } : { limit: 100 });
      if (error) throw new Error(`E-Mails: ${error.message}`);
      if (!data) break;
      for (const e of data.data) {
        seen++;
        const current = existing.get(e.id);
        const lastEvent = current ? laterEvent(current, e.last_event) : e.last_event;
        const row = {
          subject: e.subject,
          category: classifyEmail(e.subject),
          toDomain: domainOf(e.to[0]),
          recipient: storedRecipient(e.to, lastEvent),
          lastEvent,
          sentAt: new Date(e.created_at),
        };
        await prisma.marketingEmail.upsert({
          where: { id: e.id },
          create: { id: e.id, ...row },
          update: row,
        });
        if (!current) created++;
      }
      if (!data.has_more || data.data.length === 0) break;
      after = data.data[data.data.length - 1].id;
      await pause();
    }

    const meta = await fetchResendMeta(client);
    await prisma.marketingIntegration.upsert({
      where: { provider: PROVIDER },
      create: { provider: PROVIDER, lastSyncAt: new Date(), lastError: null, meta: meta as unknown as Prisma.InputJsonValue },
      update: { lastSyncAt: new Date(), lastError: null, meta: meta as unknown as Prisma.InputJsonValue },
    });
    return { ok: true, emails: seen, created };
  } catch (err) {
    const error = message(err);
    await prisma.marketingIntegration.upsert({
      where: { provider: PROVIDER },
      create: { provider: PROVIDER, lastError: error },
      update: { lastError: error },
    });
    return { ok: false, emails: 0, created: 0, error };
  }
}

async function fetchResendMeta(client: Resend): Promise<ResendMeta> {
  await pause();
  const sup = await client.suppressions.list({ limit: 100 });
  await pause();
  const bc = await client.broadcasts.list({ limit: 100 });
  await pause();
  const dom = await client.domains.list();
  await pause();
  const wh = await client.webhooks.list();
  return {
    suppressions: (sup.data?.data ?? []).map((s) => ({ email: s.email, origin: s.origin, createdAt: s.created_at })),
    broadcasts: (bc.data?.data ?? []).map((b) => ({
      id: b.id,
      name: b.name,
      status: b.status,
      sentAt: b.sent_at,
      createdAt: b.created_at,
    })),
    domains: (dom.data?.data ?? []).map((d) => ({ name: d.name, status: d.status, region: d.region })),
    webhooks: (wh.data?.data ?? []).map((w) => ({ endpoint: w.endpoint, events: w.events ?? [] })),
  };
}

/** Verifies the Svix signature; throws on a forged or stale request. */
export function verifyResendWebhook(payload: string, headers: Headers, secret: string): WebhookEventPayload {
  const client = new Resend(resendApiKey() ?? "re_unused");
  return client.webhooks.verify({
    payload,
    webhookSecret: secret,
    headers: {
      id: headers.get("svix-id") ?? "",
      timestamp: headers.get("svix-timestamp") ?? "",
      signature: headers.get("svix-signature") ?? "",
    },
  });
}

/** Applies one verified webhook event. Returns false for ignored event types. */
export async function applyResendWebhook(event: WebhookEventPayload): Promise<boolean> {
  if (!event.type.startsWith("email.") || event.type === "email.received") return false;
  const data = (event as Extract<WebhookEventPayload, { type: "email.delivered" }>).data;
  const incoming = event.type.slice("email.".length);
  const at = new Date(event.created_at);
  const existing = await prisma.marketingEmail.findUnique({ where: { id: data.email_id } });
  const lastEvent = existing ? laterEvent(existing.lastEvent, incoming) : incoming;
  const problem =
    event.type === "email.bounced"
      ? event.data.bounce.message
      : event.type === "email.failed"
        ? event.data.failed.reason
        : (existing?.problem ?? null);

  const row = {
    subject: data.subject,
    category: classifyEmail(data.subject, { broadcastId: data.broadcast_id, tag: data.tags?.category }),
    toDomain: domainOf(data.to[0]),
    recipient: storedRecipient(data.to, lastEvent),
    lastEvent,
    broadcastId: data.broadcast_id ?? existing?.broadcastId ?? null,
    openedAt: existing?.openedAt ?? (incoming === "opened" || incoming === "clicked" ? at : null),
    clickedAt: existing?.clickedAt ?? (incoming === "clicked" ? at : null),
    problem,
  };
  await prisma.marketingEmail.upsert({
    where: { id: data.email_id },
    create: { id: data.email_id, sentAt: new Date(data.created_at), ...row },
    update: row,
  });
  await prisma.marketingIntegration.upsert({
    where: { provider: PROVIDER },
    create: { provider: PROVIDER, lastWebhookAt: new Date() },
    update: { lastWebhookAt: new Date() },
  });
  return true;
}
