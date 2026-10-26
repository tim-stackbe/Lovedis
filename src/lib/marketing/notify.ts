import type { Prisma } from "@/generated/prisma/client";
import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import type { MarketingAlert } from "./alerts";
import { CRITICAL_EMAIL_CATEGORIES, EMAIL_CATEGORY_LABELS, EMAIL_EVENT_LABELS, type EmailCategory } from "./constants";
import { FAILED_EVENTS, type DeliveryStats } from "./email";
import { PLATFORM_KPI_LABELS, type PlatformKpi } from "./platform";

// ---------------------------------------------------------------------------
// Marketing notifications by email: an immediate alert when a contact-form or
// support mail was not delivered, and a weekly summary on Mondays.
// Every subject starts with ALERT_SUBJECT_PREFIX so classifyEmail files these
// mails under OTHER; a bounced alert must never trigger another alert.
// ---------------------------------------------------------------------------

export const ALERT_SUBJECT_PREFIX = "[LOVEDIS Marketing]";
const STATE_PROVIDER = "ALERTS";
const DAY = 86_400_000;
/** Failures older than this are not alerted any more (already stale news). */
const ALERT_WINDOW_DAYS = 14;
const MAX_REMEMBERED = 500;

export function appBaseUrl(): string {
  return (process.env.AUTH_URL || process.env.NEXTAUTH_URL || "https://alpha.lovedis.de").replace(/\/+$/, "");
}

/** MARKETING_ALERT_TO (comma separated) or, by default, all active admins. */
export async function alertRecipients(): Promise<string[]> {
  const configured = (process.env.MARKETING_ALERT_TO ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (configured.length > 0) return configured;
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", isActive: true },
    select: { email: true },
  });
  return admins.map((a) => a.email).filter(Boolean);
}

function berlinDateTime(d: Date): string {
  return d.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  });
}

function berlinDay(d: Date): string {
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", timeZone: "Europe/Berlin" });
}

export interface FailedMail {
  id: string;
  category: string;
  subject: string;
  sentAt: Date;
  lastEvent: string;
  recipient: string | null;
  problem: string | null;
}

/** Failed critical mails of the alert window that nobody was told about yet. */
export function pendingFailures(rows: FailedMail[], notified: Set<string>, now: Date): FailedMail[] {
  const since = now.getTime() - ALERT_WINDOW_DAYS * DAY;
  return rows
    .filter(
      (r) =>
        CRITICAL_EMAIL_CATEGORIES.includes(r.category as EmailCategory) &&
        (FAILED_EVENTS as readonly string[]).includes(r.lastEvent) &&
        r.sentAt.getTime() >= since &&
        !notified.has(r.id)
    )
    .sort((a, b) => a.sentAt.getTime() - b.sentAt.getTime());
}

export function failureAlertMail(rows: FailedMail[], baseUrl: string): { subject: string; text: string } {
  const categories = [...new Set(rows.map((r) => EMAIL_CATEGORY_LABELS[r.category as EmailCategory] ?? r.category))];
  const subject = `${ALERT_SUBJECT_PREFIX} Warnung: ${rows.length} ${rows.length === 1 ? "Mail" : "Mails"} nicht zugestellt (${categories.join(", ")})`;
  const lines = rows.map((r) => {
    const parts = [
      `• ${berlinDateTime(r.sentAt)}: ${r.subject}`,
      `  Status: ${EMAIL_EVENT_LABELS[r.lastEvent] ?? r.lastEvent}`,
      r.recipient ? `  Empfänger: ${r.recipient}` : null,
      r.problem ? `  Grund: ${r.problem}` : null,
    ];
    return parts.filter(Boolean).join("\n");
  });
  const text =
    `Diese ${rows.length === 1 ? "Mail hat" : "Mails haben"} ihren Empfänger nicht erreicht. ` +
    `Bei Kontaktanfragen bedeutet das meist einen verlorenen Lead, bitte die Anfrage direkt beantworten ` +
    `und die Empfängeradresse prüfen.\n\n` +
    `${lines.join("\n\n")}\n\n` +
    `Details im Marketing Dashboard:\n${baseUrl}/marketing/email\n\n` +
    `Diese Warnung kommt automatisch, sobald eine Kontakt- oder Support-Mail scheitert.`;
  return { subject, text };
}

interface AlertState {
  notified: string[];
}

export interface NotifyResult {
  sent: number;
  mails: number;
  seeded?: number;
  error?: string;
}

/**
 * Sends one alert for all new failed contact/support mails. The first run only
 * remembers what already failed, so switching this on does not resend history.
 */
export async function notifyCriticalFailures(now = new Date()): Promise<NotifyResult> {
  const since = new Date(now.getTime() - ALERT_WINDOW_DAYS * DAY);
  const rows = await prisma.marketingEmail.findMany({
    where: {
      category: { in: CRITICAL_EMAIL_CATEGORIES },
      lastEvent: { in: [...FAILED_EVENTS] },
      sentAt: { gte: since },
    },
    select: { id: true, category: true, subject: true, sentAt: true, lastEvent: true, recipient: true, problem: true },
  });
  const state = await prisma.marketingIntegration.findUnique({ where: { provider: STATE_PROVIDER } });
  const remembered = ((state?.meta as AlertState | null)?.notified ?? []).slice(-MAX_REMEMBERED);

  if (!state) {
    const meta: AlertState = { notified: rows.map((r) => r.id) };
    await prisma.marketingIntegration.create({
      data: { provider: STATE_PROVIDER, meta: meta as unknown as Prisma.InputJsonValue },
    });
    return { sent: 0, mails: 0, seeded: rows.length };
  }

  const pending = pendingFailures(rows, new Set(remembered), now);
  if (pending.length === 0) return { sent: 0, mails: 0 };

  // Remember first: two webhook events arriving together must not alert twice.
  const meta: AlertState = { notified: [...remembered, ...pending.map((p) => p.id)].slice(-MAX_REMEMBERED) };
  await prisma.marketingIntegration.update({
    where: { provider: STATE_PROVIDER },
    data: { meta: meta as unknown as Prisma.InputJsonValue, lastSyncAt: now },
  });

  const recipients = await alertRecipients();
  if (recipients.length === 0) return { sent: 0, mails: pending.length, error: "Keine Empfänger für Warnungen." };
  const mail = failureAlertMail(pending, appBaseUrl());
  let sent = 0;
  for (const to of recipients) {
    const res = await sendEmail({ to, ...mail });
    if (res.ok) sent++;
  }
  if (sent === 0) {
    await prisma.marketingIntegration.update({
      where: { provider: STATE_PROVIDER },
      data: { lastError: "Warnung konnte nicht versendet werden." },
    });
  }
  return { sent, mails: pending.length };
}

// ---------------------------------------------------------------------------
// Weekly summary
// ---------------------------------------------------------------------------

export interface DigestInput {
  now: Date;
  baseUrl: string;
  mail: DeliveryStats;
  platform: PlatformKpi[];
  web: { pageviews: number; visits: number; previousVisits: number } | null;
  linkedin: { posts: number; impressions: number; newFollowers: number } | null;
  content: {
    inReview: number;
    published: number;
    upcoming: { title: string; plannedFor: Date | null; status: string }[];
  };
  alerts: MarketingAlert[];
}

function trend(current: number, previous: number | null): string {
  if (previous === null || previous === 0) return "";
  const pct = Math.round(((current - previous) / previous) * 100);
  return ` (${pct > 0 ? "+" : ""}${pct} % zur Vorwoche)`;
}

const n = (v: number) => v.toLocaleString("de-DE");

export function weeklyDigestMail(input: DigestInput): { subject: string; text: string } {
  const from = new Date(input.now.getTime() - 7 * DAY);
  const period = `${berlinDay(from)} bis ${berlinDay(input.now)}`;
  const urgent = input.alerts.filter((a) => a.level !== "info");
  const subject = `${ALERT_SUBJECT_PREFIX} Wochenübersicht ${period}${urgent.length > 0 ? `, ${urgent.length} offene Warnungen` : ""}`;

  const sections: string[] = [];

  sections.push(
    urgent.length > 0
      ? `HANDLUNGSBEDARF\n${urgent.map((a) => `• ${a.title}`).join("\n")}`
      : "HANDLUNGSBEDARF\nKeine offenen Warnungen."
  );

  sections.push(
    "PLATTFORM (letzte 7 Tage)\n" +
      input.platform.map((k) => `• ${PLATFORM_KPI_LABELS[k.key].label}: ${n(k.current)}${trend(k.current, k.previous)}`).join("\n")
  );

  sections.push(
    "WEBSITE lovedis.de\n" +
      (input.web
        ? `• Besuche: ${n(input.web.visits)}${trend(input.web.visits, input.web.previousVisits)}\n• Seitenaufrufe: ${n(input.web.pageviews)}`
        : "• Noch keine Daten (Umami-Tracking auf lovedis.de noch nicht aktiv).")
  );

  sections.push(
    "LINKEDIN\n" +
      (input.linkedin
        ? `• Beiträge: ${input.linkedin.posts}\n• Impressionen: ${n(input.linkedin.impressions)}\n• Neue Follower: ${n(input.linkedin.newFollowers)}`
        : "• Keine neuen Daten. Bitte den Export aus LinkedIn Page Analytics hochladen.")
  );

  const rate = input.mail.rate === null ? "n. v." : `${Math.round(input.mail.rate * 100)} %`;
  sections.push(
    "E-MAIL\n" +
      `• Versendet: ${n(input.mail.total)}, zugestellt: ${n(input.mail.delivered)}, nicht zugestellt: ${n(input.mail.failed)}\n` +
      `• Zustellrate: ${rate}`
  );

  const upcoming = input.content.upcoming.map(
    (u) => `• ${u.plannedFor ? berlinDay(u.plannedFor) : "ohne Datum"}: ${u.title} (${u.status})`
  );
  sections.push(
    "REDAKTIONSPLAN\n" +
      `• Veröffentlicht: ${input.content.published}, warten auf Freigabe: ${input.content.inReview}\n` +
      (upcoming.length > 0 ? `Nächste 7 Tage:\n${upcoming.join("\n")}` : "Nächste 7 Tage: nichts geplant.")
  );

  const text =
    `Wochenübersicht Marketing, ${period}\n\n` +
    `${sections.join("\n\n")}\n\n` +
    `Marketing Dashboard:\n${input.baseUrl}/marketing\n\n` +
    `Diese Übersicht kommt automatisch jeden Montag.`;
  return { subject, text };
}
