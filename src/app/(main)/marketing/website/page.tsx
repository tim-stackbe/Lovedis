import type { Metadata } from "next";
import { DailyTrafficChart } from "@/components/marketing/DailyTrafficChart";
import { fmtChange, fmtDateTime, fmtDay, fmtInt, fmtRate1 } from "@/components/marketing/format";
import { CopySnippetButton, SyncButton } from "@/components/marketing/MarketingActions";
import { Card, ToneCard } from "@/components/ui/Card";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { loadIntegrations, loadWebTraffic } from "@/lib/marketing/data";
import { change } from "@/lib/marketing/metrics";
import {
  avgVisitSeconds,
  bounceRate,
  fmtDuration,
  lastDays,
  trackingSnippet,
  type UmamiMetric,
} from "@/lib/marketing/umami";

export const metadata: Metadata = { title: "Marketing · Website" };

const COUNTRY = new Intl.DisplayNames(["de"], { type: "region" });
const DEVICE_LABELS: Record<string, string> = {
  desktop: "Desktop",
  laptop: "Laptop",
  mobile: "Smartphone",
  tablet: "Tablet",
};

function countryName(code: string): string {
  try {
    return COUNTRY.of(code) ?? code;
  } catch {
    return code;
  }
}

function TopList({
  title,
  rows,
  empty,
  label = (x) => x,
}: {
  title: string;
  rows: UmamiMetric[];
  empty: string;
  label?: (x: string) => string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.y));
  return (
    <Card className="p-5">
      <p className="mb-3 text-sm font-semibold text-lv-text">{title}</p>
      {rows.length === 0 ? (
        <p className="text-sm text-lv-secondary">{empty}</p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((r) => (
            <li key={r.x}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate font-medium text-lv-text">{label(r.x) || "(direkt)"}</span>
                <span className="shrink-0 tabular-nums text-lv-secondary">{fmtInt(r.y)}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-lv-surface">
                <span className="block h-full bg-lv-blue" style={{ width: `${(r.y / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default async function MarketingWebsitePage() {
  const now = new Date();
  const [integrations, traffic] = await Promise.all([loadIntegrations(), loadWebTraffic()]);
  const cfg = integrations.umamiConfig;
  const meta = integrations.umamiMeta;
  const snippet = cfg ? trackingSnippet(cfg.publicUrl, cfg.websiteId) : null;
  const hasTraffic = (meta?.stats.pageviews ?? 0) > 0;

  const sub = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? "neu, davor keine Daten" : "noch keine Daten";
    return `${fmtChange(change(current, previous))} zu den 30 Tagen davor`;
  };

  return (
    <>
      <HeroBanner
        kicker="Marketing · Website"
        title="Website lovedis.de"
        subtitle="Besuche, Quellen und Kampagnen der Homepage, gemessen mit Umami auf unserem eigenen Server. Ohne Cookies, ohne Cookie-Banner, Daten bleiben in Deutschland."
        actions={<SyncButton variant="white" />}
      />

      {!cfg ? (
        <Card className="p-5 text-sm text-lv-secondary">
          Umami ist in dieser Umgebung nicht verbunden. Dafür werden <code>UMAMI_API_URL</code>, <code>UMAMI_PUBLIC_URL</code>,{" "}
          <code>UMAMI_API_KEY</code> und <code>UMAMI_WEBSITE_ID</code> benötigt.
        </Card>
      ) : (
        <>
          {!hasTraffic && snippet && (
            <Card className="space-y-3 border-lv-yellow bg-lv-yellow/30 p-5">
              <p className="text-sm font-semibold text-lv-text">Noch keine Besuche gemessen: Tracking-Skript auf lovedis.de einbauen</p>
              <p className="text-sm text-lv-text/85">
                Diese eine Zeile gehört in den <code>&lt;head&gt;</code> der Homepage (Nuxt: <code>app.head.script</code> in{" "}
                <code>nuxt.config.ts</code>). Danach erscheinen die Zahlen hier mit dem nächsten Abruf.
              </p>
              <pre className="overflow-x-auto rounded-button bg-white p-3 text-xs text-lv-text">{snippet}</pre>
              <CopySnippetButton text={snippet} label="Skript kopieren" />
            </Card>
          )}

          <SectionLabel number="01" label="Kennzahlen" title="Letzte 30 Tage" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <ToneCard
              tone="info"
              label="Besucher"
              value={fmtInt(meta?.stats.visitors ?? 0)}
              sub={meta ? sub(meta.stats.visitors, meta.previous.visitors) : "noch kein Abruf"}
            />
            <ToneCard
              tone="info"
              label="Besuche"
              value={fmtInt(meta?.stats.visits ?? 0)}
              sub={meta ? sub(meta.stats.visits, meta.previous.visits) : undefined}
            />
            <ToneCard
              tone="muted"
              label="Seitenaufrufe"
              value={fmtInt(meta?.stats.pageviews ?? 0)}
              sub={meta ? sub(meta.stats.pageviews, meta.previous.pageviews) : undefined}
            />
            <ToneCard
              tone="muted"
              label="Absprungrate"
              value={meta ? fmtRate1(bounceRate(meta.stats)) : "n. v."}
              sub="Besuche mit nur einer Seite"
            />
            <ToneCard
              tone="success"
              label="Ø Besuchsdauer"
              value={meta ? fmtDuration(avgVisitSeconds(meta.stats)) : "n. v."}
              sub="je Besuch"
            />
          </div>

          <Card className="p-5">
            <p className="mb-3 text-sm font-semibold text-lv-text">Verlauf, 30 Tage</p>
            <DailyTrafficChart
              data={lastDays(traffic, now, 30).map((d) => ({
                day: fmtDay(d.day, false),
                pageviews: d.pageviews,
                visitors: d.visitors,
              }))}
            />
          </Card>

          <SectionLabel number="02" label="Herkunft" title="Woher die Besucher kommen" />
          <div className="grid gap-4 lg:grid-cols-3">
            <TopList title="Quellen" rows={meta?.referrers ?? []} empty="Noch keine verweisenden Seiten." />
            <TopList
              title="Kampagnen (utm_campaign)"
              rows={meta?.campaigns ?? []}
              empty="Noch keine Kampagnen-Links. Links in LinkedIn-Beiträgen mit ?utm_campaign=… versehen."
            />
            <TopList title="Länder" rows={meta?.countries ?? []} empty="Noch keine Daten." label={countryName} />
          </div>

          <SectionLabel number="03" label="Inhalte" title="Meistbesuchte Seiten" />
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <TopList title="Seiten" rows={meta?.pages ?? []} empty="Noch keine Seitenaufrufe." />
            </div>
            <TopList
              title="Geräte"
              rows={meta?.devices ?? []}
              empty="Noch keine Daten."
              label={(x) => DEVICE_LABELS[x] ?? x}
            />
          </div>

          <Card className="flex flex-wrap items-center justify-between gap-3 p-4 text-xs text-lv-secondary">
            <span>
              Letzter Abruf: {fmtDateTime(integrations.umami?.lastSyncAt ?? null)}. Automatisch jeden Morgen um 06:10 Uhr. Volle
              Auswertung direkt in{" "}
              <a href={cfg.publicUrl} target="_blank" rel="noreferrer" className="font-semibold text-lv-blue hover:underline">
                Umami
              </a>
              .
            </span>
            {hasTraffic && snippet && <CopySnippetButton text={snippet} label="Tracking-Skript kopieren" />}
          </Card>
        </>
      )}
    </>
  );
}
