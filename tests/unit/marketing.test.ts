import { describe, expect, it } from "vitest";
import { buildMarketingAlerts, type AlertInput } from "@/lib/marketing/alerts";
import { availableActions, nextStatus, parseContentForm } from "@/lib/marketing/content";
import {
  broadcastStats,
  classifyEmail,
  deliveryStats,
  domainOf,
  laterEvent,
  storedRecipient,
} from "@/lib/marketing/email";
import {
  linkedInPostKey,
  parseCount,
  parseDay,
  parseLinkedInSheets,
  parseRate,
} from "@/lib/marketing/linkedin-import";
import { engagementRate, formatBreakdown, isoWeek, newFollowers, weeklySeries, windows } from "@/lib/marketing/metrics";

describe("classifyEmail", () => {
  it.each([
    ["Neue Kontaktanfrage von Frank Schmidt", "CONTACT"],
    ["Passwort zurücksetzen — LOVEDIS", "PASSWORD"],
    ["Dein Zugang zu FingerHaus GmbH auf LOVEDIS", "INVITE"],
    ["Dein LOVEDIS Admin-Zugang", "INVITE"],
    ["Willkommen bei LOVEDIS — Registrierung bestätigt", "INVITE"],
    ["[LOVEDIS Support] Neues Ticket #12: Login", "SUPPORT"],
    ["Check-in fällig: Acme", "REMINDER"],
    ["Etwas anderes", "OTHER"],
  ])("%s → %s", (subject, category) => {
    expect(classifyEmail(subject)).toBe(category);
  });

  it("treats broadcasts as newsletter and honours an explicit tag", () => {
    expect(classifyEmail("Oktober bei LOVEDIS", { broadcastId: "b1" })).toBe("NEWSLETTER");
    expect(classifyEmail("Irgendwas", { tag: "support" })).toBe("SUPPORT");
    expect(classifyEmail("Irgendwas", { tag: "unknown" })).toBe("OTHER");
  });
});

describe("email helpers", () => {
  it("keeps full recipients only for failed deliveries", () => {
    expect(storedRecipient(["a@x.de"], "delivered")).toBeNull();
    expect(storedRecipient(["a@x.de", "b@y.de"], "bounced")).toBe("a@x.de, b@y.de");
    expect(domainOf("Name <a@Example.de>")).toBe("example.de");
    expect(domainOf(undefined)).toBeNull();
  });

  it("only moves the delivery state forward", () => {
    expect(laterEvent("sent", "delivered")).toBe("delivered");
    expect(laterEvent("bounced", "delivered")).toBe("bounced");
    expect(laterEvent("opened", "delivered")).toBe("opened");
    expect(laterEvent("delivered", "complained")).toBe("complained");
  });

  it("computes the delivery rate over final outcomes only", () => {
    const d = new Date();
    const s = deliveryStats([
      { category: "CONTACT", lastEvent: "delivered", sentAt: d },
      { category: "CONTACT", lastEvent: "clicked", sentAt: d },
      { category: "CONTACT", lastEvent: "bounced", sentAt: d },
      { category: "CONTACT", lastEvent: "suppressed", sentAt: d },
      { category: "CONTACT", lastEvent: "sent", sentAt: d },
    ]);
    expect(s).toMatchObject({ total: 5, delivered: 2, failed: 2, bounced: 1, suppressed: 1, pending: 1 });
    expect(s.rate).toBe(0.5);
    expect(deliveryStats([]).rate).toBeNull();
  });

  it("counts newsletter opens and clicks per broadcast", () => {
    const d = new Date();
    const rows = [
      { category: "NEWSLETTER", lastEvent: "clicked", sentAt: d, broadcastId: "b1", openedAt: d, clickedAt: d },
      { category: "NEWSLETTER", lastEvent: "opened", sentAt: d, broadcastId: "b1", openedAt: d },
      { category: "NEWSLETTER", lastEvent: "delivered", sentAt: d, broadcastId: "b1" },
      { category: "NEWSLETTER", lastEvent: "bounced", sentAt: d, broadcastId: "b1" },
      { category: "NEWSLETTER", lastEvent: "delivered", sentAt: d, broadcastId: "b2" },
    ];
    const s = broadcastStats(rows, "b1");
    expect(s).toMatchObject({ recipients: 4, delivered: 3, opened: 2, clicked: 1 });
    expect(s.openRate).toBeCloseTo(2 / 3);
  });
});

describe("LinkedIn import", () => {
  it("parses counts, rates and dates in LinkedIn and German formats", () => {
    expect(parseCount("1,234")).toBe(1234);
    expect(parseCount("12.345")).toBe(12345);
    expect(parseCount(87)).toBe(87);
    expect(parseCount("")).toBe(0);
    expect(parseRate(0.0612)).toBeCloseTo(0.0612);
    expect(parseRate("6,1 %")).toBeCloseTo(0.061);
    expect(parseRate("")).toBeNull();
    expect(parseDay("10/20/2026")?.toISOString()).toBe("2026-10-20T00:00:00.000Z");
    expect(parseDay("20.10.2026")?.toISOString()).toBe("2026-10-20T00:00:00.000Z");
    expect(parseDay("2026-10-20")?.toISOString()).toBe("2026-10-20T00:00:00.000Z");
    expect(parseDay(46315)?.toISOString()).toBe("2026-10-20T00:00:00.000Z");
    expect(parseDay("02/30/2026")).toBeNull();
    expect(parseDay("kein Datum")).toBeNull();
  });

  it("derives a stable post key from different LinkedIn URL shapes", () => {
    expect(linkedInPostKey("https://www.linkedin.com/feed/update/urn:li:activity:7254000000000000001/")).toBe(
      "activity:7254000000000000001"
    );
    expect(linkedInPostKey("https://www.linkedin.com/feed/update/urn%3Ali%3Aactivity%3A7254000000000000001")).toBe(
      "activity:7254000000000000001"
    );
    expect(linkedInPostKey("https://www.linkedin.com/posts/lovedis_ki-activity-7254000000000000001-AbCd")).toBe(
      "activity:7254000000000000001"
    );
    expect(linkedInPostKey("https://www.linkedin.com/pulse/artikel/?trk=x")).toBe("linkedin.com/pulse/artikel");
    expect(linkedInPostKey("  ")).toBeNull();
  });

  it("finds the header below the description line and maps English columns", () => {
    const rows = [
      ["All posts data for the selected date range"],
      [
        "Post title",
        "Post link",
        "Post type",
        "Campaign name",
        "Posted by",
        "Created date",
        "Campaign start date",
        "Audience",
        "Impressions",
        "Views (excluding off-site video views)",
        "Clicks",
        "Click through rate (CTR)",
        "Likes",
        "Comments",
        "Reposts",
        "Follows",
        "Engagement rate",
        "Content Type",
      ],
      [
        "KI Resilience Day",
        "https://www.linkedin.com/feed/update/urn:li:activity:7254000000000000001",
        "Organic",
        "",
        "Hannah",
        "10/20/2026",
        "",
        "All followers",
        "6,920",
        "",
        312,
        0.045,
        148,
        21,
        4,
        2,
        0.0702,
        "Document",
      ],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["Ohne Link", "", "Organic", "", "", "10/21/2026", "", "", 10],
    ];
    const r = parseLinkedInSheets([{ name: "All posts", rows }]);
    expect(r.recognized).toEqual(["All posts (Beiträge)"]);
    expect(r.skippedRows).toBe(1);
    expect(r.posts).toHaveLength(1);
    expect(r.posts[0]).toMatchObject({
      postKey: "activity:7254000000000000001",
      title: "KI Resilience Day",
      postType: "Document",
      postedBy: "Hannah",
      impressions: 6920,
      clicks: 312,
      reactions: 148,
      comments: 21,
      reposts: 4,
      follows: 2,
    });
    expect(r.posts[0].publishedAt.toISOString()).toBe("2026-10-20T00:00:00.000Z");
    expect(r.posts[0].engagementRate).toBeCloseTo(0.0702);
  });

  it("reads German column names and follower sheets, ignores unknown sheets", () => {
    const r = parseLinkedInSheets([
      {
        name: "Beiträge",
        rows: [
          ["Beitragstitel", "Beitragslink", "Erstellt am", "Impressionen", "Klicks", "Reaktionen", "Kommentare"],
          ["Challenge", "https://www.linkedin.com/feed/update/urn:li:share:7254000000000000009", "14.10.2026", 5410, 266, 97, 14],
        ],
      },
      {
        name: "New followers",
        rows: [
          ["Date", "Sponsored followers", "Organic followers", "Auto-invited followers", "Total followers"],
          ["10/20/2026", 0, 7, 0, 7],
          ["10/21/2026", 1, 4, 0, 5],
        ],
      },
      { name: "Locations", rows: [["Location", "Total followers"], ["Marburg", 300]] },
    ]);
    expect(r.recognized).toEqual(["Beiträge (Beiträge)", "New followers (Follower)"]);
    expect(r.posts[0]).toMatchObject({ postKey: "share:7254000000000000009", impressions: 5410, reactions: 97 });
    expect(r.followers).toEqual([
      { day: new Date("2026-10-20T00:00:00Z"), organic: 7, sponsored: 0 },
      { day: new Date("2026-10-21T00:00:00Z"), organic: 4, sponsored: 1 },
    ]);
  });
});

describe("marketing metrics", () => {
  const post = (iso: string, impressions: number, clicks: number, postType = "Image") => ({
    publishedAt: new Date(iso),
    postType,
    impressions,
    clicks,
    reactions: 0,
    comments: 0,
    reposts: 0,
    follows: 0,
  });

  it("weights the engagement rate by impressions", () => {
    expect(engagementRate([post("2026-10-01", 1000, 50), post("2026-10-02", 100, 50)])).toBeCloseTo(100 / 1100);
    expect(engagementRate([])).toBeNull();
  });

  it("groups by format and sorts by rate", () => {
    const rows = formatBreakdown([post("2026-10-01", 100, 10, "Video"), post("2026-10-01", 100, 2), post("2026-10-01", 100, 4)]);
    expect(rows.map((r) => r.format)).toEqual(["Video", "Image"]);
    expect(rows[1]).toMatchObject({ posts: 2, impressions: 200 });
  });

  it("sums new followers inside the window and builds ISO week buckets", () => {
    const now = new Date("2026-10-26T10:00:00Z");
    const { current } = windows(now, 30);
    const days = [
      { day: new Date("2026-10-20T00:00:00Z"), organic: 5, sponsored: 1 },
      { day: new Date("2026-08-01T00:00:00Z"), organic: 50, sponsored: 0 },
    ];
    expect(newFollowers(days, current)).toBe(6);
    expect(isoWeek(new Date("2026-10-26T00:00:00Z"))).toBe(44);
    const series = weeklySeries([post("2026-10-20", 500, 5)], days, now, 3);
    expect(series.map((s) => s.week)).toEqual(["KW 42", "KW 43", "KW 44"]);
    expect(series[1]).toMatchObject({ impressions: 500, newFollowers: 6, posts: 1 });
  });
});

describe("Redaktionsplan", () => {
  it("allows approval only from review and keeps the workflow linear", () => {
    expect(nextStatus("IDEA", "submit")).toBe("IN_REVIEW");
    expect(nextStatus("IDEA", "approve")).toBeNull();
    expect(nextStatus("IN_REVIEW", "approve")).toBe("SCHEDULED");
    expect(nextStatus("IN_REVIEW", "reject")).toBe("DRAFT");
    expect(nextStatus("SCHEDULED", "publish")).toBe("PUBLISHED");
    expect(nextStatus("DRAFT", "publish")).toBeNull();
    expect(availableActions("IN_REVIEW")).toEqual(["approve", "reject"]);
    expect(availableActions("PUBLISHED")).toEqual(["reopen"]);
  });

  it("validates the content form", () => {
    const fd = new FormData();
    fd.set("title", "Startup-Spotlight");
    fd.set("channel", "LINKEDIN");
    fd.set("format", "");
    fd.set("plannedFor", "2026-10-27");
    fd.set("publishedUrl", "");
    const ok = parseContentForm(fd);
    expect(ok.data).toMatchObject({ id: null, title: "Startup-Spotlight", format: null, publishedUrl: null });
    expect(ok.data?.plannedFor?.toISOString()).toBe("2026-10-27T00:00:00.000Z");

    fd.set("publishedUrl", "linkedin.com/x");
    expect(parseContentForm(fd).error).toMatch(/http/);
    fd.set("publishedUrl", "");
    fd.set("channel", "TIKTOK");
    expect(parseContentForm(fd).error).toBeTruthy();
  });
});

describe("buildMarketingAlerts", () => {
  const now = new Date("2026-10-26T10:00:00Z");
  const base: AlertInput = {
    now,
    resendConfigured: true,
    webhookConfigured: true,
    resendLastSyncAt: new Date("2026-10-26T08:00:00Z"),
    resendLastError: null,
    failedEmails: [],
    linkedInLastImportAt: new Date("2026-10-24T08:00:00Z"),
    inReview: 0,
    overdue: 0,
  };

  it("is quiet when everything is fine", () => {
    expect(buildMarketingAlerts(base)).toEqual([]);
  });

  it("raises a critical alert for undelivered contact form mails with the recipient", () => {
    const alerts = buildMarketingAlerts({
      ...base,
      webhookConfigured: false,
      failedEmails: [
        {
          category: "CONTACT",
          subject: "Neue Kontaktanfrage von Alex Trampisch",
          sentAt: new Date("2026-10-22T12:39:00Z"),
          lastEvent: "bounced",
          recipient: "berckan.guerrero@yumeda.de",
        },
        {
          category: "CONTACT",
          subject: "Alt",
          sentAt: new Date("2026-08-01T12:00:00Z"),
          lastEvent: "bounced",
          recipient: "x@y.de",
        },
      ],
    });
    expect(alerts[0]).toMatchObject({ key: "email-failed-CONTACT", level: "critical" });
    expect(alerts[0].title).toContain("1 Mail nicht zugestellt");
    expect(alerts[0].detail).toContain("berckan.guerrero@yumeda.de");
    expect(alerts[0].detail).not.toContain("x@y.de");
    expect(alerts.map((a) => a.key)).toContain("resend-webhook");
  });

  it("flags stale LinkedIn data, sync errors and pending approvals", () => {
    const keys = buildMarketingAlerts({
      ...base,
      resendLastError: "401 invalid key",
      linkedInLastImportAt: new Date("2026-10-10T08:00:00Z"),
      inReview: 2,
    }).map((a) => a.key);
    expect(keys).toEqual(["resend-error", "content-review", "linkedin-stale"]);
  });
});
