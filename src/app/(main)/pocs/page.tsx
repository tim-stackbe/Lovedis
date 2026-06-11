import { FlaskConical } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import type { Prisma } from "@/generated/prisma/client";
import { PoCStatusBadge } from "@/components/shared/badges";
import { EmptyState } from "@/components/ui/EmptyState";
import { BannerStat } from "@/components/ui/Card";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { TableCard, Td, Th, THead, Tr } from "@/components/ui/Table";
import { requireRole } from "@/lib/auth-guards";
import { parseMilestones, pocProgress } from "@/lib/pocs";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "PoC tracking" };

export default async function PoCsPage() {
  const session = await requireRole(["ADMIN", "BUSINESS_PARTNER", "INVESTOR"]);

  const where: Prisma.PoCPerformanceWhereInput =
    session.user.role === "ADMIN"
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

  return (
    <>
      <HeroBanner
        kicker="Collaboration"
        title="Proof-of-Concept tracking"
        subtitle="Every PoC spawned from an accepted challenge application — KPIs, milestones, progress."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:max-w-md">
          <BannerStat label="Total" value={pocs.length} />
          <BannerStat label="Running" value={running} />
          <BannerStat label="Completed" value={completed} />
        </div>
      </HeroBanner>

      <SectionLabel number="01" label="PoCs" title="Tracked PoCs" />

      {pocs.length === 0 ? (
        <EmptyState
          icon={FlaskConical}
          title="No PoCs yet"
          description="Accept a challenge application to spawn its Proof-of-Concept here."
        />
      ) : (
        <TableCard>
          <THead>
            <tr>
              <Th>PoC</Th>
              <Th>Startup</Th>
              <Th>Challenge</Th>
              <Th>Tracker</Th>
              <Th>Progress</Th>
              <Th>Updated</Th>
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
