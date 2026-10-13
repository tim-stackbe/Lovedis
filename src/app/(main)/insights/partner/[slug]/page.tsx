import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  EngagementStatusBadge,
  MatchContactStatusBadge,
  RelevanceBadge,
} from "@/components/shared/badges";
import { LinkButton } from "@/components/ui/Button";
import { BannerStat } from "@/components/ui/Card";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { TableCard, Td, Th, THead, Tr } from "@/components/ui/Table";
import { requireAdmin } from "@/lib/auth-guards";
import { CHALLENGE_STATUS_LABELS } from "@/lib/constants";
import { loadInsightsDataset } from "@/lib/insights/data";
import { PILOT_SOURCE_LABELS, partnerDetail } from "@/lib/insights/metrics";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Insights · Partner" };

export default async function InsightsPartnerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireAdmin();
  const { slug } = await params;

  const ds = await loadInsightsDataset();
  const partner = ds.partners.find((p) => p.slug === slug);
  if (!partner) notFound();
  const detail = partnerDetail(ds, partner.id);
  if (!detail) notFound();

  return (
    <>
      <HeroBanner
        kicker="Insights · Partner"
        title={partner.name}
        subtitle="Alle Kollaborationen dieses Partners über alle Batches. Bearbeitet wird weiterhin in Match-Matrix, Engagements und Challenges."
        actions={
          <LinkButton href="/insights" variant="white">
            <ArrowLeft className="h-4 w-4" />
            Insights
          </LinkButton>
        }
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <BannerStat label="Batches" value={detail.batches.length} />
          <BannerStat label="Startups bewertet" value={detail.totals.startups} />
          <BannerStat label="Matches" value={detail.totals.matches} />
          <BannerStat label="Piloten" value={detail.totals.pilots} />
        </div>
      </HeroBanner>

      <SectionLabel number="01" label="Programme" title="Beteiligung je Batch" />
      {detail.batches.length === 0 ? (
        <p className="text-sm text-lv-secondary">Dieser Partner ist keinem Batch zugeordnet.</p>
      ) : (
        <TableCard>
          <THead>
            <tr>
              <Th>Batch</Th>
              <Th className="text-right">Startups im Batch</Th>
              <Th className="text-right">Matches</Th>
              <Th className="text-right">Piloten</Th>
              <Th />
            </tr>
          </THead>
          <tbody>
            {detail.batches.map((b) => (
              <Tr key={b.batch.id}>
                <Td>
                  <Link href={`/insights?batch=${b.batch.id}`} className="font-semibold text-lv-blue hover:underline">
                    {b.batch.name}
                  </Link>
                </Td>
                <Td className="text-right tabular-nums">{b.startups}</Td>
                <Td className="text-right tabular-nums">{b.matches}</Td>
                <Td className="text-right tabular-nums">{b.pilots}</Td>
                <Td className="text-right">
                  <Link href={`/match-matrix?batch=${b.batch.id}`} className="text-xs font-semibold text-lv-blue hover:underline">
                    In Matrix öffnen
                  </Link>
                </Td>
              </Tr>
            ))}
          </tbody>
        </TableCard>
      )}

      <SectionLabel number="02" label="Paarungen" title="Startups im Austausch" />
      {detail.matchRows.length === 0 ? (
        <p className="text-sm text-lv-secondary">Noch keine bewerteten Paarungen.</p>
      ) : (
        <TableCard>
          <THead>
            <tr>
              <Th>Startup</Th>
              <Th>Batch</Th>
              <Th>Startup-Sicht</Th>
              <Th>Partner-Sicht</Th>
              <Th>Kontakt</Th>
              <Th>Pilot</Th>
            </tr>
          </THead>
          <tbody>
            {detail.matchRows.map((r) => (
              <Tr key={`${r.batch.id}:${r.startup.id}`}>
                <Td>
                  <Link href={`/insights/startup/${r.startup.id}`} className="font-semibold text-lv-blue hover:underline">
                    {r.startup.name}
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

      <SectionLabel number="03" label="Kooperationen" title="Engagements & Challenges" />
      {detail.engagements.length === 0 && detail.challenges.length === 0 ? (
        <p className="text-sm text-lv-secondary">
          Keine Engagements oder Challenges, die diesem Partner zugeordnet werden konnten.
        </p>
      ) : (
        <TableCard>
          <THead>
            <tr>
              <Th>Art</Th>
              <Th>Titel</Th>
              <Th>Startup / Bewerbungen</Th>
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
                  {e.startDate && <span className="block text-xs text-lv-secondary">seit {formatDate(e.startDate)}</span>}
                </Td>
                <Td>{e.startupName}</Td>
                <Td><EngagementStatusBadge value={e.status} /></Td>
              </Tr>
            ))}
            {detail.challenges.map((c) => (
              <Tr key={c.id}>
                <Td className="text-lv-secondary">Challenge</Td>
                <Td>
                  <Link href={`/challenges/${c.id}`} className="font-semibold text-lv-blue hover:underline">
                    {c.title}
                  </Link>
                </Td>
                <Td className="tabular-nums">{c.applications} Bewerbungen, {c.pocs} PoCs</Td>
                <Td className="text-lv-secondary">{CHALLENGE_STATUS_LABELS[c.status]}</Td>
              </Tr>
            ))}
          </tbody>
        </TableCard>
      )}
    </>
  );
}
