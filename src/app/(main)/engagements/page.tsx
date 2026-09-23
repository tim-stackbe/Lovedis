import { Handshake, Plus } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import type { Prisma } from "@/generated/prisma/client";
import { EngagementStatusBadge } from "@/components/shared/badges";
import { LinkButton } from "@/components/ui/Button";
import { BannerStat } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { TableCard, Td, Th, THead, Tr } from "@/components/ui/Table";
import { requireRole } from "@/lib/auth-guards";
import { parseMilestones, pocProgress } from "@/lib/pocs";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Engagements" };

export default async function EngagementsPage() {
  const session = await requireRole(["ADMIN", "MEMBER", "BUSINESS_PARTNER"]);
  const isTeam =
    session.user.role === "ADMIN" || session.user.role === "MEMBER";

  const where: Prisma.EngagementWhereInput = isTeam
    ? {}
    : { partnerId: session.user.id };

  const engagements = await prisma.engagement.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      partner: { select: { name: true, company: true } },
      startup: { select: { name: true } },
    },
  });

  const active = engagements.filter((e) => e.status === "ACTIVE").length;
  const completed = engagements.filter((e) => e.status === "COMPLETED").length;

  return (
    <>
      <HeroBanner
        kicker="Zusammenarbeit"
        title="Engagements"
        subtitle="Acc-unabhängige Zusammenarbeit zwischen Partnern und Startups — mit KPIs, Meilensteinen und messbarem Fortschritt."
        actions={
          isTeam ? (
            <LinkButton href="/engagements/new" variant="white">
              <Plus className="h-4 w-4" />
              Neues Engagement
            </LinkButton>
          ) : undefined
        }
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:max-w-md">
          <BannerStat label="Gesamt" value={engagements.length} />
          <BannerStat label="Aktiv" value={active} />
          <BannerStat label="Abgeschlossen" value={completed} />
        </div>
      </HeroBanner>

      <SectionLabel number="01" label="Tracking" title="Alle Engagements" />

      {engagements.length === 0 ? (
        <EmptyState
          icon={Handshake}
          title="Noch keine Engagements"
          description={
            isTeam
              ? "Lege ein Engagement an, um eine Acc-unabhängige Zusammenarbeit zu tracken."
              : "Sobald eine Zusammenarbeit angelegt ist, erscheint sie hier."
          }
        />
      ) : (
        <TableCard>
          <THead>
            <tr>
              <Th>Engagement</Th>
              <Th>Startup</Th>
              {isTeam && <Th>Partner</Th>}
              <Th>Fortschritt</Th>
              <Th>Aktualisiert</Th>
              <Th className="text-right">Status</Th>
            </tr>
          </THead>
          <tbody>
            {engagements.map((e) => {
              const progress = pocProgress(parseMilestones(e.milestones));
              return (
                <Tr key={e.id}>
                  <Td>
                    <Link
                      href={`/engagements/${e.id}`}
                      className="font-semibold hover:text-lv-blue"
                    >
                      {e.title}
                    </Link>
                  </Td>
                  <Td className="text-lv-secondary">{e.startup.name}</Td>
                  {isTeam && (
                    <Td className="text-lv-secondary">
                      {e.partner.company ?? e.partner.name}
                    </Td>
                  )}
                  <Td>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-lv-surface">
                        <div
                          className="h-full rounded-full bg-lv-blue"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-xs tabular-nums text-lv-secondary">
                        {progress}%
                      </span>
                    </div>
                  </Td>
                  <Td className="text-lv-secondary">{formatDate(e.updatedAt)}</Td>
                  <Td className="text-right">
                    <EngagementStatusBadge value={e.status} />
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </TableCard>
      )}
    </>
  );
}
