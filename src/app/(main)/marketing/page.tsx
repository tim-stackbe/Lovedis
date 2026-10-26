import { Upload } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { AlertList } from "@/components/marketing/AlertList";
import { fmtChange, fmtDay, fmtInt, fmtRate1 } from "@/components/marketing/format";
import { SyncButton } from "@/components/marketing/MarketingActions";
import { WeeklyChart } from "@/components/marketing/WeeklyChart";
import { formatRate } from "@/components/insights/format";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { BannerStat, Card, ToneCard } from "@/components/ui/Card";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import {
  CONTENT_CHANNEL_LABELS,
  CONTENT_STATUS_CONFIG,
  EMAIL_CATEGORY_LABELS,
  type ContentChannel,
  type ContentStatus,
} from "@/lib/marketing/constants";
import { alertsFor, loadContent, loadEmails, loadIntegrations, loadLinkedIn } from "@/lib/marketing/data";
import { deliveryStats, statsByCategory } from "@/lib/marketing/email";
import { change, engagementRate, inWindow, newFollowers, weeklySeries, windows } from "@/lib/marketing/metrics";
import { loadPlatformKpis, PLATFORM_KPI_LABELS } from "@/lib/marketing/platform";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Marketing Dashboard" };

export default async function MarketingOverviewPage() {
  const now = new Date();
  const { current, previous } = windows(now, 30);
  const [integrations, emails, linkedin, content, platform] = await Promise.all([
    loadIntegrations(),
    loadEmails(),
    loadLinkedIn(),
    loadContent(),
    loadPlatformKpis(current, previous),
  ]);
  const web = integrations.umamiMeta;
  const alerts = alertsFor(now, integrations, emails, content);

  const postsNow = linkedin.posts.filter((p) => inWindow(p.publishedAt, current));
  const postsPrev = linkedin.posts.filter((p) => inWindow(p.publishedAt, previous));
  const impressionsNow = postsNow.reduce((s, p) => s + p.impressions, 0);
  const impressionsPrev = postsPrev.reduce((s, p) => s + p.impressions, 0);
  const followersNow = newFollowers(linkedin.followers, current);
  const followersPrev = newFollowers(linkedin.followers, previous);
  const rateNow = engagementRate(postsNow);
  const mail30 = deliveryStats(emails.filter((e) => inWindow(e.sentAt, current)));
  const hasLinkedIn = linkedin.posts.length > 0 || linkedin.followers.length > 0;
  const followerTotal = integrations.linkedinMeta?.followerTotal ?? null;

  const top = [...linkedin.posts].sort((a, b) => b.impressions - a.impressions).slice(0, 4);
  const upcoming = content.items
    .filter((i) => i.status !== "PUBLISHED")
    .sort((a, b) => (a.plannedFor?.getTime() ?? Infinity) - (b.plannedFor?.getTime() ?? Infinity))
    .slice(0, 6);

  const sub = (c: number | null, fallback: string) => fmtChange(c) ?? fallback;

  return (
    <>
      <HeroBanner
        kicker="Marketing"
        title="Marketing Dashboard"
        subtitle="Reichweite, Engagement und Zustellung der letzten 30 Tage an einem Ort: LinkedIn, Website, E-Mail und Newsletter über Resend, die Plattform selbst und der Redaktionsplan."
        actions={
          <>
            <SyncButton variant="white" />
            <LinkButton href="/marketing/linkedin" variant="white" size="sm">
              <Upload className="h-4 w-4" />
              LinkedIn-Export hochladen
            </LinkButton>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          <BannerStat label="LinkedIn-Follower" value={followerTotal ? fmtInt(followerTotal) : "n. v."} />
          <BannerStat
            label={`Neue Follower · ${hasLinkedIn ? sub(change(followersNow, followersPrev), "30 T") : "30 T"}`}
            value={hasLinkedIn ? fmtInt(followersNow) : "n. v."}
          />
          <BannerStat
            label={`Impressionen · ${hasLinkedIn ? sub(change(impressionsNow, impressionsPrev), "30 T") : "30 T"}`}
            value={hasLinkedIn ? fmtInt(impressionsNow) : "n. v."}
          />
          <BannerStat label="Engagement-Rate" value={fmtRate1(rateNow)} />
          <BannerStat
            label={`Website · ${web ? sub(change(web.stats.visitors, web.previous.visitors), "30 T") : "30 T"}`}
            value={web ? fmtInt(web.stats.visitors) : "n. v."}
          />
          <BannerStat label="E-Mail-Zustellung · 30 T" value={formatRate(mail30.rate)} />
        </div>
      </HeroBanner>

      <SectionLabel number="01" label="Handlungsbedarf" title="Warnungen" />
      <AlertList alerts={alerts} />

      <SectionLabel number="02" label="Plattform" title="Was auf der Plattform ankommt (30 Tage)" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {platform.map((k) => (
          <ToneCard
            key={k.key}
            tone={k.key === "accounts" || k.key === "applications" ? "info" : "muted"}
            label={PLATFORM_KPI_LABELS[k.key].label}
            value={fmtInt(k.current)}
            sub={
              k.previous === null
                ? PLATFORM_KPI_LABELS[k.key].hint
                : k.previous === 0
                  ? k.current > 0
                    ? "neu, in den 30 Tagen davor 0"
                    : "auch in den 30 Tagen davor 0"
                  : `${fmtChange(change(k.current, k.previous))} (davor ${fmtInt(k.previous)})`
            }
          />
        ))}
      </div>

      <SectionLabel number="03" label="LinkedIn" title="Reichweite der letzten 12 Wochen" />
      {hasLinkedIn ? (
        <div className="grid gap-4 lg:grid-cols-5">
          <Card className="p-5 lg:col-span-3">
            <p className="text-sm font-semibold text-lv-text">Impressionen und neue Follower je Woche</p>
            <p className="mb-3 text-xs text-lv-secondary">Impressionen nach Veröffentlichungswoche der Beiträge</p>
            <WeeklyChart data={weeklySeries(linkedin.posts, linkedin.followers, now)} />
          </Card>
          <Card className="p-5 lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-lv-text">Top-Beiträge</p>
              <Link href="/marketing/linkedin" className="text-xs font-semibold text-lv-blue hover:underline">
                Alle →
              </Link>
            </div>
            <ul className="divide-y divide-lv-border">
              {top.map((p) => (
                <li key={p.id} className="flex items-start justify-between gap-3 py-2.5">
                  <a href={p.url} target="_blank" rel="noreferrer" className="min-w-0 text-sm font-medium text-lv-text hover:text-lv-blue">
                    <span className="line-clamp-2">{p.title}</span>
                    <span className="mt-0.5 block text-xs font-normal text-lv-secondary">{fmtDay(p.publishedAt)}</span>
                  </a>
                  <span className="shrink-0 text-right text-xs text-lv-secondary">
                    <b className="block text-sm text-lv-text tabular-nums">{fmtInt(p.impressions)}</b>
                    Impr.
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      ) : (
        <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
          <p className="text-sm text-lv-secondary">
            Noch keine LinkedIn-Daten. Bis die LinkedIn-API freigegeben ist, kommen die Zahlen aus dem Export der Unternehmensseite.
          </p>
          <LinkButton href="/marketing/linkedin" size="sm">
            <Upload className="h-4 w-4" />
            Export hochladen
          </LinkButton>
        </Card>
      )}

      <SectionLabel number="04" label="E-Mail & Planung" title="Zustellung und nächste Beiträge" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-lv-text">E-Mail-Zustellung nach Kategorie</p>
            <Link href="/marketing/email" className="text-xs font-semibold text-lv-blue hover:underline">
              Details →
            </Link>
          </div>
          {emails.length === 0 ? (
            <p className="text-sm text-lv-secondary">Noch keine Daten. „Jetzt abrufen“ lädt alle Mails aus Resend.</p>
          ) : (
            <ul className="space-y-3">
              {statsByCategory(emails).map(({ category, stats }) => (
                <li key={category}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-medium text-lv-text">{EMAIL_CATEGORY_LABELS[category]}</span>
                    <span className={cn("tabular-nums", stats.failed > 0 ? "font-semibold text-lv-orange" : "text-lv-secondary")}>
                      {stats.delivered} von {stats.total} zugestellt
                    </span>
                  </div>
                  <div className="mt-1.5 flex h-2 overflow-hidden rounded-full bg-lv-surface">
                    <span className="bg-lv-mint-deep" style={{ width: `${(stats.delivered / stats.total) * 100}%` }} />
                    <span className="bg-lv-orange" style={{ width: `${(stats.failed / stats.total) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-lv-text">Nächste Beiträge</p>
            <Link href="/marketing/redaktionsplan" className="text-xs font-semibold text-lv-blue hover:underline">
              Redaktionsplan →
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-sm text-lv-secondary">Noch nichts geplant.</p>
          ) : (
            <ul className="divide-y divide-lv-border">
              {upcoming.map((i) => {
                const st = CONTENT_STATUS_CONFIG[i.status as ContentStatus];
                return (
                  <li key={i.id} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-lv-text">{i.title}</span>
                      <span className="text-xs text-lv-secondary">
                        {fmtDay(i.plannedFor)} · {CONTENT_CHANNEL_LABELS[i.channel as ContentChannel] ?? i.channel}
                      </span>
                    </span>
                    {st && <Badge tone={st.tone}>{st.label}</Badge>}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
