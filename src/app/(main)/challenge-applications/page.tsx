import { Inbox } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import type { Prisma } from "@/generated/prisma/client";
import type { ApplicationStatus } from "@/generated/prisma/enums";
import { ApplicationStatusBadge, PoCStatusBadge } from "@/components/shared/badges";
import { LinkButton } from "@/components/ui/Button";
import { BannerStat, Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { TableCard, Td, Th, THead, Tr } from "@/components/ui/Table";
import { requireTeam } from "@/lib/auth-guards";
import {
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUSES,
} from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { cn, formatDate, truncate } from "@/lib/utils";

export const metadata: Metadata = { title: "Challenge-Bewerbungen" };

/**
 * Rows per page. Applications grow with every challenge round, so the table is
 * paged instead of rendering the whole table in one server response.
 */
const PAGE_SIZE = 50;

interface SearchParams {
  status?: string;
  page?: string;
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
        active
          ? "border-lv-blue bg-lv-blue text-white"
          : "border-lv-border bg-white text-lv-secondary hover:bg-lv-surface"
      )}
    >
      {children}
    </Link>
  );
}

/**
 * Team-wide overview of every startup application to every challenge.
 *
 * The per-challenge `Bewerbungen` list on /challenges/[id] only ever answers
 * "who applied to THIS challenge", so deciding across rounds meant opening each
 * challenge in turn. This is the cross-challenge counterpart.
 *
 * Pitches are confidential startup input, so the whole surface is ADMIN +
 * MEMBER only (`requireTeam`) — the same team-only rule that closed the
 * /challenges/[id] IDOR (Sicherheitskonzept, Abschnitt 18.1).
 */
export default async function ChallengeApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireTeam();
  const { status, page: pageParam } = await searchParams;

  const activeStatus = APPLICATION_STATUSES.includes(status as ApplicationStatus)
    ? (status as ApplicationStatus)
    : undefined;
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);

  const where: Prisma.ChallengeApplicationWhereInput = activeStatus
    ? { status: activeStatus }
    : {};

  const [statusGroups, matching, applications] = await Promise.all([
    prisma.challengeApplication.groupBy({ by: ["status"], _count: true }),
    prisma.challengeApplication.count({ where }),
    prisma.challengeApplication.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        pitch: true,
        status: true,
        createdAt: true,
        startup: { select: { id: true, name: true, industry: true } },
        challenge: {
          select: {
            id: true,
            title: true,
            createdBy: { select: { name: true, company: true } },
          },
        },
        poc: { select: { id: true, status: true } },
      },
    }),
  ]);

  const countFor = (s: ApplicationStatus) =>
    statusGroups.find((g) => g.status === s)?._count ?? 0;
  const total = statusGroups.reduce((sum, g) => sum + g._count, 0);
  const totalPages = Math.max(1, Math.ceil(matching / PAGE_SIZE));

  const buildHref = (next: Partial<SearchParams>) => {
    const params = new URLSearchParams();
    const merged = { status: activeStatus, page: undefined, ...next };
    if (merged.status) params.set("status", merged.status);
    if (merged.page && merged.page !== "1") params.set("page", merged.page);
    const qs = params.toString();
    return qs ? `/challenge-applications?${qs}` : "/challenge-applications";
  };

  const heading = activeStatus
    ? `${APPLICATION_STATUS_LABELS[activeStatus]} (${matching})`
    : `Alle Bewerbungen (${matching})`;

  return (
    <>
      <HeroBanner
        kicker="Zusammenarbeit"
        title="Challenge-Bewerbungen"
        subtitle="Alle Startup-Bewerbungen über alle Challenges hinweg — neueste zuerst. Interne Sicht."
        actions={
          <LinkButton href="/challenges" variant="white">
            Challenges öffnen
          </LinkButton>
        }
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <BannerStat label="Bewerbungen" value={total} />
          <BannerStat label="Ausstehend" value={countFor("PENDING")} />
          <BannerStat label="Angenommen" value={countFor("ACCEPTED")} />
          <BannerStat label="Abgelehnt" value={countFor("REJECTED")} />
        </div>
      </HeroBanner>

      <SectionLabel number="01" label="Filter" title="Status" />
      <div className="flex flex-wrap items-center gap-2">
        <FilterChip href={buildHref({ status: undefined })} active={!activeStatus}>
          Alle ({total})
        </FilterChip>
        {APPLICATION_STATUSES.map((s) => (
          <FilterChip
            key={s}
            href={buildHref({ status: s })}
            active={activeStatus === s}
          >
            {APPLICATION_STATUS_LABELS[s]} ({countFor(s)})
          </FilterChip>
        ))}
      </div>

      <SectionLabel number="02" label="Eingang" title={heading} />
      {applications.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={
            total === 0
              ? "Noch keine Bewerbungen"
              : "Keine Bewerbungen in dieser Auswahl"
          }
          description={
            total === 0
              ? "Sobald sich Startups auf eine Challenge bewerben, laufen die Pitches hier zusammen."
              : "Setze den Status-Filter zurück, um alle eingereichten Bewerbungen zu sehen."
          }
          action={
            total === 0 ? (
              <LinkButton href="/challenges">Challenges öffnen</LinkButton>
            ) : (
              <LinkButton href={buildHref({ status: undefined })}>
                Filter zurücksetzen
              </LinkButton>
            )
          }
        />
      ) : (
        <>
          {/* Mobile: stacked cards */}
          <div className="space-y-3 md:hidden">
            {applications.map((a) => (
              <Card key={a.id} className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/startups/${a.startup.id}`}
                      className="font-semibold hover:text-lv-blue"
                    >
                      {a.startup.name}
                    </Link>
                    <p className="text-xs text-lv-secondary">
                      {a.startup.industry}
                    </p>
                  </div>
                  <ApplicationStatusBadge value={a.status} />
                </div>
                <dl className="grid gap-2 text-sm">
                  <div>
                    <dt className="text-xs text-lv-secondary">Challenge</dt>
                    <dd>
                      <Link
                        href={`/challenges/${a.challenge.id}`}
                        className="hover:text-lv-blue"
                      >
                        {a.challenge.title}
                      </Link>
                      <span className="block text-xs text-lv-secondary">
                        {a.challenge.createdBy.company ??
                          a.challenge.createdBy.name}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-lv-secondary">Pitch</dt>
                    <dd className="text-lv-secondary">
                      {truncate(a.pitch, 140)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-lv-secondary">Eingereicht</dt>
                    <dd className="text-lv-secondary">
                      {formatDate(a.createdAt)}
                    </dd>
                  </div>
                  {a.poc && (
                    <div>
                      <dt className="text-xs text-lv-secondary">PoC</dt>
                      <dd>
                        <Link href={`/pocs/${a.poc.id}`}>
                          <PoCStatusBadge value={a.poc.status} />
                        </Link>
                      </dd>
                    </div>
                  )}
                </dl>
              </Card>
            ))}
          </div>

          {/* Desktop: table */}
          <TableCard className="hidden md:block">
            <THead>
              <tr>
                <Th>Startup</Th>
                <Th>Challenge</Th>
                <Th>Pitch</Th>
                <Th>Eingereicht</Th>
                <Th>PoC</Th>
                <Th className="text-right">Status</Th>
              </tr>
            </THead>
            <tbody>
              {applications.map((a) => (
                <Tr key={a.id}>
                  <Td>
                    <Link
                      href={`/startups/${a.startup.id}`}
                      className="font-semibold hover:text-lv-blue"
                    >
                      {a.startup.name}
                    </Link>
                    <p className="text-xs text-lv-secondary">
                      {a.startup.industry}
                    </p>
                  </Td>
                  <Td>
                    <Link
                      href={`/challenges/${a.challenge.id}`}
                      className="hover:text-lv-blue"
                    >
                      {a.challenge.title}
                    </Link>
                    <p className="text-xs text-lv-secondary">
                      {a.challenge.createdBy.company ??
                        a.challenge.createdBy.name}
                    </p>
                  </Td>
                  <Td className="max-w-sm text-lv-secondary">
                    {truncate(a.pitch, 110)}
                  </Td>
                  <Td className="whitespace-nowrap text-lv-secondary">
                    {formatDate(a.createdAt)}
                  </Td>
                  <Td>
                    {a.poc ? (
                      <Link href={`/pocs/${a.poc.id}`}>
                        <PoCStatusBadge value={a.poc.status} />
                      </Link>
                    ) : (
                      <span className="text-lv-secondary">—</span>
                    )}
                  </Td>
                  <Td className="text-right">
                    <ApplicationStatusBadge value={a.status} />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </TableCard>

          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-lv-secondary">
                Seite {page} von {totalPages}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <LinkButton
                    href={buildHref({ page: String(page - 1) })}
                    variant="secondary"
                  >
                    Zurück
                  </LinkButton>
                )}
                {page < totalPages && (
                  <LinkButton
                    href={buildHref({ page: String(page + 1) })}
                    variant="secondary"
                  >
                    Weiter
                  </LinkButton>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
