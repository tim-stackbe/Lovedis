import { sendEmail } from "@/lib/email";
import { CONTENT_STATUS_CONFIG, type ContentStatus } from "./constants";
import { alertsFor, loadContent, loadEmails, loadIntegrations, loadLinkedIn, loadWebTraffic } from "./data";
import { deliveryStats } from "./email";
import { inWindow, newFollowers, windows } from "./metrics";
import { alertRecipients, appBaseUrl, weeklyDigestMail } from "./notify";
import { loadPlatformKpis } from "./platform";

const DAY = 86_400_000;

export async function buildWeeklyDigest(now = new Date()) {
  const { current, previous } = windows(now, 7);
  const [integrations, emails, linkedin, content, traffic, platform] = await Promise.all([
    loadIntegrations(),
    loadEmails(),
    loadLinkedIn(),
    loadContent(),
    loadWebTraffic(),
    loadPlatformKpis(current, previous),
  ]);

  const posts = linkedin.posts.filter((p) => inWindow(p.publishedAt, current));
  const followers = newFollowers(linkedin.followers, current);
  const hasLinkedIn = posts.length > 0 || followers > 0;

  const sum = (w: typeof current, key: "pageviews" | "visitors") =>
    traffic.filter((d) => inWindow(d.day, w)).reduce((s, d) => s + d[key], 0);
  const web =
    integrations.umami?.lastSyncAt && traffic.length > 0
      ? { pageviews: sum(current, "pageviews"), visits: sum(current, "visitors"), previousVisits: sum(previous, "visitors") }
      : null;

  const in7 = now.getTime() + 7 * DAY;
  const upcoming = content.items
    .filter((i) => i.status !== "PUBLISHED" && i.plannedFor && i.plannedFor.getTime() <= in7 && i.plannedFor >= current.from)
    .map((i) => ({
      title: i.title,
      plannedFor: i.plannedFor,
      status: CONTENT_STATUS_CONFIG[i.status as ContentStatus]?.label ?? i.status,
    }));

  return weeklyDigestMail({
    now,
    baseUrl: appBaseUrl(),
    mail: deliveryStats(emails.filter((e) => inWindow(e.sentAt, current))),
    platform,
    web,
    linkedin: hasLinkedIn
      ? { posts: posts.length, impressions: posts.reduce((s, p) => s + p.impressions, 0), newFollowers: followers }
      : null,
    content: {
      inReview: content.items.filter((i) => i.status === "IN_REVIEW").length,
      published: content.items.filter((i) => i.status === "PUBLISHED" && inWindow(i.updatedAt, current)).length,
      upcoming,
    },
    alerts: alertsFor(now, integrations, emails, content),
  });
}

export async function sendWeeklyDigest(now = new Date()): Promise<{ sent: number; recipients: number }> {
  const mail = await buildWeeklyDigest(now);
  const recipients = await alertRecipients();
  let sent = 0;
  for (const to of recipients) {
    if ((await sendEmail({ to, ...mail })).ok) sent++;
  }
  return { sent, recipients: recipients.length };
}
