import Link from "next/link";
import type { Metadata } from "next";
import { fmtDateTime } from "@/components/marketing/format";
import { SyncButton } from "@/components/marketing/MarketingActions";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { loadIntegrations } from "@/lib/marketing/data";
import { alertRecipients } from "@/lib/marketing/notify";

export const metadata: Metadata = { title: "Marketing · Integrationen" };

function baseUrl(): string {
  return (process.env.AUTH_URL || process.env.NEXTAUTH_URL || "https://alpha.lovedis.de").replace(/\/+$/, "");
}

function Tool({
  name,
  mark,
  color,
  status,
  tone,
  children,
}: {
  name: string;
  mark: string;
  color: string;
  status: string;
  tone: BadgeTone;
  children: React.ReactNode;
}) {
  return (
    <Card className="space-y-3 p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-button text-sm font-extrabold text-white" style={{ background: color }}>
          {mark}
        </span>
        <p className="flex-1 font-semibold text-lv-text">{name}</p>
        <Badge tone={tone}>{status}</Badge>
      </div>
      <div className="space-y-2 text-sm text-lv-text/85">{children}</div>
    </Card>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <p className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 border-t border-lv-border pt-2 text-xs">
      <span className="font-semibold uppercase tracking-wider text-lv-secondary">{label}</span>
      <span className="text-right text-lv-text">{children}</span>
    </p>
  );
}

export default async function MarketingIntegrationsPage() {
  const i = await loadIntegrations();
  const webhookUrl = `${baseUrl()}/api/webhooks/resend`;
  const resendHasEndpoint = i.resendMeta?.webhooks.some((w) => w.endpoint === webhookUrl) ?? false;
  const resendStatus = !i.resendConfigured
    ? { label: "Nicht verbunden", tone: "orange" as const }
    : i.resend?.lastError
      ? { label: "Fehler", tone: "orange" as const }
      : i.webhookConfigured
        ? { label: "Verbunden", tone: "mint" as const }
        : { label: "Teilweise", tone: "yellow" as const };
  const domain = i.resendMeta?.domains[0];
  const recipients = await alertRecipients();
  const webPageviews = i.umamiMeta?.stats.pageviews ?? 0;
  const umamiStatus = !i.umamiConfig
    ? { label: "Nicht verbunden", tone: "muted" as const }
    : i.umami?.lastError
      ? { label: "Fehler", tone: "orange" as const }
      : webPageviews > 0
        ? { label: "Verbunden", tone: "mint" as const }
        : { label: "Wartet auf Skript", tone: "yellow" as const };

  return (
    <>
      <HeroBanner
        kicker="Marketing · Tools"
        title="Integrationen"
        subtitle="Status aller angebundenen Tools: verbunden, letzte Synchronisierung, letzter Fehler. Probleme erscheinen zusätzlich als Warnung auf der Übersicht."
      />

      <SectionLabel number="01" label="Aktiv" title="Angebunden" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Tool name="Resend · E-Mail & Newsletter" mark="R" color="#0A0A0F" status={resendStatus.label} tone={resendStatus.tone}>
          <Row label="API-Schlüssel">{i.resendConfigured ? "gesetzt" : "fehlt (RESEND_API_KEY)"}</Row>
          <Row label="Letzter Abruf">{fmtDateTime(i.resend?.lastSyncAt ?? null)}</Row>
          {i.resend?.lastError && <Row label="Letzter Fehler">{i.resend.lastError}</Row>}
          {domain && (
            <Row label="Domain">
              {domain.name}, {domain.status === "verified" ? "verifiziert" : domain.status}, {domain.region}
            </Row>
          )}
          <Row label="Webhook">
            {i.webhookConfigured
              ? `aktiv, letztes Ereignis ${fmtDateTime(i.resend?.lastWebhookAt ?? null)}`
              : resendHasEndpoint
                ? "in Resend angelegt, Secret fehlt auf dem Server"
                : "nicht eingerichtet"}
          </Row>
          {!i.webhookConfigured && (
            <div className="rounded-button bg-lv-surface p-3 text-xs leading-relaxed">
              <p className="font-semibold text-lv-text">Webhook einrichten (einmalig, 5 Minuten)</p>
              <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-lv-secondary">
                <li>
                  Resend › Webhooks › Add Endpoint, URL <code className="text-lv-text">{webhookUrl}</code>
                </li>
                <li>Ereignisse: alle „email.*“ auswählen</li>
                <li>
                  Signing Secret als <code className="text-lv-text">RESEND_WEBHOOK_SECRET</code> in die Server-Umgebung eintragen und neu starten
                </li>
              </ol>
            </div>
          )}
          <div className="pt-1">
            <SyncButton />
          </div>
        </Tool>

        <Tool
          name="LinkedIn · Unternehmensseite"
          mark="in"
          color="#0A66C2"
          status={i.linkedin?.lastSyncAt ? "Export-Import" : "Keine Daten"}
          tone={i.linkedin?.lastSyncAt ? "yellow" : "muted"}
        >
          <Row label="Quelle">Export aus Page Analytics (manuell)</Row>
          <Row label="Letzter Import">{fmtDateTime(i.linkedin?.lastSyncAt ?? null)}</Row>
          <Row label="API">Community Management API, Antrag bei LinkedIn nötig (Freigabe dauert Wochen)</Row>
          <p className="pt-1 text-xs">
            <Link href="/marketing/linkedin" className="font-semibold text-lv-blue hover:underline">
              Export hochladen →
            </Link>
          </p>
        </Tool>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Tool name="Umami · Website-Analyse" mark="U" color="#FF5736" status={umamiStatus.label} tone={umamiStatus.tone}>
          <Row label="Server">{i.umamiConfig ? i.umamiConfig.publicUrl.replace(/^https?:\/\//, "") : "nicht konfiguriert (UMAMI_*)"}</Row>
          <Row label="Letzter Abruf">{fmtDateTime(i.umami?.lastSyncAt ?? null)}</Row>
          {i.umami?.lastError && <Row label="Letzter Fehler">{i.umami.lastError}</Row>}
          <Row label="Tracking auf lovedis.de">
            {webPageviews > 0 ? `aktiv, ${webPageviews.toLocaleString("de-DE")} Seitenaufrufe in 30 Tagen` : "noch keine Besuche gemessen"}
          </Row>
          <p className="pt-1 text-xs">
            <Link href="/marketing/website" className="font-semibold text-lv-blue hover:underline">
              Website-Zahlen und Tracking-Skript →
            </Link>
          </p>
        </Tool>

        <Tool
          name="Benachrichtigungen per E-Mail"
          mark="@"
          color="#2926E5"
          status={recipients.length > 0 ? "Aktiv" : "Keine Empfänger"}
          tone={recipients.length > 0 ? "mint" : "orange"}
        >
          <Row label="Empfänger">
            {recipients.length > 0 ? recipients.join(", ") : "keine"}
            {process.env.MARKETING_ALERT_TO?.trim() ? "" : " (alle aktiven Admins)"}
          </Row>
          <Row label="Sofort">nicht zugestellte Kontaktanfrage oder Support-Mail</Row>
          <Row label="Wöchentlich">Wochenübersicht jeden Montag um 07:30 Uhr</Row>
          <Row label="Letzte Warnung">{fmtDateTime(i.alertState?.lastSyncAt ?? null)}</Row>
          {i.alertState?.lastError && <Row label="Letzter Fehler">{i.alertState.lastError}</Row>}
        </Tool>
      </div>

      <SectionLabel number="02" label="Geplant" title="Kommt als Nächstes" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Tool name="Luma · Events" mark="lu" color="#7A5A00" status="Manuell" tone="yellow">
          <p className="text-xs text-lv-secondary">
            Teilnehmerzahlen werden heute unter{" "}
            <Link href="/insights/foerderung/events" className="font-semibold text-lv-blue hover:underline">
              Insights › Förderung › Veranstaltungen
            </Link>{" "}
            gepflegt. Die Luma-API setzt Luma Plus voraus.
          </p>
        </Tool>
      </div>

      <Card className="p-4 text-xs leading-relaxed text-lv-secondary">
        Täglicher Abruf (Resend, Umami, Warnungen) um 06:10 Uhr: <code className="text-lv-text">POST /api/cron/marketing-sync</code>.
        Wochenübersicht montags: <code className="text-lv-text">POST /api/cron/marketing-digest</code>. Beide mit{" "}
        <code className="text-lv-text">Authorization: Bearer CRON_SECRET</code>, wie der Insights-Snapshot.
      </Card>
    </>
  );
}
