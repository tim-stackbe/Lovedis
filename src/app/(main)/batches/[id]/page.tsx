import { ArrowLeft, LayoutGrid } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setBatchPartner, setBatchStartup } from "@/app/actions/matrix";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { requireScoutModule } from "@/lib/auth-guards";
import { BATCH_TYPE_LABELS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { AssignmentManager, type AssignItem } from "./AssignmentManager";
import { BatchMetaForm } from "./BatchMetaForm";

export const metadata: Metadata = { title: "Batch" };

export default async function BatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireScoutModule();
  const isAdmin = session.user.role === "ADMIN";
  const { id } = await params;

  const batch = await prisma.scoutingCampaign.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      type: true,
      description: true,
      batchStartups: {
        select: {
          startup: { select: { id: true, name: true, industry: true } },
        },
      },
      batchPartners: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: { partnerCompany: { select: { id: true, name: true } } },
      },
    },
  });
  if (!batch) notFound();

  const [allStartups, allPartners] = await Promise.all([
    prisma.startup.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, industry: true },
    }),
    prisma.partnerCompany.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const assignedStartupIds = new Set(
    batch.batchStartups.map((bs) => bs.startup.id)
  );
  const assignedPartnerIds = new Set(
    batch.batchPartners.map((bp) => bp.partnerCompany.id)
  );

  const assignedStartups: AssignItem[] = batch.batchStartups
    .map((bs) => ({ id: bs.startup.id, name: bs.startup.name, sub: bs.startup.industry }))
    .sort((a, b) => a.name.localeCompare(b.name, "de"));
  const availableStartups: AssignItem[] = allStartups
    .filter((s) => !assignedStartupIds.has(s.id))
    .map((s) => ({ id: s.id, name: s.name, sub: s.industry }));

  const assignedPartners: AssignItem[] = batch.batchPartners.map((bp) => ({
    id: bp.partnerCompany.id,
    name: bp.partnerCompany.name,
  }));
  const availablePartners: AssignItem[] = allPartners
    .filter((p) => !assignedPartnerIds.has(p.id))
    .map((p) => ({ id: p.id, name: p.name }));

  return (
    <>
      <HeroBanner
        kicker={BATCH_TYPE_LABELS[batch.type]}
        title={batch.name}
        subtitle={
          batch.description ??
          "Weise diesem Batch die Startups und Partner-Unternehmen zu, die seine Match-Matrix bilden."
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <LinkButton href="/batches" variant="white" size="sm">
              <ArrowLeft className="h-4 w-4" />
              Alle Batches
            </LinkButton>
            <LinkButton
              href={`/match-matrix?batch=${batch.id}`}
              variant="white"
              size="sm"
            >
              <LayoutGrid className="h-4 w-4" />
              Matrix öffnen
            </LinkButton>
          </div>
        }
      >
        <div className="flex gap-2">
          <Badge tone="mint">{assignedStartups.length} Startups</Badge>
          <Badge tone="blue">{assignedPartners.length} Partner</Badge>
        </div>
      </HeroBanner>

      {isAdmin && (
        <>
          <SectionLabel number="01" label="Batch" title="Eckdaten" />
          <BatchMetaForm
            batch={{
              id: batch.id,
              name: batch.name,
              type: batch.type,
              description: batch.description,
            }}
          />
        </>
      )}

      <SectionLabel
        number={isAdmin ? "02" : "01"}
        label="Zuordnung"
        title="Startups in diesem Batch"
      />
      <AssignmentManager
        batchId={batch.id}
        idField="startupId"
        action={setBatchStartup}
        assigned={assignedStartups}
        available={availableStartups}
        addLabel="Startup hinzufügen"
        emptyLabel="Noch keine Startups zugewiesen."
        canManage={isAdmin}
      />

      <SectionLabel
        number={isAdmin ? "03" : "02"}
        label="Zuordnung"
        title="Partner-Unternehmen in diesem Batch"
      />
      <AssignmentManager
        batchId={batch.id}
        idField="partnerCompanyId"
        action={setBatchPartner}
        assigned={assignedPartners}
        available={availablePartners}
        addLabel="Partner hinzufügen"
        emptyLabel="Noch keine Partner-Unternehmen zugewiesen."
        canManage={isAdmin}
      />
    </>
  );
}
