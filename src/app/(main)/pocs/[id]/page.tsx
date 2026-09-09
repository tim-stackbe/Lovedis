import { notFound } from "next/navigation";
import { PoCEditor } from "@/components/pocs/PoCEditor";
import { PoCStatusBadge } from "@/components/shared/badges";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { requireRole } from "@/lib/auth-guards";
import { parseKpis, parseMilestones } from "@/lib/pocs";
import { prisma } from "@/lib/prisma";

export default async function PoCDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireRole(["ADMIN", "BUSINESS_PARTNER", "INVESTOR"]);
  const { id } = await params;

  const poc = await prisma.poCPerformance.findUnique({
    where: { id },
    include: {
      application: {
        include: {
          startup: { select: { name: true } },
          challenge: { select: { title: true, createdById: true } },
        },
      },
    },
  });
  if (!poc) notFound();

  // Mirror the /pocs list scope: ADMIN sees every PoC, everyone else only the
  // PoCs they personally track or whose challenge they created. No role (incl.
  // INVESTOR) may read a PoC without one of those explicit relationships.
  const isManager =
    session.user.role === "ADMIN" ||
    poc.trackedById === session.user.id ||
    poc.application.challenge.createdById === session.user.id;
  if (!isManager) notFound();

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="lv-wordmark text-xs text-lv-blue">Proof of Concept</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">{poc.title}</h1>
          <p className="mt-1 text-sm text-lv-secondary">
            {poc.application.startup.name} × {poc.application.challenge.title}
          </p>
        </div>
        <PoCStatusBadge value={poc.status} />
      </div>

      <SectionLabel number="01" label="Tracken" title="KPIs & Meilensteine" />

      <PoCEditor
        pocId={poc.id}
        readOnly={!isManager}
        initial={{
          title: poc.title,
          status: poc.status,
          startDate: poc.startDate
            ? poc.startDate.toISOString().slice(0, 10)
            : "",
          endDate: poc.endDate ? poc.endDate.toISOString().slice(0, 10) : "",
          notes: poc.notes ?? "",
          kpis: parseKpis(poc.kpis),
          milestones: parseMilestones(poc.milestones),
        }}
      />
    </>
  );
}
