import {
  CRITICAL_EMAIL_CATEGORIES,
  EMAIL_CATEGORY_LABELS,
  LINKEDIN_STALE_DAYS,
  type EmailCategory,
} from "./constants";
import { isFailedEvent } from "./email";

export type AlertLevel = "critical" | "warning" | "info";

export interface MarketingAlert {
  key: string;
  level: AlertLevel;
  title: string;
  detail: string;
  href?: string;
  action?: string;
}

export interface AlertInput {
  now: Date;
  resendConfigured: boolean;
  webhookConfigured: boolean;
  resendLastSyncAt: Date | null;
  resendLastError: string | null;
  failedEmails: { category: string; subject: string; sentAt: Date; lastEvent: string; recipient: string | null }[];
  linkedInLastImportAt: Date | null;
  /** Content items in review, waiting for an admin. */
  inReview: number;
  /** Content items planned in the past but not marked published. */
  overdue: number;
  umami?: {
    configured: boolean;
    lastSyncAt: Date | null;
    lastError: string | null;
    /** Pageviews of the last 30 days according to the last sync. */
    pageviews30: number;
  };
}

const DAY = 86_400_000;

function fmtDay(d: Date): string {
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", timeZone: "Europe/Berlin" });
}

const ORDER: Record<AlertLevel, number> = { critical: 0, warning: 1, info: 2 };

export function buildMarketingAlerts(input: AlertInput): MarketingAlert[] {
  const alerts: MarketingAlert[] = [];
  const since = input.now.getTime() - 30 * DAY;

  const failed = input.failedEmails.filter((e) => isFailedEvent(e.lastEvent) && e.sentAt.getTime() >= since);
  for (const category of CRITICAL_EMAIL_CATEGORIES) {
    const hits = failed.filter((e) => e.category === category);
    if (hits.length === 0) continue;
    const recipients = [...new Set(hits.map((e) => e.recipient).filter(Boolean))];
    alerts.push({
      key: `email-failed-${category}`,
      level: "critical",
      title: `${EMAIL_CATEGORY_LABELS[category as EmailCategory]}: ${hits.length} ${hits.length === 1 ? "Mail" : "Mails"} nicht zugestellt`,
      detail:
        `${hits.map((e) => `${e.subject} (${fmtDay(e.sentAt)})`).join(", ")}.` +
        (recipients.length > 0 ? ` Empfänger: ${recipients.join(", ")}.` : ""),
      href: "/marketing/email",
      action: "Details",
    });
  }
  const otherFailed = failed.filter((e) => !CRITICAL_EMAIL_CATEGORIES.includes(e.category as EmailCategory));
  if (otherFailed.length > 0) {
    alerts.push({
      key: "email-failed-other",
      level: "warning",
      title: `${otherFailed.length} weitere ${otherFailed.length === 1 ? "Mail" : "Mails"} in 30 Tagen nicht zugestellt`,
      detail: "Einladungen, Passwort-Mails oder Erinnerungen haben ihre Empfänger nicht erreicht.",
      href: "/marketing/email",
      action: "Details",
    });
  }

  if (!input.resendConfigured) {
    alerts.push({
      key: "resend-missing",
      level: "warning",
      title: "Resend ist nicht verbunden",
      detail: "RESEND_API_KEY fehlt in dieser Umgebung, es werden keine E-Mail-Daten abgerufen.",
      href: "/marketing/integrationen",
      action: "Integrationen",
    });
  } else if (input.resendLastError) {
    alerts.push({
      key: "resend-error",
      level: "critical",
      title: "Resend-Abruf fehlgeschlagen",
      detail: input.resendLastError,
      href: "/marketing/integrationen",
      action: "Integrationen",
    });
  } else if (!input.resendLastSyncAt || input.now.getTime() - input.resendLastSyncAt.getTime() > 2 * DAY) {
    alerts.push({
      key: "resend-stale",
      level: "warning",
      title: input.resendLastSyncAt ? "E-Mail-Daten sind älter als zwei Tage" : "E-Mail-Daten noch nie abgerufen",
      detail: "Über „Jetzt abrufen“ auf der E-Mail-Seite aktualisieren. Der tägliche Abruf läuft per Cron.",
      href: "/marketing/email",
      action: "Abrufen",
    });
  }
  if (input.resendConfigured && !input.webhookConfigured) {
    alerts.push({
      key: "resend-webhook",
      level: "info",
      title: "Resend-Webhook nicht eingerichtet",
      detail: "Ohne Webhook kommen Bounces erst mit dem nächsten Abruf an, Newsletter-Öffnungen und Klicks gar nicht.",
      href: "/marketing/integrationen",
      action: "Einrichten",
    });
  }

  const umami = input.umami;
  if (umami && !umami.configured) {
    alerts.push({
      key: "umami-missing",
      level: "info",
      title: "Website-Analyse nicht verbunden",
      detail: "Umami-Zugangsdaten (UMAMI_*) fehlen in dieser Umgebung, es werden keine Website-Zahlen abgerufen.",
      href: "/marketing/integrationen",
      action: "Integrationen",
    });
  } else if (umami?.lastError) {
    alerts.push({
      key: "umami-error",
      level: "warning",
      title: "Umami-Abruf fehlgeschlagen",
      detail: umami.lastError,
      href: "/marketing/integrationen",
      action: "Integrationen",
    });
  } else if (umami?.lastSyncAt && umami.pageviews30 === 0) {
    alerts.push({
      key: "umami-no-traffic",
      level: "warning",
      title: "Keine Website-Besuche gemessen",
      detail: "Umami läuft, hat aber in 30 Tagen keinen Besuch auf lovedis.de gezählt. Ist das Tracking-Skript auf der Homepage eingebaut?",
      href: "/marketing/website",
      action: "Skript anzeigen",
    });
  }

  if (!input.linkedInLastImportAt) {
    alerts.push({
      key: "linkedin-never",
      level: "info",
      title: "Noch keine LinkedIn-Daten",
      detail: "Export aus LinkedIn Page Analytics (Inhalte und Follower) hochladen, um Reichweite und Engagement zu sehen.",
      href: "/marketing/linkedin",
      action: "Export hochladen",
    });
  } else {
    const age = Math.floor((input.now.getTime() - input.linkedInLastImportAt.getTime()) / DAY);
    if (age >= LINKEDIN_STALE_DAYS) {
      alerts.push({
        key: "linkedin-stale",
        level: "info",
        title: `LinkedIn-Daten sind ${age} Tage alt`,
        detail: `Letzter Upload am ${fmtDay(input.linkedInLastImportAt)}. Bitte wöchentlich den Export hochladen.`,
        href: "/marketing/linkedin",
        action: "Export hochladen",
      });
    }
  }

  if (input.inReview > 0) {
    alerts.push({
      key: "content-review",
      level: "warning",
      title: `${input.inReview} ${input.inReview === 1 ? "Beitrag wartet" : "Beiträge warten"} auf Freigabe`,
      detail: "Im Redaktionsplan freigeben oder mit Kommentar zurückgeben.",
      href: "/marketing/redaktionsplan",
      action: "Redaktionsplan",
    });
  }
  if (input.overdue > 0) {
    alerts.push({
      key: "content-overdue",
      level: "info",
      title: `${input.overdue} ${input.overdue === 1 ? "Beitrag ist" : "Beiträge sind"} überfällig`,
      detail: "Geplantes Datum liegt in der Vergangenheit, der Beitrag ist aber nicht als veröffentlicht markiert.",
      href: "/marketing/redaktionsplan",
      action: "Redaktionsplan",
    });
  }

  return alerts.sort((a, b) => ORDER[a.level] - ORDER[b.level]);
}
