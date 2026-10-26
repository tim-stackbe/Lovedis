import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Umami (self-hosted on the Hetzner server) → WebTrafficDay + a 30-day
// snapshot in MarketingIntegration.meta. The platform talks to Umami over the
// internal Docker network (UMAMI_API_URL); UMAMI_PUBLIC_URL is the address
// the tracking script on lovedis.de loads from.
// ---------------------------------------------------------------------------

const PROVIDER = "UMAMI";
const DAY = 86_400_000;
const TIMEZONE = "Europe/Berlin";
/** Days re-synced per run; Umami only has data since it was installed. */
const SYNC_DAYS = 90;
const TOP_LIMIT = 10;

export interface UmamiConfig {
  apiUrl: string;
  publicUrl: string;
  apiKey: string;
  websiteId: string;
}

export function umamiConfig(): UmamiConfig | null {
  const apiUrl = process.env.UMAMI_API_URL?.trim() || process.env.UMAMI_PUBLIC_URL?.trim();
  const publicUrl = process.env.UMAMI_PUBLIC_URL?.trim() || apiUrl;
  const apiKey = process.env.UMAMI_API_KEY?.trim();
  const websiteId = process.env.UMAMI_WEBSITE_ID?.trim();
  if (!apiUrl || !publicUrl || !apiKey || !websiteId) return null;
  return { apiUrl: apiUrl.replace(/\/+$/, ""), publicUrl: publicUrl.replace(/\/+$/, ""), apiKey, websiteId };
}

/** The one line that goes into the <head> of lovedis.de. */
export function trackingSnippet(publicUrl: string, websiteId: string): string {
  return `<script defer src="${publicUrl}/script.js" data-website-id="${websiteId}"></script>`;
}

export interface UmamiStats {
  pageviews: number;
  visitors: number;
  visits: number;
  bounces: number;
  totaltime: number;
}

export interface UmamiMetric {
  x: string;
  y: number;
}

export interface UmamiMeta {
  from: string;
  to: string;
  stats: UmamiStats;
  previous: UmamiStats;
  pages: UmamiMetric[];
  referrers: UmamiMetric[];
  campaigns: UmamiMetric[];
  countries: UmamiMetric[];
  devices: UmamiMetric[];
}

/** Share of visits that ended after one page; null without visits. */
export function bounceRate(s: UmamiStats): number | null {
  return s.visits > 0 ? Math.min(s.bounces, s.visits) / s.visits : null;
}

/** Average visit duration in seconds; null without visits. */
export function avgVisitSeconds(s: UmamiStats): number | null {
  return s.visits > 0 ? s.totaltime / s.visits : null;
}

/** "2:05 min" style duration. */
export function fmtDuration(seconds: number | null): string {
  if (seconds === null) return "n. v.";
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")} min`;
}

/** Umami day buckets ("2026-10-26T00:00:00Z" in the requested timezone) → UTC midnight. */
export function bucketDay(x: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(x);
  return m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))) : null;
}

export function mergeDailySeries(
  pageviews: UmamiMetric[],
  sessions: UmamiMetric[]
): { day: Date; pageviews: number; visitors: number }[] {
  const byDay = new Map<number, { day: Date; pageviews: number; visitors: number }>();
  const row = (x: string) => {
    const day = bucketDay(x);
    if (!day) return null;
    const key = day.getTime();
    if (!byDay.has(key)) byDay.set(key, { day, pageviews: 0, visitors: 0 });
    return byDay.get(key)!;
  };
  for (const p of pageviews) {
    const r = row(p.x);
    if (r) r.pageviews += p.y;
  }
  for (const s of sessions) {
    const r = row(s.x);
    if (r) r.visitors += s.y;
  }
  return [...byDay.values()].sort((a, b) => a.day.getTime() - b.day.getTime());
}

/** The last `count` Berlin calendar days up to `now`, missing days as zero. */
export function lastDays(
  rows: { day: Date; pageviews: number; visitors: number }[],
  now: Date,
  count = 30
): { day: Date; pageviews: number; visitors: number }[] {
  const today = bucketDay(now.toLocaleDateString("en-CA", { timeZone: TIMEZONE }))!;
  const byDay = new Map(rows.map((r) => [r.day.getTime(), r]));
  return Array.from({ length: count }, (_, i) => {
    const day = new Date(today.getTime() - (count - 1 - i) * DAY);
    const r = byDay.get(day.getTime());
    return { day, pageviews: r?.pageviews ?? 0, visitors: r?.visitors ?? 0 };
  });
}

function toStats(raw: Partial<UmamiStats> | undefined): UmamiStats {
  return {
    pageviews: Number(raw?.pageviews ?? 0),
    visitors: Number(raw?.visitors ?? 0),
    visits: Number(raw?.visits ?? 0),
    bounces: Number(raw?.bounces ?? 0),
    totaltime: Number(raw?.totaltime ?? 0),
  };
}

function message(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) return String((err as { message: unknown }).message);
  return String(err);
}

async function get<T>(cfg: UmamiConfig, path: string, params: Record<string, string | number>): Promise<T> {
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
  const res = await fetch(`${cfg.apiUrl}/api/websites/${cfg.websiteId}${path}?${qs}`, {
    headers: { Authorization: `Bearer ${cfg.apiKey}`, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Umami ${path}: HTTP ${res.status}`);
  return (await res.json()) as T;
}

export interface UmamiSyncResult {
  ok: boolean;
  days: number;
  visitors30: number;
  error?: string;
}

export async function syncUmami(now = new Date()): Promise<UmamiSyncResult> {
  const cfg = umamiConfig();
  if (!cfg) return { ok: false, days: 0, visitors30: 0, error: "Umami ist nicht konfiguriert (UMAMI_*)." };

  try {
    const endAt = now.getTime();
    const window = { startAt: endAt - 30 * DAY, endAt };
    const metric = (type: string) =>
      get<UmamiMetric[]>(cfg, "/metrics", { ...window, type, limit: TOP_LIMIT, timezone: TIMEZONE });

    const [series, stats, pages, referrers, campaigns, countries, devices] = await Promise.all([
      get<{ pageviews: UmamiMetric[]; sessions: UmamiMetric[] }>(cfg, "/pageviews", {
        startAt: endAt - SYNC_DAYS * DAY,
        endAt,
        unit: "day",
        timezone: TIMEZONE,
      }),
      get<Partial<UmamiStats> & { comparison?: Partial<UmamiStats> }>(cfg, "/stats", {
        ...window,
        compare: "prev",
        timezone: TIMEZONE,
      }),
      metric("path"),
      metric("referrer"),
      metric("utmCampaign"),
      metric("country"),
      metric("device"),
    ]);

    const days = mergeDailySeries(series.pageviews ?? [], series.sessions ?? []);
    for (const d of days) {
      await prisma.webTrafficDay.upsert({
        where: { day: d.day },
        create: d,
        update: { pageviews: d.pageviews, visitors: d.visitors },
      });
    }

    const meta: UmamiMeta = {
      from: new Date(window.startAt).toISOString(),
      to: new Date(window.endAt).toISOString(),
      stats: toStats(stats),
      previous: toStats(stats.comparison),
      pages,
      referrers,
      campaigns,
      countries,
      devices,
    };
    await prisma.marketingIntegration.upsert({
      where: { provider: PROVIDER },
      create: { provider: PROVIDER, lastSyncAt: now, lastError: null, meta: meta as unknown as Prisma.InputJsonValue },
      update: { lastSyncAt: now, lastError: null, meta: meta as unknown as Prisma.InputJsonValue },
    });
    return { ok: true, days: days.length, visitors30: meta.stats.visitors };
  } catch (err) {
    const error = message(err);
    await prisma.marketingIntegration.upsert({
      where: { provider: PROVIDER },
      create: { provider: PROVIDER, lastError: error },
      update: { lastError: error },
    });
    return { ok: false, days: 0, visitors30: 0, error };
  }
}
