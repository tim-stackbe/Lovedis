import { prisma } from "@/lib/prisma";
import { buildMarketingAlerts } from "./alerts";
import { isFailedEvent } from "./email";
import type { ResendMeta } from "./resend-sync";
import { resendApiKey, resendWebhookSecret } from "./resend-sync";

export interface LinkedInMeta {
  followerTotal?: number;
  followerTotalAt?: string;
}

export async function loadIntegrations() {
  const rows = await prisma.marketingIntegration.findMany();
  const byProvider = new Map(rows.map((r) => [r.provider, r]));
  const resend = byProvider.get("RESEND") ?? null;
  const linkedin = byProvider.get("LINKEDIN") ?? null;
  return {
    resend,
    resendMeta: (resend?.meta as ResendMeta | null) ?? null,
    resendConfigured: resendApiKey() !== null,
    webhookConfigured: resendWebhookSecret() !== null,
    linkedin,
    linkedinMeta: (linkedin?.meta as LinkedInMeta | null) ?? null,
  };
}

export async function loadEmails() {
  return prisma.marketingEmail.findMany({ orderBy: { sentAt: "desc" } });
}

export async function loadLinkedIn() {
  const [posts, followers] = await Promise.all([
    prisma.linkedInPost.findMany({ orderBy: { publishedAt: "desc" } }),
    prisma.linkedInFollowerDay.findMany({ orderBy: { day: "asc" } }),
  ]);
  return { posts, followers };
}

export async function loadContent() {
  const [items, admins] = await Promise.all([
    prisma.contentItem.findMany({ orderBy: [{ plannedFor: "asc" }, { createdAt: "asc" }] }),
    prisma.user.findMany({
      where: { role: "ADMIN", isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return { items, admins, nameById: new Map(admins.map((a) => [a.id, a.name])) };
}

type Integrations = Awaited<ReturnType<typeof loadIntegrations>>;
type Emails = Awaited<ReturnType<typeof loadEmails>>;
type Content = Awaited<ReturnType<typeof loadContent>>;

export function alertsFor(now: Date, integrations: Integrations, emails: Emails, content: Content) {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return buildMarketingAlerts({
    now,
    resendConfigured: integrations.resendConfigured,
    webhookConfigured: integrations.webhookConfigured,
    resendLastSyncAt: integrations.resend?.lastSyncAt ?? null,
    resendLastError: integrations.resend?.lastError ?? null,
    failedEmails: emails.filter((e) => isFailedEvent(e.lastEvent)),
    linkedInLastImportAt: integrations.linkedin?.lastSyncAt ?? null,
    inReview: content.items.filter((i) => i.status === "IN_REVIEW").length,
    overdue: content.items.filter(
      (i) => i.status !== "PUBLISHED" && i.plannedFor && i.plannedFor.getTime() < today.getTime()
    ).length,
  });
}
