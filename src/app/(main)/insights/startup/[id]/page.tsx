import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  ApplicationStatusBadge,
  EngagementStatusBadge,
  MatchContactStatusBadge,
  PoCStatusBadge,
  RelevanceBadge,
} from "@/components/shared/badges";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { BannerStat } from "@/components/ui/Card";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { TableCard, Td, Th, THead, Tr } from "@/components/ui/Table";
import { requireScoutModule } from "@/lib/auth-guards";
import { loadInsightsDataset } from "@/lib/insights/data";
import { PILOT_SOURCE_LABELS, startupDetail } from "@/lib/insights/metrics";
import { effectiveStage, labelOf, STAGE_LABELS, TRACK_LABELS } from "@/lib/insights/stages";
import { isFemaleFounder, jobsCreated, suggestHessen } from "@/lib/insights/tracking";
import { dayString, formatEur } from "@/components/insights/format";
import { ReportingMetaForm } from "@/components/insights/ReportingMetaForm";

export const metadata: Metadata = { title: "Insights · Startup" };

export default async function InsightsStartupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireScoutModule();
  const canEdit = session.user.role === "ADMIN";
  const { id } = await params;

  const ds = await loadInsightsDataset();
  const detail = startupDetail(ds, id);
  if (!detail) notFound();
  const { startup } = detail;
  const pilots = detail.matchRows.filter((r) => r.pilotSources.length > 0).length;
  const meta = ds.reportingMeta.find((m) => m.startupId === startup.id);
  const femaleFounder = isFemaleFounder(meta);
  const jobs = jobsCreated(meta);
  const tracking = ds.tracking.filter((t) => t.startupId === startup.id);
  const partnerName = (pid: string) => ds.partners.find((p) => p.id === pid)?.name ?? "?";

  return (
    <>
      <HeroBanner
        kicker="Insights · Startup"
        title={startup.name}
        subtitle={`${startup.industry}${startup.city ? ` · ${startup.city}` : ""}. Alle Programme, Partner-Paarungen, Kooperationen und Venture-Store-Nutzung.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <LinkButton href={`/startups/${startup.id}`} variant="white">
              Startup-Profil
            </LinkButton>
            <LinkButton href="/insights" variant="white">
              <ArrowLeft className="h-4 w-4" />
              Insights
            </LinkButton>
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <BannerStat label="Matches" value={detail.matchRows.filter((r) => r.qualified).length} />
          <BannerStat label="Piloten" value={pilots} />
          <BannerStat label="Sessions" value={detail.sessionsCompleted} />
          <BannerStat label="Credits eingelöst" value={detail.creditsRedeemed} />
        </div>
      </HeroBanner>

      <SectionLabel number="01" label="Programme" title="Batches" />
      <div className="flex flex-wrap items-center gap-2">
        {detail.batches.map((b) => (
          <Link
            key={b.id}
            href={`/insights?batch=${b.id}`}
            className="rounded-full border border-lv-border bg-white px-3 py-1.5 text-xs font-semibold text-lv-secondary hover:bg-lv-surface"
          >
            {b.name}
          </Link>
        ))}
        {detail.batches.length === 0 && (
          <span className="text-sm text-lv-secondary">In keinem Batch.</span>
        )}
        {detail.isExternal && <Badge tone="orange">Extern dazugekommen</Badge>}
      </div>

      <SectionLabel number="02" label="Paarungen" title="Partner-Paarungen" />
      {detail.matchRows.length === 0 ? (
        <p className="text-sm text-lv-secondary">Noch keine bewerteten Paarungen.</p>
      ) : (
        <TableCard>
          <THead>
            <tr>
              <Th>Partner</Th>
              <Th>Batch</Th>
              <Th>Startup-Sicht</Th>
              <Th>Partner-Sicht</Th>
              <Th>Kontakt</Th>
              <Th>Pilot</Th>
            </tr>
          </THead>
          <tbody>
            {detail.matchRows.map((r) => (
              <Tr key={`${r.batch.id}:${r.partner.id}`}>
                <Td>
                  <Link href={`/insights/partner/${r.partner.slug}`} className="font-semibold text-lv-blue hover:underline">
                    {r.partner.name}
                  </Link>
                </Td>
                <Td className="text-lv-secondary">{r.batch.name}</Td>
                <Td>{r.startupRelevance ? <RelevanceBadge value={r.startupRelevance} /> : <span className="text-lv-secondary">offen</span>}</Td>
                <Td>{r.partnerRelevance ? <RelevanceBadge value={r.partnerRelevance} /> : <span className="text-lv-secondary">offen</span>}</Td>
                <Td><MatchContactStatusBadge value={r.contactStatus} /></Td>
                <Td className="text-xs text-lv-secondary">
                  {r.pilotSources.length > 0 ? r.pilotSources.map((s) => PILOT_SOURCE_LABELS[s]).join(", ") : "nein"}
                </Td>
              </Tr>
            ))}
          </tbody>
        </TableCard>
      )}

      <SectionLabel number="03" label="Kooperationen" title="Engagements & Challenge-Bewerbungen" />
      {detail.engagements.length === 0 && detail.applications.length === 0 ? (
        <p className="text-sm text-lv-secondary">Keine Engagements oder Challenge-Bewerbungen.</p>
      ) : (
        <TableCard>
          <THead>
            <tr>
              <Th>Art</Th>
              <Th>Titel</Th>
              <Th>Partner</Th>
              <Th>Status</Th>
            </tr>
          </THead>
          <tbody>
            {detail.engagements.map((e) => (
              <Tr key={e.id}>
                <Td className="text-lv-secondary">Engagement</Td>
                <Td>
                  <Link href={`/engagements/${e.id}`} className="font-semibold text-lv-blue hover:underline">
                    {e.title}
                  </Link>
                </Td>
                <Td>{e.partnerName ?? <span className="text-lv-secondary">nicht zugeordnet</span>}</Td>
                <Td><EngagementStatusBadge value={e.status} /></Td>
              </Tr>
            ))}
            {detail.applications.map((a) => (
              <Tr key={a.challengeId}>
                <Td className="text-lv-secondary">Challenge</Td>
                <Td>
                  <Link href={`/challenges/${a.challengeId}`} className="font-semibold text-lv-blue hover:underline">
                    {a.challengeTitle}
                  </Link>
                </Td>
                <Td className="text-lv-secondary">Bewerbung</Td>
                <Td>
                  {a.pocStatus ? <PoCStatusBadge value={a.pocStatus} /> : <ApplicationStatusBadge value={a.status} />}
                </Td>
              </Tr>
            ))}
          </tbody>
        </TableCard>
      )}

      <SectionLabel number="04" label="Venture Store" title="Sessions & Credits" />
      <p className="text-sm text-lv-secondary">
        {detail.sessionsBooked} Buchungen, davon {detail.sessionsCompleted} abgeschlossen.{" "}
        {detail.creditsRedeemed} Credits eingelöst.
      </p>

      <SectionLabel number="05" label="Förderung" title="Förder-Merkmale" />
      <p className="text-sm text-lv-secondary">
        Female Founder: {femaleFounder === null ? "noch nicht erfasst" : femaleFounder ? "ja" : "nein"}.
        {jobs !== null && ` Neue VZÄ seit Baseline: ${jobs > 0 ? "+" : ""}${jobs}.`}
      </p>
      <ReportingMetaForm
        key={JSON.stringify(meta)}
        startupId={startup.id}
        city={startup.city}
        hessenSuggestion={suggestHessen(startup.city)}
        profileTeamSize={startup.teamSize}
        canEdit={canEdit}
        meta={
          meta
            ? {
                ...meta,
                fteBaselineOn: dayString(meta.fteBaselineOn),
                fteCurrentOn: dayString(meta.fteCurrentOn),
                followOnRoundOn: dayString(meta.followOnRoundOn),
              }
            : null
        }
      />

      <SectionLabel
        number="06"
        label="Tracking"
        title="Pipeline-Tracking"
        actions={
          canEdit ? (
            <LinkButton href={`/insights/tracking/new?startup=${startup.id}`} variant="secondary" size="sm">
              <Plus className="h-4 w-4" />
              Eintrag anlegen
            </LinkButton>
          ) : undefined
        }
      />
      {tracking.length === 0 ? (
        <p className="text-sm text-lv-secondary">Noch keine Tracking-Einträge für dieses Startup.</p>
      ) : (
        <TableCard>
          <THead>
            <tr>
              <Th>Partner</Th>
              <Th>Programm</Th>
              <Th>Stufe</Th>
              <Th className="text-right">Umsatz</Th>
            </tr>
          </THead>
          <tbody>
            {tracking.map((t) => (
              <Tr key={t.id}>
                <Td>
                  <Link href={`/insights/tracking/${t.id}`} className="font-semibold text-lv-blue hover:underline">
                    {t.partnerCompanyId ? partnerName(t.partnerCompanyId) : "Ohne Partner"}
                  </Link>
                </Td>
                <Td className="text-lv-secondary">{labelOf(TRACK_LABELS, t.track)}</Td>
                <Td>
                  <Badge tone="blue">{STAGE_LABELS[effectiveStage(t)]}</Badge>
                </Td>
                <Td className="text-right tabular-nums">{t.revenueEur ? formatEur(t.revenueEur) : ""}</Td>
              </Tr>
            ))}
          </tbody>
        </TableCard>
      )}
    </>
  );
}
