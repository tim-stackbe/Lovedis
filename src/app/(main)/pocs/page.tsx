import { FlaskConical } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import type { Prisma } from "@/generated/prisma/client";
import { PoCStatusBadge } from "@/components/shared/badges";
import {
  CreatePoCForm,
  type ApplicationOption,
  type TrackerOption,
} from "@/components/pocs/CreatePoCForm";
import { EmptyState } from "@/components/ui/EmptyState";
import { BannerStat } from "@/components/ui/Card";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { TableCard, Td, Th, THead, Tr } from "@/components/ui/Table";
import { requireRole } from "@/lib/auth-guards";
import { isTeamRole, ROLE_LABELS } from "@/lib/roles";
import { parseMilestones, pocProgress } from "@/lib/pocs";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "PoC-Tracking" };

export default async function PoCsPage() {
  const session = await requireRole([
    "ADMIN",
    "MEMBER",
    "BUSINESS_PARTNER",
    "INVESTOR",
  ]);

  // The internal team (ADMIN + MEMBER) sees every PoC; partners/investors only
  // see the ones they track or that stem from their own challenges.
  const where: Prisma.PoCPerformanceWhereInput = isTeamRole(session.user.role)
    ? {}
    : {
        OR: [
          { trackedById: session.user.id },
          { application: { challenge: { createdById: session.user.id } } },
        ],
      };

  const pocs = await prisma.poCPerformance.findMany({
    where,
    include: {
      application: {
        include: {
          startup: { select: { name: true } },
          challenge: { select: { title: true } },
        },
      },
      trackedBy: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const running = pocs.filter((p) => p.status === "RUNNING").length;
  const completed = pocs.filter((p) => p.status === "COMPLETED").length;

  // Creating a PoC is a DELIBERATE, ADMIN-only step (see `createPoC`). Only the
  // admin sees the create control and the eligible-application data behind it.
  const isAdmin = session.user.role === "ADMIN";
  const applicationOptions: ApplicationOption[] = [];
  const trackerOptions: TrackerOption[] = [];
  if (isAdmin) {
    const [eligibleApplications, trackerUsers] = await Promise.all([
      // Only ACCEPTED applications that do not yet have a PoC are eligible —
      // `applicationId` is @unique, so one PoC per application.
      prisma.challengeApplication.findMany({
        where: { status: "ACCEPTED", poc: null },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          startup: { select: { name: true } },
          challenge: { select: { title: true, createdById: true } },
        },
      }),
      prisma.user.findMany({
        where: {
          isActive: true,
          role: { in: ["BUSINESS_PARTNER", "INVESTOR"] },
        },
        orderBy: { name: "asc" },
        select: { id: true, name: true, company: true, role: true },
      }),
    ]);
    for (const a of eligibleApplications) {
      const label = `${a.startup.name} × ${a.challenge.title}`;
      applicationOptions.push({
        id: a.id,
        label,
        defaultTrackerId: a.challenge.createdById,
        defaultTitle: `PoC — ${label}`,
      });
    }
    for (const t of trackerUsers) {
      trackerOptions.push({
        id: t.id,
        label: `${t.name}${t.company ? ` · ${t.company}` : ""} (${ROLE_LABELS[t.role]})`,
      });
    }
  }

  return (
    <>
      <HeroBanner
        kicker="Zusammenarbeit"
        title="Proof-of-Concept-Tracking"
        subtitle="Jeder PoC aus einer angenommenen Challenge-Bewerbung — KPIs, Meilensteine, Fortschritt."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:max-w-md">
          <BannerStat label="Gesamt" value={pocs.length} />
          <BannerStat label="Laufend" value={running} />
          <BannerStat label="Abgeschlossen" value={completed} />
        </div>
      </HeroBanner>

      {isAdmin && (
        <>
          <SectionLabel number="01" label="Anlegen" title="Neuen PoC anlegen" />
          {applicationOptions.length === 0 ? (
            <EmptyState
              icon={FlaskConical}
              title="Keine offenen Bewerbungen"
              description="Sobald eine Challenge-Bewerbung angenommen wurde und noch keinen PoC hat, kannst du hier einen PoC anlegen."
            />
          ) : (
            <CreatePoCForm
              applications={applicationOptions}
              trackers={trackerOptions}
            />
          )}
        </>
      )}

      <SectionLabel
        number={isAdmin ? "02" : "01"}
        label="PoCs"
        title="Getrackte PoCs"
      />

      {pocs.length === 0 ? (
        <EmptyState
          icon={FlaskConical}
          title="Noch keine PoCs"
          description="Nimm eine Challenge-Bewerbung an, um hier den Proof-of-Concept zu starten."
        />
      ) : (
        <TableCard>
          <THead>
            <tr>
              <Th>PoC</Th>
              <Th>Startup</Th>
              <Th>Challenge</Th>
              <Th>Tracker</Th>
              <Th>Fortschritt</Th>
              <Th>Aktualisiert</Th>
              <Th className="text-right">Status</Th>
            </tr>
          </THead>
          <tbody>
            {pocs.map((p) => {
              const progress = pocProgress(parseMilestones(p.milestones));
              return (
                <Tr key={p.id}>
                  <Td>
                    <Link
                      href={`/pocs/${p.id}`}
                      className="font-semibold hover:text-lv-blue"
                    >
                      {p.title}
                    </Link>
                  </Td>
                  <Td className="text-lv-secondary">
                    {p.application.startup.name}
                  </Td>
                  <Td className="text-lv-secondary">
                    {p.application.challenge.title}
                  </Td>
                  <Td className="text-lv-secondary">{p.trackedBy.name}</Td>
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
                  <Td className="text-lv-secondary">{formatDate(p.updatedAt)}</Td>
                  <Td className="text-right">
                    <PoCStatusBadge value={p.status} />
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
