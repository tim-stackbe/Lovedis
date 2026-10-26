import type { Metadata } from "next";
import { formatRate } from "@/components/insights/format";
import { fmtDateTime, fmtInt } from "@/components/marketing/format";
import { ResendSyncButton } from "@/components/marketing/MarketingActions";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Card, ToneCard } from "@/components/ui/Card";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { TableCard, Td, Th, THead, Tr } from "@/components/ui/Table";
import {
  EMAIL_CATEGORY_LABELS,
  EMAIL_EVENT_LABELS,
  type EmailCategory,
} from "@/lib/marketing/constants";
import { loadEmails, loadIntegrations } from "@/lib/marketing/data";
import { broadcastStats, deliveryStats, isDeliveredEvent, isFailedEvent, statsByCategory } from "@/lib/marketing/email";
import { inWindow, windows } from "@/lib/marketing/metrics";

export const metadata: Metadata = { title: "Marketing · E-Mail & Newsletter" };

function eventTone(event: string): BadgeTone {
  if (isFailedEvent(event)) return "orange";
  if (isDeliveredEvent(event)) return "mint";
  if (event === "delivery_delayed") return "yellow";
  return "muted";
}

const BROADCAST_STATUS: Record<string, string> = { draft: "Entwurf", queued: "Geplant", sent: "Versendet" };

export default async function MarketingEmailPage() {
  const now = new Date();
  const [integrations, emails] = await Promise.all([loadIntegrations(), loadEmails()]);
  const all = deliveryStats(emails);
  const last30 = deliveryStats(emails.filter((e) => inWindow(e.sentAt, windows(now, 30).current)));
  const failed = emails.filter((e) => isFailedEvent(e.lastEvent));
  const meta = integrations.resendMeta;
  const domain = meta?.domains[0];

  return (
    <>
      <HeroBanner
        kicker="Marketing · E-Mail"
        title="E-Mail & Newsletter"
        subtitle="Alle Mails, die über unser Resend-Konto rausgehen: Plattform-Mails, Kontaktformular der Homepage und Newsletter (Resend Broadcasts)."
        actions={<ResendSyncButton variant="white" />}
      />

      {!integrations.resendConfigured && (
        <Card className="p-5 text-sm text-lv-orange">
          RESEND_API_KEY ist in dieser Umgebung nicht gesetzt. Ohne Schlüssel können keine Daten abgerufen werden.
        </Card>
      )}

      <SectionLabel number="01" label="Zustellung" title="Gesamt seit Start" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <ToneCard tone="info" label="Versendet" value={fmtInt(all.total)} sub={`letzter Abruf ${fmtDateTime(integrations.resend?.lastSyncAt ?? null)}`} />
        <ToneCard
          tone="success"
          label="Zugestellt"
          value={fmtInt(all.delivered)}
          sub={`Quote ${formatRate(all.rate)} gesamt, ${formatRate(last30.rate)} in 30 Tagen`}
        />
        <ToneCard tone={all.bounced > 0 ? "warn" : "muted"} label="Bounce" value={all.bounced} sub="Postfach existiert nicht oder lehnt ab" />
        <ToneCard
          tone={all.suppressed + all.complained > 0 ? "warn" : "muted"}
          label="Gesperrt"
          value={all.suppressed + all.complained}
          sub="Resend sendet nicht mehr an diese Adresse"
        />
      </div>

      {emails.length > 0 && (
        <TableCard>
          <THead>
            <tr>
              <Th>Kategorie</Th>
              <Th className="w-2/5">Zustellung</Th>
              <Th className="text-right">Mails</Th>
              <Th className="text-right">Nicht zugestellt</Th>
              <Th className="text-right">Quote</Th>
            </tr>
          </THead>
          <tbody>
            {statsByCategory(emails).map(({ category, stats }) => (
              <Tr key={category}>
                <Td className="font-semibold">{EMAIL_CATEGORY_LABELS[category]}</Td>
                <Td>
                  <div className="flex h-2 overflow-hidden rounded-full bg-lv-surface">
                    <span className="bg-lv-mint-deep" style={{ width: `${(stats.delivered / stats.total) * 100}%` }} />
                    <span className="bg-lv-orange" style={{ width: `${(stats.failed / stats.total) * 100}%` }} />
                  </div>
                </Td>
                <Td className="text-right tabular-nums">{stats.total}</Td>
                <Td className={stats.failed > 0 ? "text-right font-semibold text-lv-orange tabular-nums" : "text-right tabular-nums"}>
                  {stats.failed}
                </Td>
                <Td className="text-right tabular-nums">{formatRate(stats.rate)}</Td>
              </Tr>
            ))}
          </tbody>
        </TableCard>
      )}

      <SectionLabel number="02" label="Probleme" title="Nicht zugestellte Mails" />
      {failed.length === 0 ? (
        <Card className="p-5 text-sm text-lv-mint-deep">Keine nicht zugestellten Mails.</Card>
      ) : (
        <TableCard>
          <THead>
            <tr>
              <Th>Datum</Th>
              <Th>Betreff</Th>
              <Th>Empfänger</Th>
              <Th>Status</Th>
            </tr>
          </THead>
          <tbody>
            {failed.map((e) => (
              <Tr key={e.id}>
                <Td className="whitespace-nowrap text-lv-secondary">{fmtDateTime(e.sentAt)}</Td>
                <Td>
                  <span className="font-semibold">{e.subject}</span>
                  <span className="block text-xs text-lv-secondary">{EMAIL_CATEGORY_LABELS[e.category as EmailCategory] ?? e.category}</span>
                </Td>
                <Td className="text-xs">
                  {e.recipient ?? e.toDomain}
                  {e.problem && <span className="block text-lv-secondary">{e.problem}</span>}
                </Td>
                <Td>
                  <Badge tone="orange">{EMAIL_EVENT_LABELS[e.lastEvent] ?? e.lastEvent}</Badge>
                </Td>
              </Tr>
            ))}
          </tbody>
        </TableCard>
      )}
      {meta && meta.suppressions.length > 0 && (
        <Card className="space-y-2 p-5">
          <p className="text-sm font-semibold text-lv-text">Gesperrte Empfänger in Resend ({meta.suppressions.length})</p>
          <p className="text-xs text-lv-secondary">
            An diese Adressen stellt Resend nichts mehr zu. Nach Korrektur des Postfachs in Resend unter „Suppressions“ entfernen.
          </p>
          <ul className="flex flex-wrap gap-2">
            {meta.suppressions.map((s) => (
              <li key={s.email}>
                <Badge tone={s.origin === "manual" ? "muted" : "orange"}>
                  {s.email} · {s.origin === "bounce" ? "Bounce" : s.origin === "complaint" ? "Beschwerde" : "manuell"}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <SectionLabel number="03" label="Newsletter" title="Resend Broadcasts" />
      {!meta || meta.broadcasts.length === 0 ? (
        <Card className="p-5 text-sm text-lv-secondary">
          Noch kein Newsletter über Resend Broadcasts versendet. Sobald einer rausgeht, erscheinen hier Empfänger, Öffnungen und Klicks
          {integrations.webhookConfigured ? "." : " (Öffnungen und Klicks nur mit eingerichtetem Webhook)."}
        </Card>
      ) : (
        <TableCard>
          <THead>
            <tr>
              <Th>Newsletter</Th>
              <Th>Status</Th>
              <Th className="text-right">Zugestellt</Th>
              <Th className="text-right">Öffnungsrate</Th>
              <Th className="text-right">Klickrate</Th>
            </tr>
          </THead>
          <tbody>
            {meta.broadcasts.map((b) => {
              const s = broadcastStats(emails, b.id);
              return (
                <Tr key={b.id}>
                  <Td>
                    <span className="font-semibold">{b.name}</span>
                    <span className="block text-xs text-lv-secondary">
                      {b.sentAt ? `versendet ${fmtDateTime(new Date(b.sentAt))}` : `angelegt ${fmtDateTime(new Date(b.createdAt))}`}
                    </span>
                  </Td>
                  <Td>
                    <Badge tone={b.status === "sent" ? "mint" : "muted"}>{BROADCAST_STATUS[b.status] ?? b.status}</Badge>
                  </Td>
                  <Td className="text-right tabular-nums">{s.recipients > 0 ? `${s.delivered} / ${s.recipients}` : "n. v."}</Td>
                  <Td className="text-right tabular-nums">{formatRate(s.openRate)}</Td>
                  <Td className="text-right tabular-nums">{formatRate(s.clickRate)}</Td>
                </Tr>
              );
            })}
          </tbody>
        </TableCard>
      )}

      <SectionLabel number="04" label="Verlauf" title="Letzte Mails" />
      {emails.length === 0 ? (
        <Card className="p-5 text-sm text-lv-secondary">Noch keine Daten. „Jetzt abrufen“ lädt alle Mails aus Resend.</Card>
      ) : (
        <TableCard>
          <THead>
            <tr>
              <Th>Datum</Th>
              <Th>Betreff</Th>
              <Th>Kategorie</Th>
              <Th>Empfänger-Domain</Th>
              <Th>Status</Th>
            </tr>
          </THead>
          <tbody>
            {emails.slice(0, 30).map((e) => (
              <Tr key={e.id}>
                <Td className="whitespace-nowrap text-lv-secondary">{fmtDateTime(e.sentAt)}</Td>
                <Td className="font-medium">{e.subject}</Td>
                <Td className="text-xs text-lv-secondary">{EMAIL_CATEGORY_LABELS[e.category as EmailCategory] ?? e.category}</Td>
                <Td className="text-xs text-lv-secondary">{e.toDomain ?? "n. v."}</Td>
                <Td>
                  <Badge tone={eventTone(e.lastEvent)}>{EMAIL_EVENT_LABELS[e.lastEvent] ?? e.lastEvent}</Badge>
                </Td>
              </Tr>
            ))}
          </tbody>
        </TableCard>
      )}
      {domain && (
        <p className="text-xs text-lv-secondary">
          Absender-Domain {domain.name}: {domain.status === "verified" ? "verifiziert" : domain.status}, Region {domain.region}.
        </p>
      )}
    </>
  );
}
