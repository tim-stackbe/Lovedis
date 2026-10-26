import { EMAIL_CATEGORIES, type EmailCategory } from "./constants";

/** Delivery outcomes that mean the recipient never got the mail. */
export const FAILED_EVENTS = ["bounced", "suppressed", "complained", "failed"] as const;
/** Outcomes that count as delivered (opened/clicked imply delivery). */
export const DELIVERED_EVENTS = ["delivered", "opened", "clicked"] as const;

export function isFailedEvent(event: string): boolean {
  return (FAILED_EVENTS as readonly string[]).includes(event);
}

export function isDeliveredEvent(event: string): boolean {
  return (DELIVERED_EVENTS as readonly string[]).includes(event);
}

/**
 * Category of a sent mail. Platform mails are recognized by their subject
 * (see src/lib/*-email.ts), the homepage contact form by "Neue Kontaktanfrage",
 * Resend broadcasts are the newsletter.
 */
export function classifyEmail(
  subject: string,
  opts: { broadcastId?: string | null; tag?: string | null } = {}
): EmailCategory {
  const tag = opts.tag?.toUpperCase();
  if (tag && (EMAIL_CATEGORIES as readonly string[]).includes(tag)) return tag as EmailCategory;
  if (opts.broadcastId) return "NEWSLETTER";
  const s = subject.toLowerCase();
  // Our own marketing alerts (notify.ts) mention "Kontakt" and "Support" in the subject.
  if (s.startsWith("[lovedis marketing]")) return "OTHER";
  if (s.includes("kontaktanfrage")) return "CONTACT";
  if (s.includes("passwort")) return "PASSWORD";
  if (s.includes("support")) return "SUPPORT";
  if (s.startsWith("check-in fällig") || s.includes("erinnerung")) return "REMINDER";
  if (s.includes("zugang") || s.includes("willkommen") || s.includes("einladung")) return "INVITE";
  if (s.includes("newsletter")) return "NEWSLETTER";
  return "OTHER";
}

export function domainOf(address: string | undefined | null): string | null {
  if (!address) return null;
  const at = address.lastIndexOf("@");
  if (at < 0) return null;
  return address.slice(at + 1).replace(/>.*$/, "").trim().toLowerCase() || null;
}

/**
 * Full recipient address, kept only when delivery failed (needed to fix it).
 * Successful mails keep just the domain (`toDomain`).
 */
export function storedRecipient(to: string[], lastEvent: string): string | null {
  if (!isFailedEvent(lastEvent)) return null;
  return to.join(", ") || null;
}

export interface EmailRowLike {
  category: string;
  lastEvent: string;
  sentAt: Date;
  broadcastId?: string | null;
  openedAt?: Date | null;
  clickedAt?: Date | null;
}

export interface DeliveryStats {
  total: number;
  delivered: number;
  failed: number;
  bounced: number;
  suppressed: number;
  complained: number;
  pending: number;
  /** delivered / (delivered + failed); null without a final outcome. */
  rate: number | null;
}

export function deliveryStats(rows: EmailRowLike[]): DeliveryStats {
  const s: DeliveryStats = {
    total: rows.length,
    delivered: 0,
    failed: 0,
    bounced: 0,
    suppressed: 0,
    complained: 0,
    pending: 0,
    rate: null,
  };
  for (const r of rows) {
    if (isDeliveredEvent(r.lastEvent)) s.delivered++;
    else if (isFailedEvent(r.lastEvent)) {
      s.failed++;
      if (r.lastEvent === "bounced") s.bounced++;
      if (r.lastEvent === "suppressed") s.suppressed++;
      if (r.lastEvent === "complained") s.complained++;
    } else s.pending++;
  }
  const final = s.delivered + s.failed;
  s.rate = final > 0 ? s.delivered / final : null;
  return s;
}

export function statsByCategory(rows: EmailRowLike[]): { category: EmailCategory; stats: DeliveryStats }[] {
  return EMAIL_CATEGORIES.map((category) => ({
    category,
    stats: deliveryStats(rows.filter((r) => r.category === category)),
  })).filter((c) => c.stats.total > 0);
}

export interface BroadcastStats {
  recipients: number;
  delivered: number;
  opened: number;
  clicked: number;
  openRate: number | null;
  clickRate: number | null;
}

/** Newsletter engagement per broadcast; opens/clicks arrive via the webhook. */
export function broadcastStats(rows: EmailRowLike[], broadcastId: string): BroadcastStats {
  const mine = rows.filter((r) => r.broadcastId === broadcastId);
  const delivered = mine.filter((r) => isDeliveredEvent(r.lastEvent)).length;
  const opened = mine.filter((r) => r.openedAt || r.lastEvent === "opened" || r.lastEvent === "clicked").length;
  const clicked = mine.filter((r) => r.clickedAt || r.lastEvent === "clicked").length;
  return {
    recipients: mine.length,
    delivered,
    opened,
    clicked,
    openRate: delivered > 0 ? opened / delivered : null,
    clickRate: delivered > 0 ? clicked / delivered : null,
  };
}

/**
 * Resend reports one `last_event` per mail. A later webhook may only move the
 * state forward: a delayed "delivered" must not overwrite "bounced", and
 * "opened" must not be downgraded to "delivered".
 */
const EVENT_RANK: Record<string, number> = {
  queued: 0,
  scheduled: 0,
  sent: 1,
  delivery_delayed: 2,
  delivered: 3,
  opened: 4,
  clicked: 5,
  canceled: 6,
  failed: 6,
  bounced: 7,
  suppressed: 7,
  complained: 8,
};

export function laterEvent(current: string, incoming: string): string {
  return (EVENT_RANK[incoming] ?? 0) >= (EVENT_RANK[current] ?? 0) ? incoming : current;
}
