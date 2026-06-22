import { ArrowLeft, FlaskConical, Handshake, Inbox, Target } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { NextActionList } from "@/components/partners/PartnerSignals";
import { StartupLogo } from "@/components/discovery/StartupLogo";
import {
  ApplicationStatusBadge,
  ChallengeStatusBadge,
  IntroStatusBadge,
  PoCStatusBadge,
} from "@/components/shared/badges";
import { LinkButton } from "@/components/ui/Button";
import { BannerStat, Card } from "@/components/ui/Card";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { TableCard, Td, Th, THead, Tr } from "@/components/ui/Table";
import { requireRole } from "@/lib/auth-guards";
import { getPartnerCockpit, STALE_POC_DAYS } from "@/lib/partners";
import { parseMilestones, pocProgress } from "@/lib/pocs";
import { daysSince, daysUntil, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Partner-Cockpit" };

export default async function PartnerCockpitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["ADMIN", "MEMBER"]);
  const { id } = await params;

  const cockpit = await getPartnerCockpit(id);
  if (!cockpit) notFound();

  const { partner, challenges, intros, signals, nextActions } = cockpit;

  const pendingApps = challenges.flatMap((c) =>
    c.applications
      .filter((a) => a.status === "PENDING")
      .map((a) => ({ ...a, challengeId: c.id, challengeTitle: c.title }))
  );

  const pocs = challenges.flatMap((c) =>
    c.applications
      .filter((a) => a.poc !== null)
      .map((a) => ({
        poc: a.poc!,
        startup: a.startup,
        challengeTitle: c.title,
      }))
  );

  return (
    <>
      <HeroBanner
        kicker={`Team-Ops — ${partner.company ?? "Business Partner"}`}
        title={partner.company ?? partner.name}
        subtitle={`${partner.name} · ${partner.email}`}
        actions={
          <LinkButton href="/partners" variant="white">
            <ArrowLeft className="h-4 w-4" />
            Alle Partner
          </LinkButton>
        }
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <BannerStat
            label="Challenges"
            value={signals.totalChallenges}
            icon={Target}
          />
          <BannerStat
            label="Offene Bewerbungen"
            value={signals.pendingApplications}
            icon={Inbox}
          />
          <BannerStat
            label="Laufende PoCs"
            value={signals.runningPoCs}
            icon={FlaskConical}
          />
          <BannerStat label="Intro-Anfragen" value={intros.length} icon={Handshake} />
        </div>
      </HeroBanner>

      <section className="space-y-4">
        <SectionLabel
          number="01"
          label="Health"
          title="Nächste Aktionen"
        />
        <NextActionList actions={nextActions} />
      </section>

      <section className="space-y-4">
        <SectionLabel number="02" label="Nachfrage" title="Challenges" />
        {challenges.length === 0 ? (
          <Card className="p-6 text-sm text-lv-secondary">
            Dieser Partner hat noch keine Challenge veröffentlicht.
          </Card>
        ) : (
          <TableCard>
            <THead>
              <tr>
                <Th>Challenge</Th>
                <Th className="text-center">Bewerbungen</Th>
                <Th>Frist</Th>
                <Th className="text-right">Status</Th>
              </tr>
            </THead>
            <tbody>
              {challenges.map((c) => {
                const until = daysUntil(c.deadline);
                const expiring =
                  (c.status === "OPEN" || c.status === "IN_REVIEW") &&
                  until !== null &&
                  until >= 0 &&
                  until <= 14;
                return (
                  <Tr key={c.id}>
                    <Td>
                      <Link
                        href={`/challenges/${c.id}`}
                        className="font-semibold hover:text-lv-blue"
                      >
                        {c.title}
                      </Link>
                    </Td>
                    <Td className="text-center text-lv-secondary">
                      {c._count.applications}
                    </Td>
                    <Td className="text-lv-secondary">
                      {c.deadline ? (
                        <span className={expiring ? "font-semibold text-lv-orange" : ""}>
                          {formatDate(c.deadline)}
                          {expiring && until !== null && (
                            <span className="ml-1">
                              ({until === 0 ? "heute" : `in ${until} T.`})
                            </span>
                          )}
                        </span>
                      ) : (
                        "—"
                      )}
                    </Td>
                    <Td className="text-right">
                      <ChallengeStatusBadge value={c.status} />
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </TableCard>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <SectionLabel
            number="03"
            label="Eingang"
            title="Bewerbungen zur Sichtung"
          />
          {pendingApps.length === 0 ? (
            <Card className="flex items-center gap-3 p-6 text-sm text-lv-secondary">
              <Inbox className="h-5 w-5" />
              Keine offenen Bewerbungen.
            </Card>
          ) : (
            <Card className="divide-y divide-lv-border">
              {pendingApps.map((a) => (
                <div key={a.id} className="flex items-center gap-3 p-4">
                  <StartupLogo
                    name={a.startup.name}
                    logoUrl={a.startup.logoUrl}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-lv-text">
                      {a.startup.name}
                    </p>
                    <p className="truncate text-xs text-lv-secondary">
                      → {a.challengeTitle}
                    </p>
                  </div>
                  <ApplicationStatusBadge value={a.status} />
                </div>
              ))}
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <SectionLabel number="04" label="Piloten" title="PoCs & Status" />
          {pocs.length === 0 ? (
            <Card className="flex items-center gap-3 p-6 text-sm text-lv-secondary">
              <FlaskConical className="h-5 w-5" />
              Noch keine PoCs gestartet.
            </Card>
          ) : (
            <Card className="divide-y divide-lv-border">
              {pocs.map(({ poc, startup, challengeTitle }) => {
                const stale = daysSince(poc.updatedAt);
                const isStale = poc.status === "RUNNING" && stale >= STALE_POC_DAYS;
                const progress = pocProgress(parseMilestones(poc.milestones));
                return (
                  <div key={poc.id} className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <Link
                        href={`/pocs/${poc.id}`}
                        className="min-w-0 text-sm font-semibold text-lv-text hover:text-lv-blue"
                      >
                        <span className="truncate">{startup.name}</span>
                      </Link>
                      <PoCStatusBadge value={poc.status} />
                    </div>
                    <p className="mt-0.5 truncate text-xs text-lv-secondary">
                      → {challengeTitle}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-lv-surface">
                        <div
                          className="h-full rounded-full bg-lv-blue"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-xs tabular-nums text-lv-secondary">
                        {progress}%
                      </span>
                    </div>
                    <p
                      className={`mt-1.5 text-xs ${isStale ? "font-semibold text-lv-orange" : "text-lv-secondary"}`}
                    >
                      {isStale
                        ? `seit ${stale} Tagen ohne Update`
                        : `aktualisiert ${formatDate(poc.updatedAt)}`}
                    </p>
                  </div>
                );
              })}
            </Card>
          )}
        </div>
      </section>

      {intros.length > 0 && (
        <section className="space-y-4">
          <SectionLabel
            number="05"
            label="Netzwerk"
            title="Intro-Anfragen im Umfeld"
          />
          <Card className="divide-y divide-lv-border">
            {intros.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-3 p-4"
              >
                <div className="flex items-center gap-3">
                  <StartupLogo
                    name={r.startup.name}
                    logoUrl={r.startup.logoUrl}
                    size="sm"
                  />
                  <div>
                    <p className="text-sm font-semibold text-lv-text">
                      {r.startup.name}
                      <span className="ml-1.5 font-normal text-lv-secondary">
                        ← {r.investor.company ?? r.investor.name}
                      </span>
                    </p>
                    <p className="text-xs text-lv-secondary">
                      {formatDate(r.createdAt)}
                    </p>
                  </div>
                </div>
                <IntroStatusBadge value={r.status} />
              </div>
            ))}
          </Card>
        </section>
      )}
    </>
  );
}
