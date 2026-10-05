import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LogComposer } from "@/components/logbook/LogComposer";
import { LogEntryCard } from "@/components/logbook/LogEntryCard";
import { LogFollowUps } from "@/components/logbook/LogFollowUps";
import { LogTimeline } from "@/components/logbook/LogTimeline";
import type { LogContext } from "@/components/logbook/types";
import { LinkButton } from "@/components/ui/Button";
import { BannerStat, Card } from "@/components/ui/Card";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Timeline } from "@/components/ui/Timeline";
import { requireAdmin } from "@/lib/auth-guards";
import {
  filterTimeline,
  getLogbook,
  mergeTimeline,
  openFollowUps,
  parseLogFilters,
} from "@/lib/logbook";
import { daysSince } from "@/lib/logbook-format";

export const metadata: Metadata = { title: "Logbuch" };

export default async function StartupLogbookPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const { id } = await params;
  const data = await getLogbook(id);
  if (!data) notFound();

  const filters = parseLogFilters(await searchParams);
  // eslint-disable-next-line react-hooks/purity -- per-request server render time
  const now = Date.now();
  const ctx: LogContext = {
    startupId: data.startup.id,
    viewerId: data.viewerId,
    now,
    contacts: data.contacts,
    admins: data.admins,
  };

  const pinned = data.entries
    .filter((e) => e.pinnedAt)
    .sort((a, b) => b.pinnedAt!.getTime() - a.pinnedAt!.getTime());
  const followUps = openFollowUps(data.entries);
  const timeline = filterTimeline(
    mergeTimeline(
      data.entries.filter((e) => !e.pinnedAt),
      data.events
    ),
    filters
  );
  const lastManual = data.entries.find((e) => e.source === "MANUAL");
  const overdueCount = followUps.filter(
    (e) => e.followUpAt && e.followUpAt.getTime() < now
  ).length;

  return (
    <>
      <HeroBanner
        kicker="Logbuch · nur Admins"
        title={data.startup.name}
        subtitle="Alle Calls, Meetings, Notizen und Entscheidungen zu diesem Startup an einem Ort, ergänzt um automatische Ereignisse aus der Plattform."
        actions={
          <LinkButton href={`/startups/${data.startup.id}`} variant="white" size="sm">
            <ArrowLeft className="h-4 w-4" />
            Zum Startup-Profil
          </LinkButton>
        }
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <BannerStat label="Einträge" value={data.entries.length} />
          <BannerStat
            label="Offene Follow-ups"
            value={
              overdueCount > 0
                ? `${followUps.length} (${overdueCount} überfällig)`
                : followUps.length
            }
          />
          <BannerStat
            label="Letzter Kontakt"
            value={
              lastManual
                ? daysSince(lastManual.occurredAt, now) === 0
                  ? "Heute"
                  : `vor ${daysSince(lastManual.occurredAt, now)} T.`
                : "Noch keiner"
            }
          />
        </div>
      </HeroBanner>

      <section className="space-y-4">
        <SectionLabel number="01" label="Erfassen" title="Neuer Eintrag" />
        <Card className="p-5 sm:p-6">
          <LogComposer ctx={ctx} />
        </Card>
      </section>

      {pinned.length > 0 && (
        <section className="space-y-4">
          <SectionLabel number="02" label="Wichtig" title="Angepinnt" />
          <Card className="p-5 sm:p-6">
            <Timeline>
              {pinned.map((e) => (
                <LogEntryCard key={e.id} entry={e} ctx={ctx} />
              ))}
            </Timeline>
          </Card>
        </section>
      )}

      {followUps.length > 0 && (
        <section className="space-y-4">
          <SectionLabel
            number="03"
            label="Follow-ups"
            title="Anstehend und überfällig"
          />
          <LogFollowUps entries={followUps} now={now} />
        </section>
      )}

      <section className="space-y-4">
        <SectionLabel number="04" label="Verlauf" title="Timeline" />
        <LogTimeline items={timeline} filters={filters} ctx={ctx} />
      </section>
    </>
  );
}
