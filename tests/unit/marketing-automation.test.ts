import { describe, expect, it } from "vitest";
import { buildMarketingAlerts, type AlertInput } from "@/lib/marketing/alerts";
import { classifyEmail, deliveryStats } from "@/lib/marketing/email";
import {
  ALERT_SUBJECT_PREFIX,
  failureAlertMail,
  pendingFailures,
  weeklyDigestMail,
  type FailedMail,
} from "@/lib/marketing/notify";
import {
  avgVisitSeconds,
  bounceRate,
  bucketDay,
  fmtDuration,
  lastDays,
  mergeDailySeries,
  trackingSnippet,
} from "@/lib/marketing/umami";

const NOW = new Date("2026-10-26T12:00:00Z");
const DAY = 86_400_000;
const DASHES = /[\u2013\u2014]/;

function failed(over: Partial<FailedMail> = {}): FailedMail {
  return {
    id: "e1",
    category: "CONTACT",
    subject: "Neue Kontaktanfrage von Frank Schmidt",
    sentAt: new Date(NOW.getTime() - DAY),
    lastEvent: "bounced",
    recipient: "berckan.guerrero@yumeda.de",
    problem: "550 5.2.1 The email account that you tried to reach is inactive",
    ...over,
  };
}

describe("pendingFailures", () => {
  it("returns new failed contact and support mails, oldest first", () => {
    const rows = [
      failed({ id: "b", sentAt: new Date(NOW.getTime() - DAY) }),
      failed({ id: "a", category: "SUPPORT", lastEvent: "suppressed", sentAt: new Date(NOW.getTime() - 2 * DAY) }),
    ];
    expect(pendingFailures(rows, new Set(), NOW).map((r) => r.id)).toEqual(["a", "b"]);
  });

  it("skips already notified, delivered, non-critical and stale mails", () => {
    const rows = [
      failed({ id: "known" }),
      failed({ id: "ok", lastEvent: "delivered" }),
      failed({ id: "invite", category: "INVITE" }),
      failed({ id: "old", sentAt: new Date(NOW.getTime() - 15 * DAY) }),
    ];
    expect(pendingFailures(rows, new Set(["known"]), NOW)).toEqual([]);
  });
});

describe("failureAlertMail", () => {
  it("names recipient, reason and dashboard link without dashes", () => {
    const mail = failureAlertMail([failed()], "https://alpha.lovedis.de");
    expect(mail.subject.startsWith(ALERT_SUBJECT_PREFIX)).toBe(true);
    expect(mail.subject).toContain("1 Mail nicht zugestellt (Kontaktformular Homepage)");
    expect(mail.text).toContain("berckan.guerrero@yumeda.de");
    expect(mail.text).toContain("inactive");
    expect(mail.text).toContain("https://alpha.lovedis.de/marketing/email");
    expect(mail.subject + mail.text).not.toMatch(DASHES);
  });

  it("is never classified as a critical mail itself (no alert loop)", () => {
    const support = failureAlertMail([failed({ category: "SUPPORT" })], "x");
    expect(classifyEmail(support.subject)).toBe("OTHER");
    const digest = weeklyDigestMail(digestInput());
    expect(classifyEmail(digest.subject)).toBe("OTHER");
  });
});

function digestInput(over: Partial<Parameters<typeof weeklyDigestMail>[0]> = {}) {
  return {
    now: NOW,
    baseUrl: "https://alpha.lovedis.de",
    mail: deliveryStats([
      { category: "INVITE", lastEvent: "delivered", sentAt: NOW },
      { category: "CONTACT", lastEvent: "bounced", sentAt: NOW },
    ]),
    platform: [
      { key: "accounts" as const, current: 6, previous: 4 },
      { key: "activeUsers" as const, current: 20, previous: null },
    ],
    web: { pageviews: 900, visits: 300, previousVisits: 200 },
    linkedin: null,
    content: { inReview: 1, published: 2, upcoming: [{ title: "Startup-Spotlight", plannedFor: NOW, status: "Geplant" }] },
    alerts: [
      { key: "x", level: "critical" as const, title: "Kontaktformular: 1 Mail nicht zugestellt", detail: "" },
      { key: "y", level: "info" as const, title: "Nur Info", detail: "" },
    ],
    ...over,
  };
}

describe("weeklyDigestMail", () => {
  it("summarises all channels with trends and urgent alerts only", () => {
    const { subject, text } = weeklyDigestMail(digestInput());
    expect(subject).toContain("1 offene Warnungen");
    expect(text).toContain("• Kontaktformular: 1 Mail nicht zugestellt");
    expect(text).not.toContain("Nur Info");
    expect(text).toContain("Neue Konten: 6 (+50 % zur Vorwoche)");
    expect(text).toContain("Aktive Nutzer: 20\n");
    expect(text).toContain("Besuche: 300 (+50 % zur Vorwoche)");
    expect(text).toContain("Bitte den Export aus LinkedIn Page Analytics hochladen");
    expect(text).toContain("Zustellrate: 50 %");
    expect(text).toContain("Startup-Spotlight (Geplant)");
    expect(subject + text).not.toMatch(DASHES);
  });

  it("explains missing website data", () => {
    const { text } = weeklyDigestMail(digestInput({ web: null, alerts: [] }));
    expect(text).toContain("Umami-Tracking auf lovedis.de noch nicht aktiv");
    expect(text).toContain("Keine offenen Warnungen.");
  });
});

describe("umami helpers", () => {
  it("builds the tracking snippet", () => {
    expect(trackingSnippet("https://stats.example", "abc")).toBe(
      '<script defer src="https://stats.example/script.js" data-website-id="abc"></script>'
    );
  });

  it("maps day buckets to UTC midnight and merges series", () => {
    expect(bucketDay("2026-10-26T00:00:00Z")?.toISOString()).toBe("2026-10-26T00:00:00.000Z");
    expect(bucketDay("2026-10-26 00:00:00")?.toISOString()).toBe("2026-10-26T00:00:00.000Z");
    expect(bucketDay("kaputt")).toBeNull();
    const merged = mergeDailySeries(
      [
        { x: "2026-10-26T00:00:00Z", y: 5 },
        { x: "2026-10-25T00:00:00Z", y: 3 },
      ],
      [{ x: "2026-10-26T00:00:00Z", y: 2 }]
    );
    expect(merged.map((d) => [d.day.toISOString().slice(0, 10), d.pageviews, d.visitors])).toEqual([
      ["2026-10-25", 3, 0],
      ["2026-10-26", 5, 2],
    ]);
  });

  it("fills missing days with zero up to today in Berlin", () => {
    const late = new Date("2026-10-26T23:30:00Z"); // already 27.10. in Berlin
    const days = lastDays([{ day: new Date("2026-10-26T00:00:00Z"), pageviews: 4, visitors: 1 }], late, 3);
    expect(days.map((d) => [d.day.toISOString().slice(0, 10), d.pageviews])).toEqual([
      ["2026-10-25", 0],
      ["2026-10-26", 4],
      ["2026-10-27", 0],
    ]);
  });

  it("computes bounce rate and visit duration", () => {
    const s = { pageviews: 10, visitors: 4, visits: 5, bounces: 2, totaltime: 600 };
    expect(bounceRate(s)).toBe(0.4);
    expect(avgVisitSeconds(s)).toBe(120);
    expect(fmtDuration(125)).toBe("2:05 min");
    expect(bounceRate({ ...s, visits: 0 })).toBeNull();
    expect(fmtDuration(null)).toBe("n. v.");
  });
});

describe("umami alerts", () => {
  const base: AlertInput = {
    now: NOW,
    resendConfigured: true,
    webhookConfigured: true,
    resendLastSyncAt: NOW,
    resendLastError: null,
    failedEmails: [],
    linkedInLastImportAt: NOW,
    inReview: 0,
    overdue: 0,
  };
  const keys = (input: AlertInput) => buildMarketingAlerts(input).map((a) => a.key);

  it("stays silent without umami input or with traffic", () => {
    expect(keys(base)).toEqual([]);
    expect(keys({ ...base, umami: { configured: true, lastSyncAt: NOW, lastError: null, pageviews30: 12 } })).toEqual([]);
  });

  it("flags missing config, errors and a missing tracking script", () => {
    expect(keys({ ...base, umami: { configured: false, lastSyncAt: null, lastError: null, pageviews30: 0 } })).toEqual([
      "umami-missing",
    ]);
    expect(keys({ ...base, umami: { configured: true, lastSyncAt: NOW, lastError: "HTTP 401", pageviews30: 0 } })).toEqual([
      "umami-error",
    ]);
    expect(keys({ ...base, umami: { configured: true, lastSyncAt: NOW, lastError: null, pageviews30: 0 } })).toEqual([
      "umami-no-traffic",
    ]);
  });
});
