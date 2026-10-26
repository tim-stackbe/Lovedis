import type { Metadata } from "next";
import { fmtDateTime, fmtDay, fmtInt, fmtRate1 } from "@/components/marketing/format";
import { FollowerTotalForm, LinkedInImportForm } from "@/components/marketing/MarketingActions";
import { WeeklyChart } from "@/components/marketing/WeeklyChart";
import { Badge } from "@/components/ui/Badge";
import { Card, ToneCard } from "@/components/ui/Card";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { TableCard, Td, Th, THead, Tr } from "@/components/ui/Table";
import { loadContent, loadIntegrations, loadLinkedIn } from "@/lib/marketing/data";
import { linkedInPostKey } from "@/lib/marketing/linkedin-import";
import {
  engagementRate,
  formatBreakdown,
  inWindow,
  interactions,
  newFollowers,
  weeklySeries,
  windows,
} from "@/lib/marketing/metrics";

export const metadata: Metadata = { title: "Marketing · LinkedIn" };

const MAX_ROWS = 60;

export default async function MarketingLinkedInPage() {
  const now = new Date();
  const [integrations, { posts, followers }, content] = await Promise.all([
    loadIntegrations(),
    loadLinkedIn(),
    loadContent(),
  ]);
  const { current } = windows(now, 30);
  const recent = posts.filter((p) => inWindow(p.publishedAt, current));
  const formats = formatBreakdown(posts.filter((p) => inWindow(p.publishedAt, windows(now, 90).current)));
  const plannedByKey = new Map(
    content.items
      .filter((i) => i.publishedUrl)
      .map((i) => [linkedInPostKey(i.publishedUrl!), i] as const)
      .filter(([k]) => k !== null)
  );
  const meta = integrations.linkedinMeta;

  return (
    <>
      <HeroBanner
        kicker="Marketing · LinkedIn"
        title="LinkedIn-Unternehmensseite"
        subtitle="Beiträge, Reichweite und Follower aus dem Export von LinkedIn Page Analytics. Sobald LinkedIn den API-Zugang freigibt, läuft der Abruf automatisch."
      />

      <SectionLabel number="01" label="Daten" title="Export hochladen" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <LinkedInImportForm />
          <p className="mt-3 text-xs text-lv-secondary">
            Letzter Import: {fmtDateTime(integrations.linkedin?.lastSyncAt ?? null)} · {posts.length} Beiträge,{" "}
            {followers.length} Follower-Tage gespeichert.
          </p>
        </Card>
        <Card className="space-y-2 p-5">
          <FollowerTotalForm current={meta?.followerTotal ?? null} />
          <p className="text-xs text-lv-secondary">
            Die Gesamtzahl steht nicht im Export. Einfach von der Unternehmensseite abschreiben
            {meta?.followerTotalAt ? `, zuletzt am ${fmtDay(new Date(meta.followerTotalAt))}` : ""}.
          </p>
        </Card>
      </div>

      {posts.length === 0 && followers.length === 0 ? (
        <Card className="p-5 text-sm text-lv-secondary">
          Noch keine Daten importiert. Nach dem ersten Upload erscheinen hier Kennzahlen, Verlauf und alle Beiträge.
        </Card>
      ) : (
        <>
          <SectionLabel number="02" label="Kennzahlen" title="Letzte 30 Tage" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <ToneCard tone="info" label="Beiträge" value={recent.length} sub="veröffentlicht" />
            <ToneCard tone="info" label="Impressionen" value={fmtInt(recent.reduce((s, p) => s + p.impressions, 0))} sub="dieser Beiträge" />
            <ToneCard tone="success" label="Engagement-Rate" value={fmtRate1(engagementRate(recent))} sub="Interaktionen je Impression" />
            <ToneCard tone="muted" label="Neue Follower" value={fmtInt(newFollowers(followers, current))} sub="organisch und gesponsert" />
          </div>
          <Card className="p-5">
            <p className="mb-3 text-sm font-semibold text-lv-text">Verlauf, 12 Wochen</p>
            <WeeklyChart data={weeklySeries(posts, followers, now)} />
          </Card>

          {formats.length > 0 && (
            <>
              <SectionLabel number="03" label="Formate" title="Was funktioniert (90 Tage)" />
              <TableCard>
                <THead>
                  <tr>
                    <Th>Format</Th>
                    <Th className="text-right">Beiträge</Th>
                    <Th className="text-right">Impressionen</Th>
                    <Th className="text-right">Engagement-Rate</Th>
                  </tr>
                </THead>
                <tbody>
                  {formats.map((f) => (
                    <Tr key={f.format}>
                      <Td className="font-semibold">{f.format}</Td>
                      <Td className="text-right tabular-nums">{f.posts}</Td>
                      <Td className="text-right tabular-nums">{fmtInt(f.impressions)}</Td>
                      <Td className="text-right tabular-nums">{fmtRate1(f.rate)}</Td>
                    </Tr>
                  ))}
                </tbody>
              </TableCard>
            </>
          )}

          <SectionLabel number="04" label="Beiträge" title="Alle Beiträge" />
          <TableCard>
            <THead>
              <tr>
                <Th>Beitrag</Th>
                <Th className="text-right">Impressionen</Th>
                <Th className="text-right">Klicks</Th>
                <Th className="text-right">Reaktionen</Th>
                <Th className="text-right">Kommentare</Th>
                <Th className="text-right">Reposts</Th>
                <Th className="text-right">Rate</Th>
              </tr>
            </THead>
            <tbody>
              {posts.slice(0, MAX_ROWS).map((p) => {
                const planned = plannedByKey.get(p.postKey);
                const rate = p.impressions > 0 ? interactions(p) / p.impressions : null;
                return (
                  <Tr key={p.id}>
                    <Td className="max-w-md">
                      <a href={p.url} target="_blank" rel="noreferrer" className="line-clamp-2 font-semibold text-lv-text hover:text-lv-blue">
                        {p.title}
                      </a>
                      <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-lv-secondary">
                        {fmtDay(p.publishedAt)}
                        {p.postType && ` · ${p.postType}`}
                        {p.postedBy && ` · ${p.postedBy}`}
                        {planned && <Badge tone="blue">Redaktionsplan{planned.campaign ? `: ${planned.campaign}` : ""}</Badge>}
                      </span>
                    </Td>
                    <Td className="text-right tabular-nums">{fmtInt(p.impressions)}</Td>
                    <Td className="text-right tabular-nums">{fmtInt(p.clicks)}</Td>
                    <Td className="text-right tabular-nums">{fmtInt(p.reactions)}</Td>
                    <Td className="text-right tabular-nums">{fmtInt(p.comments)}</Td>
                    <Td className="text-right tabular-nums">{fmtInt(p.reposts)}</Td>
                    <Td className="text-right font-semibold tabular-nums">{fmtRate1(rate)}</Td>
                  </Tr>
                );
              })}
            </tbody>
          </TableCard>
          {posts.length > MAX_ROWS && (
            <p className="text-xs text-lv-secondary">Die {MAX_ROWS} neuesten von {posts.length} Beiträgen.</p>
          )}
        </>
      )}
    </>
  );
}
